import { useState, useMemo } from "react";

// ─── Table cell styles (must be declared before AmortTable / LoanAmortTable) ─
const th = { textAlign: "left", padding: "6px 8px", color: "rgba(148,163,184,0.5)", fontWeight: 600, fontSize: 11, textTransform: "uppercase" };
const td = { padding: "7px 8px", fontSize: 13 };

// ─── Shared helpers ──────────────────────────────────────────────────────────

const fmt$ = (n) =>
  "$" + Math.round(Math.abs(n)).toLocaleString("en-US");

const fmtD = (n) =>
  "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Shared UI primitives ────────────────────────────────────────────────────

const label = (text) => (
  <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(148,163,184,0.65)", marginBottom: 4, letterSpacing: "0.6px" }}>
    {text}
  </div>
);

const inputStyle = {
  width: "100%",
  background: "rgba(15,23,42,0.8)",
  border: "1px solid rgba(51,65,85,0.5)",
  borderRadius: 9,
  color: "#f1f5f9",
  padding: "9px 11px",
  fontSize: 14,
  fontWeight: 600,
  fontFamily: "'DM Sans',sans-serif",
  outline: "none",
  boxSizing: "border-box",
};

const selectStyle = {
  ...inputStyle,
  cursor: "pointer",
};

function Field({ label: lbl, hint, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label(lbl)}
      {hint && <div style={{ fontSize: 10, color: "rgba(148,163,184,0.45)", marginBottom: 4, marginTop: -2, lineHeight: 1.4 }}>{hint}</div>}
      {children}
    </div>
  );
}

function Input({ label: lbl, value, onChange, prefix, suffix, type = "number", min, step = "any", ...rest }) {
  return (
    <Field label={lbl}>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {prefix && (
          <span style={{ position: "absolute", left: 10, color: "rgba(148,163,184,0.6)", fontSize: 13, fontWeight: 700 }}>
            {prefix}
          </span>
        )}
        <input
          type={type}
          value={value}
          min={min}
          step={step}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...inputStyle, paddingLeft: prefix ? 22 : 11, paddingRight: suffix ? 36 : 11 }}
          {...rest}
        />
        {suffix && (
          <span style={{ position: "absolute", right: 10, color: "rgba(148,163,184,0.6)", fontSize: 13, fontWeight: 700 }}>
            {suffix}
          </span>
        )}
      </div>
    </Field>
  );
}

function ResultCard({ label: lbl, value, accent, sub }) {
  return (
    <div style={{
      background: `rgba(${accent || "99,102,241"},0.09)`,
      border: `1px solid rgba(${accent || "99,102,241"},0.25)`,
      borderRadius: 12,
      padding: "12px 14px",
      flex: "1 1 140px",
      minWidth: 140,
    }}>
      <div style={{ fontSize: 11, color: "rgba(148,163,184,0.6)", marginBottom: 4, fontWeight: 600 }}>{lbl}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", fontFamily: "'DM Sans',sans-serif" }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "rgba(148,163,184,0.45)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function SectionHeader({ title, icon }) {
  return (
    <div style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
      <span>{icon}</span>{title}
    </div>
  );
}

function Grid({ children, cols = 2 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10 }}>
      {children}
    </div>
  );
}

function ResultRow({ results }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 20 }}>
      {results.map((r, i) => <ResultCard key={i} {...r} />)}
    </div>
  );
}

function CalcSection({ children }) {
  return (
    <div style={{ background: "rgba(15,23,42,0.5)", border: "1px solid rgba(51,65,85,0.35)", borderRadius: 14, padding: "20px 18px", marginBottom: 16 }}>
      {children}
    </div>
  );
}

// ─── Investment Calculator ────────────────────────────────────────────────────

function InvestmentCalc() {
  const [start, setStart] = useState("20000");
  const [years, setYears] = useState("10");
  const [rate, setRate] = useState("7");
  const [compound, setCompound] = useState("12");
  const [monthly, setMonthly] = useState("500");

  const result = useMemo(() => {
    const P = parseFloat(start) || 0;
    const Y = parseFloat(years) || 1;
    const r = (parseFloat(rate) || 0) / 100;
    const n = parseFloat(compound) || 12;
    const pmt = parseFloat(monthly) || 0;

    if (r === 0) {
      const total = P + pmt * 12 * Y;
      return { end: total, contributions: pmt * 12 * Y, interest: 0, start: P };
    }

    const rn = r / n;
    const periods = n * Y;
    // FV of lump sum
    const fvLump = P * Math.pow(1 + rn, periods);
    // FV of annuity (monthly payments, compounded n times/yr)
    const pmtPerPeriod = pmt * (12 / n); // convert monthly to per compound period
    const fvAnnuity = pmtPerPeriod * (Math.pow(1 + rn, periods) - 1) / rn;
    const end = fvLump + fvAnnuity;
    const totalContrib = pmt * 12 * Y;
    const interest = end - P - totalContrib;
    return { end, contributions: totalContrib, interest, start: P };
  }, [start, years, rate, compound, monthly]);

  const compoundOptions = [
    { value: "1", label: "Annually" },
    { value: "2", label: "Semiannually" },
    { value: "4", label: "Quarterly" },
    { value: "12", label: "Monthly" },
    { value: "365", label: "Daily" },
  ];

  return (
    <div>
      <SectionHeader icon="📈" title="Investment Calculator" />
      <CalcSection>
        <Grid>
          <Input label="Starting Amount" value={start} onChange={setStart} prefix="$" min="0" />
          <Input label="Monthly Contribution" value={monthly} onChange={setMonthly} prefix="$" min="0" />
          <Input label="Annual Return Rate" value={rate} onChange={setRate} suffix="%" min="0" max="50" />
          <Input label="Investment Length (years)" value={years} onChange={setYears} min="1" max="50" />
        </Grid>
        <Field label="Compounding Frequency" hint="How often interest is calculated. More frequent = slightly higher returns.">
          <select value={compound} onChange={(e) => setCompound(e.target.value)} style={selectStyle}>
            {compoundOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
      </CalcSection>
      <ResultRow results={[
        { label: "End Balance", value: fmt$(result.end), accent: "99,102,241", sub: `After ${years} years` },
        { label: "Starting Amount", value: fmt$(result.start), accent: "148,163,184" },
        { label: "Total Contributions", value: fmt$(result.contributions), accent: "74,222,128" },
        { label: "Total Interest Earned", value: fmt$(result.interest), accent: "251,191,36", sub: `${result.end > 0 && isFinite(result.interest) ? Math.round(result.interest / result.end * 100) : 0}% of total` },
      ]} />
      <AmortTable start={parseFloat(start) || 0} years={parseFloat(years) || 10} rate={parseFloat(rate) || 0} monthly={parseFloat(monthly) || 0} compound={parseFloat(compound) || 12} />
    </div>
  );
}

function AmortTable({ start, years, rate, monthly, compound }) {
  const [show, setShow] = useState(false);
  const rows = useMemo(() => {
    if (!show) return [];
    const r = rate / 100 / compound;
    const result = [];
    let bal = start;
    for (let yr = 1; yr <= Math.min(years, 40); yr++) {
      const periods = compound;
      let interest = 0;
      for (let p = 0; p < periods; p++) {
        const int = bal * r;
        interest += int;
        bal = bal + int + monthly * (12 / compound);
      }
      result.push({ yr, balance: bal, interest });
    }
    return result;
  }, [show, start, years, rate, monthly, compound]);

  return (
    <div style={{ marginTop: 16 }}>
      <button onClick={() => setShow(!show)} style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 8, color: "#818cf8", padding: "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>
        {show ? "▲ Hide" : "▼ Show"} year-by-year breakdown
      </button>
      {show && rows.length > 0 && (
        <div style={{ marginTop: 12, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, color: "rgba(148,163,184,0.8)" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(51,65,85,0.5)" }}>
                <th style={th}>Year</th>
                <th style={th}>Balance</th>
                <th style={th}>Interest Earned (yr)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.yr} style={{ borderBottom: "1px solid rgba(51,65,85,0.2)" }}>
                  <td style={td}>{r.yr}</td>
                  <td style={{ ...td, color: "#f1f5f9", fontWeight: 700 }}>{fmt$(r.balance)}</td>
                  <td style={{ ...td, color: "#34c98a" }}>{fmt$(r.interest)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Auto Loan Calculator ─────────────────────────────────────────────────────

function AutoLoanCalc() {
  const [price, setPrice] = useState("35000");
  const [down, setDown] = useState("5000");
  const [tradeIn, setTradeIn] = useState("0");
  const [owed, setOwed] = useState("0");
  const [incentives, setIncentives] = useState("0");
  const [rate, setRate] = useState("7.5");
  const [term, setTerm] = useState("60");
  const [salesTax, setSalesTax] = useState("0");
  const [fees, setFees] = useState("0");

  const result = useMemo(() => {
    const carPrice = parseFloat(price) || 0;
    const downPmt = parseFloat(down) || 0;
    const trade = parseFloat(tradeIn) || 0;
    const owedOnTrade = parseFloat(owed) || 0;
    const cashBack = parseFloat(incentives) || 0;
    const r = (parseFloat(rate) || 0) / 100 / 12;
    const n = parseInt(term) || 60;
    const tax = (parseFloat(salesTax) || 0) / 100;
    const feesAmt = parseFloat(fees) || 0;

    const taxAmount = carPrice * tax;
    const loanAmount = carPrice - downPmt - trade + owedOnTrade - cashBack + taxAmount + feesAmt;
    const principal = Math.max(0, loanAmount);

    let monthly;
    if (r === 0) {
      monthly = principal / n;
    } else {
      monthly = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    }

    const totalPayments = monthly * n;
    const totalInterest = totalPayments - principal;
    const totalCost = totalPayments + downPmt + trade - owedOnTrade + cashBack;

    return { monthly, principal, totalPayments, totalInterest, totalCost, taxAmount, upfront: downPmt + feesAmt + taxAmount };
  }, [price, down, tradeIn, owed, incentives, rate, term, salesTax, fees]);

  return (
    <div>
      <SectionHeader icon="🚗" title="Auto Loan Calculator" />
      <CalcSection>
        <Grid>
          <Input label="Auto Price" value={price} onChange={setPrice} prefix="$" min="0" />
          <Input label="Down Payment" value={down} onChange={setDown} prefix="$" min="0" />
          <Input label="Trade-In Value" value={tradeIn} onChange={setTradeIn} prefix="$" min="0" />
          <Input label="Amount Owed on Trade-In" value={owed} onChange={setOwed} prefix="$" min="0" />
          <Input label="Cash Incentives / Rebates" value={incentives} onChange={setIncentives} prefix="$" min="0" />
          <Input label="Interest Rate" value={rate} onChange={setRate} suffix="%" min="0" max="30" />
          <Field label="Loan Term">
            <select value={term} onChange={(e) => setTerm(e.target.value)} style={selectStyle}>
              {[24, 36, 48, 60, 72, 84].map((m) => (
                <option key={m} value={m}>{m} months ({(m / 12).toFixed(1)} yrs)</option>
              ))}
            </select>
          </Field>
          <Input label="Sales Tax" value={salesTax} onChange={setSalesTax} suffix="%" min="0" max="20" />
        </Grid>
        <Input label="Title, Registration & Other Fees" value={fees} onChange={setFees} prefix="$" min="0" />
      </CalcSection>
      <ResultRow results={[
        { label: "Monthly Payment", value: fmtD(result.monthly), accent: "251,191,36", sub: `× ${term} months` },
        { label: "Total Loan Amount", value: fmt$(result.principal), accent: "99,102,241" },
        { label: "Total Interest", value: fmt$(result.totalInterest), accent: "248,113,113" },
        { label: "Total Cost", value: fmt$(result.totalCost), accent: "148,163,184", sub: "Price + interest + fees" },
      ]} />
      <LoanAmortTable principal={result.principal} rate={parseFloat(rate) || 0} termMonths={parseInt(term) || 60} />
    </div>
  );
}

// ─── Mortgage Calculator ──────────────────────────────────────────────────────

function MortgageCalc() {
  const [price, setPrice] = useState("400000");
  const [down, setDown] = useState("80000");
  const [rate, setRate] = useState("6.62");
  const [term, setTerm] = useState("30");
  const [taxes, setTaxes] = useState("400");
  const [insurance, setInsurance] = useState("125");
  const [pmi, setPmi] = useState("");
  const [hoa, setHoa] = useState("");

  const result = useMemo(() => {
    const P = Math.max(0, (parseFloat(price) || 0) - (parseFloat(down) || 0));
    const r = (parseFloat(rate) || 0) / 100 / 12;
    const n = (parseInt(term) || 30) * 12;
    const monthlyTax = parseFloat(taxes) || 0;
    const monthlyIns = parseFloat(insurance) || 0;
    const monthlyPMI = parseFloat(pmi) || 0;
    const monthlyHOA = parseFloat(hoa) || 0;
    const downPct = (parseFloat(down) || 0) / (parseFloat(price) || 1);

    let mortgage;
    if (r === 0) {
      mortgage = P / n;
    } else {
      mortgage = P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    }

    const totalMortgage = mortgage * n;
    const totalInterest = totalMortgage - P;
    const totalMonthly = mortgage + monthlyTax + monthlyIns + (downPct < 0.2 ? monthlyPMI : 0) + monthlyHOA;

    return { mortgage, totalMortgage, totalInterest, totalMonthly, principal: P, needsPMI: downPct < 0.2 };
  }, [price, down, rate, term, taxes, insurance, pmi, hoa]);

  return (
    <div>
      <SectionHeader icon="🏠" title="Mortgage Calculator" />
      <CalcSection>
        <Grid>
          <Input label="Home Price" value={price} onChange={setPrice} prefix="$" min="0" />
          <Input label="Down Payment" value={down} onChange={setDown} prefix="$" min="0" />
          <Input label="Interest Rate" value={rate} onChange={setRate} suffix="%" min="0" max="20" />
          <Field label="Loan Term">
            <select value={term} onChange={(e) => setTerm(e.target.value)} style={selectStyle}>
              {[10, 15, 20, 25, 30].map((y) => (
                <option key={y} value={y}>{y} years</option>
              ))}
            </select>
          </Field>
        </Grid>
        <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(148,163,184,0.5)", marginBottom: 10, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.6px" }}>Monthly Costs</div>
        <Grid>
          <Input label="Property Taxes ($/mo)" value={taxes} onChange={setTaxes} prefix="$" min="0" />
          <Input label="Home Insurance ($/mo)" value={insurance} onChange={setInsurance} prefix="$" min="0" />
          <Input label={`PMI ($/mo)${result.needsPMI ? " ⚠️ required" : ""}`} value={pmi} onChange={setPmi} prefix="$" min="0" />
          <Input label="HOA Fee ($/mo)" value={hoa} onChange={setHoa} prefix="$" min="0" />
        </Grid>
      </CalcSection>
      <ResultRow results={[
        { label: "Monthly Payment", value: fmtD(result.mortgage), accent: "251,191,36", sub: "Principal + interest" },
        { label: "Total Monthly Cost", value: fmtD(result.totalMonthly), accent: "99,102,241", sub: "All costs combined" },
        { label: "Total Interest", value: fmt$(result.totalInterest), accent: "248,113,113" },
        { label: "Total Mortgage", value: fmt$(result.totalMortgage), accent: "148,163,184" },
      ]} />
      {result.needsPMI && !pmi && (
        <div style={{ marginTop: 12, background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 10, padding: "10px 12px", fontSize: 12, color: "#fbbf24" }}>
          {"\u26A0\uFE0F"} Down payment is under 20% — PMI (Private Mortgage Insurance) is typically required. This is an extra monthly fee that protects the lender. Enter your PMI amount above.
        </div>
      )}
      <LoanAmortTable principal={result.principal} rate={parseFloat(rate) || 0} termMonths={(parseInt(term) || 30) * 12} />
    </div>
  );
}

// ─── Retirement Calculator ────────────────────────────────────────────────────

function RetirementCalc() {
  const [currentAge, setCurrentAge] = useState("25");
  const [retireAge, setRetireAge] = useState("65");
  const [lifeExp, setLifeExp] = useState("85");
  const [income, setIncome] = useState("60000");
  const [incomeNeeded, setIncomeNeeded] = useState("80");
  const [currentSavings, setCurrentSavings] = useState("10000");
  const [contribution, setContribution] = useState("10");
  const [returnRate, setReturnRate] = useState("7");
  const [inflation, setInflation] = useState("3");
  const [otherIncome, setOtherIncome] = useState("0");

  const result = useMemo(() => {
    const yearsToRetire = Math.max(1, (parseFloat(retireAge) || 65) - (parseFloat(currentAge) || 25));
    const yearsInRetirement = Math.max(1, (parseFloat(lifeExp) || 85) - (parseFloat(retireAge) || 65));
    const annualIncome = parseFloat(income) || 0;
    const needPct = (parseFloat(incomeNeeded) || 80) / 100;
    const r = (parseFloat(returnRate) || 0) / 100;
    const inf = (parseFloat(inflation) || 0) / 100;
    const monthlyContrib = annualIncome * ((parseFloat(contribution) || 0) / 100) / 12;
    const savings = parseFloat(currentSavings) || 0;
    const otherMo = parseFloat(otherIncome) || 0;
    // Bug fix 6: realReturn removed — was computed but never used

    // Annual income needed at retirement (inflation-adjusted)
    const incomeAtRetire = annualIncome * needPct * Math.pow(1 + inf, yearsToRetire);
    const monthlyAtRetire = incomeAtRetire / 12;
    const monthlyShortfall = Math.max(0, monthlyAtRetire - otherMo);

    // Nest egg needed using 4% rule (inflation-adjusted)
    const nestEgg = monthlyShortfall * 12 / 0.04;

    // Future value of current savings + contributions
    const rm = r / 12;
    const periods = yearsToRetire * 12;
    const fvSavings = savings * Math.pow(1 + rm, periods);
    const fvContrib = rm > 0 ? monthlyContrib * (Math.pow(1 + rm, periods) - 1) / rm : monthlyContrib * periods;
    const projected = fvSavings + fvContrib;

    const gap = nestEgg - projected;
    const additionalMonthly = gap > 0 && periods > 0 && rm > 0
      ? gap * rm / (Math.pow(1 + rm, periods) - 1)
      : 0;

    // Monthly withdrawal in retirement
    const withdrawalMonths = yearsInRetirement * 12;
    const rRetire = r / 12;
    const monthlyWithdrawal = projected > 0 && rRetire > 0
      ? projected * rRetire / (1 - Math.pow(1 + rRetire, -withdrawalMonths))
      : projected / withdrawalMonths;

    const readiness = Math.min(100, Math.round(projected / Math.max(1, nestEgg) * 100));

    return {
      nestEgg, projected, gap, additionalMonthly, monthlyWithdrawal,
      readiness, incomeAtRetire, monthlyAtRetire, yearsToRetire, yearsInRetirement
    };
  }, [currentAge, retireAge, lifeExp, income, incomeNeeded, currentSavings, contribution, returnRate, inflation, otherIncome]);

  const readinessColor = result.readiness >= 80 ? "52,201,138" : result.readiness >= 50 ? "251,191,36" : "248,113,113";

  return (
    <div>
      <SectionHeader icon="🏖️" title="Retirement Calculator" />
      <CalcSection>
        <Grid>
          <Input label="Current Age" value={currentAge} onChange={setCurrentAge} min="18" max="80" type="number" />
          <Input label="Planned Retirement Age" value={retireAge} onChange={setRetireAge} min="40" max="90" type="number" />
          <Input label="Life Expectancy" value={lifeExp} onChange={setLifeExp} min="50" max="110" type="number" />
          <Input label="Current Annual Income" value={income} onChange={setIncome} prefix="$" min="0" />
          <Input label="Income Needed in Retirement" value={incomeNeeded} onChange={setIncomeNeeded} suffix="%" min="0" max="200" />
          <Input label="Current Retirement Savings" value={currentSavings} onChange={setCurrentSavings} prefix="$" min="0" />
          <Input label="Annual Contribution (% of income)" value={contribution} onChange={setContribution} suffix="%" min="0" max="100" />
          <Input label="Expected Annual Return" value={returnRate} onChange={setReturnRate} suffix="%" min="0" max="30" />
          <Input label="Inflation Rate" value={inflation} onChange={setInflation} suffix="%" min="0" max="20" />
          <Input label="Other Monthly Income (Social Security, etc.)" value={otherIncome} onChange={setOtherIncome} prefix="$" min="0" />
        </Grid>
      </CalcSection>

      {/* Readiness bar */}
      <div style={{ background: "rgba(15,23,42,0.5)", border: "1px solid rgba(51,65,85,0.35)", borderRadius: 14, padding: "16px 18px", marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(148,163,184,0.7)" }}>Retirement Readiness</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: `rgb(${readinessColor})` }}>{result.readiness}%</span>
        </div>
        <div style={{ background: "rgba(51,65,85,0.4)", borderRadius: 99, height: 8, overflow: "hidden" }}>
          <div style={{ width: `${result.readiness}%`, height: "100%", background: `rgb(${readinessColor})`, borderRadius: 99, transition: "width 0.5s ease" }} />
        </div>
        <div style={{ fontSize: 11, color: "rgba(148,163,184,0.5)", marginTop: 6 }}>
          Projected {fmt$(result.projected)} vs. {fmt$(result.nestEgg)} needed
        </div>
      </div>

      <ResultRow results={[
        { label: "Nest Egg Needed", value: fmt$(result.nestEgg), accent: "99,102,241", sub: "4% withdrawal rule" },
        { label: "Projected Savings", value: fmt$(result.projected), accent: readinessColor, sub: `After ${result.yearsToRetire} years` },
        { label: "Monthly Withdrawal", value: fmtD(result.monthlyWithdrawal), accent: "74,222,128", sub: `For ${result.yearsInRetirement} years` },
        { label: result.gap > 0 ? "Monthly Gap Needed" : "You're on Track!", value: result.gap > 0 ? `+${fmtD(result.additionalMonthly)}/mo` : "✅ Funded", accent: result.gap > 0 ? "248,113,113" : "52,201,138", sub: result.gap > 0 ? "Additional contribution" : "Keep saving!" },
      ]} />
    </div>
  );
}

// ─── FHA Loan Calculator ──────────────────────────────────────────────────────

function FHACalc() {
  const [price, setPrice] = useState("300000");
  const [down, setDown] = useState("10500"); // 3.5% min
  const [rate, setRate] = useState("7.0");
  const [term, setTerm] = useState("30");
  const [upfrontMIP, setUpfrontMIP] = useState("1.75");
  const [annualMIP, setAnnualMIP] = useState("0.55");
  const [taxes, setTaxes] = useState("300");
  const [insurance, setInsurance] = useState("100");
  const [hoa, setHoa] = useState("0");

  const result = useMemo(() => {
    const homePrice = parseFloat(price) || 0;
    const downPmt = parseFloat(down) || 0;
    const r = (parseFloat(rate) || 0) / 100 / 12;
    const n = (parseInt(term) || 30) * 12;
    const upMIPpct = (parseFloat(upfrontMIP) || 1.75) / 100;
    const annMIPpct = (parseFloat(annualMIP) || 0.55) / 100;
    const monthlyTax = parseFloat(taxes) || 0;
    const monthlyIns = parseFloat(insurance) || 0;
    const monthlyHOA = parseFloat(hoa) || 0;

    const baseLoan = Math.max(0, homePrice - downPmt);
    const upfrontMIPAmt = baseLoan * upMIPpct;
    const totalLoan = baseLoan + upfrontMIPAmt; // upfront MIP rolled into loan

    let mortgage;
    if (r === 0) {
      mortgage = totalLoan / n;
    } else {
      mortgage = totalLoan * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    }

    const monthlyMIP = (baseLoan * annMIPpct) / 12;
    const totalMonthly = mortgage + monthlyMIP + monthlyTax + monthlyIns + monthlyHOA;
    const totalMortgage = mortgage * n;
    const totalInterest = totalMortgage - totalLoan;
    const downPct = homePrice > 0 ? (downPmt / homePrice * 100) : 0;

    return { mortgage, totalMonthly, totalMortgage, totalInterest, monthlyMIP, upfrontMIPAmt, totalLoan, baseLoan, downPct };
  }, [price, down, rate, term, upfrontMIP, annualMIP, taxes, insurance, hoa]);

  const minDown = Math.round((parseFloat(price) || 0) * 0.035);

  return (
    <div>
      <SectionHeader icon="🏡" title="FHA Loan Calculator" />
      <div style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "rgba(148,163,184,0.7)", lineHeight: 1.6 }}>
        <strong style={{ color: "#818cf8" }}>FHA loans</strong> are government-backed mortgages for first-time and low-credit buyers. Minimum 3.5% down. Requires Mortgage Insurance Premium (MIP) — both upfront and annual.
      </div>
      <CalcSection>
        <Grid>
          <Input label="Home Price" value={price} onChange={setPrice} prefix="$" min="0" />
          <div>
            <Input label={`Down Payment (min ${fmt$(minDown)} = 3.5%)`} value={down} onChange={setDown} prefix="$" min={minDown} />
            {parseFloat(down) < minDown - 1 && (
              <div style={{ fontSize: 10, color: "#f87171", marginTop: -8, marginBottom: 8 }}>⚠️ FHA minimum is 3.5% down ({fmt$(minDown)})</div>
            )}
          </div>
          <Input label="Interest Rate" value={rate} onChange={setRate} suffix="%" min="0" max="20" />
          <Field label="Loan Term">
            <select value={term} onChange={(e) => setTerm(e.target.value)} style={selectStyle}>
              {[15, 20, 25, 30].map((y) => (
                <option key={y} value={y}>{y} years</option>
              ))}
            </select>
          </Field>
        </Grid>
        <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(148,163,184,0.5)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.6px" }}>FHA Insurance (MIP)</div>
        <Grid>
          <Input label="Upfront MIP %" value={upfrontMIP} onChange={setUpfrontMIP} suffix="%" min="0" />
          <Input label="Annual MIP %" value={annualMIP} onChange={setAnnualMIP} suffix="%" min="0" />
        </Grid>
        <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(148,163,184,0.5)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.6px" }}>Monthly Costs</div>
        <Grid>
          <Input label="Property Taxes ($/mo)" value={taxes} onChange={setTaxes} prefix="$" min="0" />
          <Input label="Home Insurance ($/mo)" value={insurance} onChange={setInsurance} prefix="$" min="0" />
          <Input label="HOA Fee ($/mo)" value={hoa} onChange={setHoa} prefix="$" min="0" />
        </Grid>
      </CalcSection>
      <ResultRow results={[
        { label: "Monthly Payment", value: fmtD(result.mortgage), accent: "251,191,36", sub: "Principal + interest" },
        { label: "Total Monthly", value: fmtD(result.totalMonthly), accent: "99,102,241", sub: "Including MIP + costs" },
        { label: "Upfront MIP", value: fmt$(result.upfrontMIPAmt), accent: "248,113,113", sub: "Rolled into loan" },
        { label: "Monthly MIP", value: fmtD(result.monthlyMIP), accent: "251,191,36", sub: "Annual MIP / 12" },
      ]} />
      <div style={{ marginTop: 10 }}>
        <ResultRow results={[
          { label: "Total Loan with MIP", value: fmt$(result.totalLoan), accent: "148,163,184" },
          { label: "Total Interest", value: fmt$(result.totalInterest), accent: "248,113,113" },
          { label: "Down Payment %", value: `${result.downPct.toFixed(1)}%`, accent: result.downPct >= 10 ? "52,201,138" : "251,191,36", sub: result.downPct >= 10 ? "MIP drops at 11 yrs" : "MIP for loan life" },
        ]} />
      </div>
      <LoanAmortTable principal={result.totalLoan} rate={parseFloat(rate) || 0} termMonths={(parseInt(term) || 30) * 12} />
    </div>
  );
}

// ─── Shared amortization table ────────────────────────────────────────────────

function LoanAmortTable({ principal, rate, termMonths }) {
  const [show, setShow] = useState(false);
  const rows = useMemo(() => {
    if (!show) return [];
    const r = rate / 100 / 12;
    let bal = principal;
    const result = [];
    let totalInterest = 0;
    // Bug fix 5: guard against termMonths = 0 to prevent Infinity/NaN
    const safeMonths = Math.max(1, termMonths);
    const monthly = r > 0
      ? principal * (r * Math.pow(1 + r, safeMonths)) / (Math.pow(1 + r, safeMonths) - 1)
      : principal / safeMonths;

    for (let mo = 1; mo <= safeMonths; mo++) {
      const interest = bal * r;
      const princPmt = monthly - interest;
      totalInterest += interest;
      bal = Math.max(0, bal - princPmt);
      if (mo % 12 === 0 || mo === safeMonths) {
        result.push({ mo, balance: bal, interest: totalInterest, monthly });
        totalInterest = 0;
      }
    }
    return result;
  }, [show, principal, rate, termMonths]);

  return (
    <div style={{ marginTop: 16 }}>
      <button onClick={() => setShow(!show)} style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 8, color: "#818cf8", padding: "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>
        {show ? "▲ Hide" : "▼ Show"} amortization schedule
      </button>
      {show && rows.length > 0 && (
        <div style={{ marginTop: 12, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, color: "rgba(148,163,184,0.8)" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(51,65,85,0.5)" }}>
                <th style={th}>Year</th>
                <th style={th}>Balance</th>
                <th style={th}>Interest (yr)</th>
                <th style={th}>Monthly Pmt</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(51,65,85,0.2)" }}>
                  <td style={td}>{Math.ceil(r.mo / 12)}</td>
                  <td style={{ ...td, color: "#f1f5f9", fontWeight: 700 }}>{fmt$(r.balance)}</td>
                  <td style={{ ...td, color: "#f87171" }}>{fmt$(r.interest)}</td>
                  <td style={td}>{fmtD(r.monthly)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Salary & Compensation Calculator ────────────────────────────────────────

function SalaryCalc() {
  const [hourlyRate, setHourlyRate] = useState("25");
  const [hoursPerWeek, setHoursPerWeek] = useState("40");
  const [weeksPerYear, setWeeksPerYear] = useState("52");
  const [overtimeHours, setOvertimeHours] = useState("0");
  const [bonus, setBonus] = useState("0");
  const [otherComp, setOtherComp] = useState("0");
  const [stateTaxPreset, setStateTaxPreset] = useState("0");
  const [customStateTax, setCustomStateTax] = useState("0");
  const [contribution401k, setContribution401k] = useState("6");
  const [healthInsurance, setHealthInsurance] = useState("200");

  const stateTaxRate = stateTaxPreset === "custom"
    ? (parseFloat(customStateTax) || 0)
    : parseFloat(stateTaxPreset) || 0;

  const result = useMemo(() => {
    const rate = parseFloat(hourlyRate) || 0;
    const hours = parseFloat(hoursPerWeek) || 0;
    const weeks = parseFloat(weeksPerYear) || 0;
    const otHours = parseFloat(overtimeHours) || 0;
    const bonusAmt = parseFloat(bonus) || 0;
    const otherAmt = parseFloat(otherComp) || 0;
    const k401pct = Math.min(100, Math.max(0, parseFloat(contribution401k) || 0)) / 100;
    const healthMo = parseFloat(healthInsurance) || 0;

    // Gross components
    const regularPay = rate * hours * weeks;
    const overtimePay = rate * 1.5 * otHours * weeks;
    const totalGross = regularPay + overtimePay + bonusAmt + otherAmt;

    // Federal income tax — 2024 brackets (single filer)
    let federalTax = 0;
    const brackets = [
      [11600, 0.10],
      [47150, 0.12],
      [100525, 0.22],
      [191950, 0.24],
      [243725, 0.32],
      [609350, 0.35],
      [Infinity, 0.37],
    ];
    let remaining = totalGross;
    let prevFloor = 0;
    for (const [ceiling, bracketRate] of brackets) {
      if (remaining <= 0) break;
      const taxable = Math.min(remaining, ceiling - prevFloor);
      federalTax += taxable * bracketRate;
      remaining -= taxable;
      prevFloor = ceiling;
    }

    // State tax
    const stateTaxAmt = totalGross * (stateTaxRate / 100);

    // FICA — SS 6.2% capped at $168,600 wage base; Medicare 1.45% uncapped
    const SS_WAGE_BASE = 168600;
    const ssTax = Math.min(totalGross, SS_WAGE_BASE) * 0.062;
    const medicareTax = totalGross * 0.0145;
    const fica = ssTax + medicareTax;

    // Pre-tax deductions
    const k401deduction = totalGross * k401pct;
    const healthAnnual = healthMo * 12;

    // Totals
    const totalDeductions = federalTax + stateTaxAmt + fica + k401deduction + healthAnnual;
    const netAnnual = totalGross - totalDeductions;

    const effectiveTaxRate = totalGross > 0
      ? ((federalTax + stateTaxAmt + fica) / totalGross) * 100
      : 0;

    // Frequency breakdown
    const netMonthly = netAnnual / 12;
    const netBiweekly = netAnnual / 26;
    const netWeekly = netAnnual / 52;
    const netDaily = netAnnual / 260;
    const netHourly = hours > 0 && weeks > 0 ? netAnnual / (hours * weeks) : 0;

    const grossMonthly = totalGross / 12;
    const grossBiweekly = totalGross / 26;
    const grossWeekly = totalGross / 52;

    // 401k projection at 7% for 10 years
    const k401annual = k401deduction;
    const k401future = k401annual > 0
      ? k401annual * ((Math.pow(1.07, 10) - 1) / 0.07) * 1.07
      : 0;

    return {
      regularPay, overtimePay, totalGross, federalTax, stateTaxAmt, fica,
      k401deduction, healthAnnual, totalDeductions, netAnnual,
      effectiveTaxRate, netMonthly, netBiweekly, netWeekly, netDaily, netHourly,
      grossMonthly, grossBiweekly, grossWeekly, k401future, k401annual,
    };
  }, [hourlyRate, hoursPerWeek, weeksPerYear, overtimeHours, bonus, otherComp, stateTaxRate, contribution401k, healthInsurance]);

  const stateTaxOptions = [
    { value: "0",    label: "0% — TX / FL / NV (no income tax)" },
    { value: "3",    label: "3% — CO / UT" },
    { value: "5",    label: "5% — GA / NC" },
    { value: "6",    label: "6% — OH / VA" },
    { value: "9",    label: "9% — OR" },
    { value: "9.3",  label: "9.3% — CA (standard)" },
    { value: "13.3", label: "13.3% — CA (top bracket)" },
    { value: "custom", label: "Custom..." },
  ];

  const rowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "9px 0",
    borderBottom: "1px solid rgba(51,65,85,0.25)",
    fontSize: 13,
  };
  const rowLabelStyle = { color: "rgba(148,163,184,0.7)", fontWeight: 500 };

  return (
    <div>
      <SectionHeader icon="💼" title="Salary & Compensation Calculator" />

      <CalcSection>
        <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(148,163,184,0.5)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.6px" }}>Base Pay</div>
        <Grid>
          <Input label="Hourly Rate ($)" value={hourlyRate} onChange={setHourlyRate} prefix="$" min="0" />
          <Input label="Hours per Week" value={hoursPerWeek} onChange={setHoursPerWeek} min="1" max="168" />
          <Input label="Weeks per Year" value={weeksPerYear} onChange={setWeeksPerYear} min="1" max="52" />
          <Input label="Overtime Hours / Week" value={overtimeHours} onChange={setOvertimeHours} min="0" />
        </Grid>
        <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(148,163,184,0.5)", marginBottom: 10, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.6px" }}>Additional Compensation</div>
        <Grid>
          <Input label="Annual Bonus ($)" value={bonus} onChange={setBonus} prefix="$" min="0" />
          <Input label="Other Annual Comp ($)" value={otherComp} onChange={setOtherComp} prefix="$" min="0" />
        </Grid>
        <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(148,163,184,0.5)", marginBottom: 10, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.6px" }}>Taxes &amp; Deductions</div>
        <Field label="State Tax Rate">
          <select value={stateTaxPreset} onChange={(e) => setStateTaxPreset(e.target.value)} style={selectStyle}>
            {stateTaxOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>
        {stateTaxPreset === "custom" && (
          <Input label="Custom State Tax Rate (%)" value={customStateTax} onChange={setCustomStateTax} suffix="%" min="0" max="20" />
        )}
        <Grid>
          <Input label="401k Contribution (%)" value={contribution401k} onChange={setContribution401k} suffix="%" min="0" max="100" />
          <Input label="Health Insurance ($/mo)" value={healthInsurance} onChange={setHealthInsurance} prefix="$" min="0" />
        </Grid>
      </CalcSection>

      {/* Pay Breakdown Card */}
      <div style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(51,65,85,0.4)", borderRadius: 14, padding: "18px 18px", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(148,163,184,0.6)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.7px" }}>Pay Breakdown — Annual</div>

        <div style={rowStyle}>
          <span style={rowLabelStyle}>Regular Pay</span>
          <span style={{ color: "#f1f5f9", fontWeight: 600 }}>{fmt$(result.regularPay)}</span>
        </div>
        {result.overtimePay > 0 && (
          <div style={rowStyle}>
            <span style={rowLabelStyle}>Overtime Pay (1.5x)</span>
            <span style={{ color: "#f1f5f9", fontWeight: 600 }}>{fmt$(result.overtimePay)}</span>
          </div>
        )}
        {parseFloat(bonus) > 0 && (
          <div style={rowStyle}>
            <span style={rowLabelStyle}>Annual Bonus</span>
            <span style={{ color: "#f1f5f9", fontWeight: 600 }}>{fmt$(parseFloat(bonus) || 0)}</span>
          </div>
        )}
        {parseFloat(otherComp) > 0 && (
          <div style={rowStyle}>
            <span style={rowLabelStyle}>Other Compensation</span>
            <span style={{ color: "#f1f5f9", fontWeight: 600 }}>{fmt$(parseFloat(otherComp) || 0)}</span>
          </div>
        )}
        <div style={{ ...rowStyle, fontWeight: 700, borderBottom: "2px solid rgba(52,201,138,0.3)" }}>
          <span style={{ color: "#34c98a", fontWeight: 700 }}>Total Gross Income</span>
          <span style={{ color: "#34c98a", fontSize: 16, fontWeight: 800 }}>{fmt$(result.totalGross)}</span>
        </div>

        <div style={{ marginTop: 8 }} />

        <div style={rowStyle}>
          <span style={rowLabelStyle}>
            Federal Income Tax
            <span style={{ marginLeft: 6, fontSize: 10, color: "rgba(248,113,113,0.7)" }}>
              ({result.totalGross > 0 ? ((result.federalTax / result.totalGross) * 100).toFixed(1) : "0.0"}% effective)
            </span>
          </span>
          <span style={{ color: "#f87171", fontWeight: 600 }}>-{fmt$(result.federalTax)}</span>
        </div>
        <div style={rowStyle}>
          <span style={rowLabelStyle}>State Income Tax ({stateTaxRate}%)</span>
          <span style={{ color: "#f87171", fontWeight: 600 }}>-{fmt$(result.stateTaxAmt)}</span>
        </div>
        <div style={rowStyle}>
          <span style={rowLabelStyle}>FICA (Social Security + Medicare)</span>
          <span style={{ color: "#f87171", fontWeight: 600 }}>-{fmt$(result.fica)}</span>
        </div>
        <div style={rowStyle}>
          <span style={rowLabelStyle}>
            401k Contribution
            <span style={{ marginLeft: 6, fontSize: 10, color: "rgba(129,140,248,0.7)" }}>you keep this, pre-tax</span>
          </span>
          <span style={{ color: "#818cf8", fontWeight: 600 }}>-{fmt$(result.k401deduction)}</span>
        </div>
        <div style={{ ...rowStyle, borderBottom: "2px solid rgba(51,65,85,0.4)" }}>
          <span style={rowLabelStyle}>Health Insurance</span>
          <span style={{ color: "rgba(148,163,184,0.8)", fontWeight: 600 }}>-{fmt$(result.healthAnnual)}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(148,163,184,0.8)" }}>Net Take-Home</span>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#34c98a", fontFamily: "'DM Sans',sans-serif" }}>{fmt$(result.netAnnual)}</div>
            <div style={{ fontSize: 11, color: "rgba(148,163,184,0.45)", marginTop: 1 }}>per year</div>
          </div>
        </div>
      </div>

      {/* Effective Tax Rate Badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{
          background: "rgba(248,113,113,0.08)",
          border: "1px solid rgba(248,113,113,0.25)",
          borderRadius: 20,
          padding: "6px 14px",
          fontSize: 12,
          fontWeight: 700,
          color: "#f87171",
        }}>
          Effective Tax Rate: {result.effectiveTaxRate.toFixed(1)}%
        </div>
        <div style={{
          background: "rgba(129,140,248,0.08)",
          border: "1px solid rgba(129,140,248,0.25)",
          borderRadius: 20,
          padding: "6px 14px",
          fontSize: 12,
          fontWeight: 700,
          color: "#818cf8",
        }}>
          Take-Home Rate: {result.totalGross > 0 ? ((result.netAnnual / result.totalGross) * 100).toFixed(1) : "0.0"}%
        </div>
      </div>

      {/* Paystub Frequency Card */}
      <div style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(51,65,85,0.4)", borderRadius: 14, padding: "18px 18px", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(148,163,184,0.6)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.7px" }}>Paystub Frequency</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(51,65,85,0.4)" }}>
                <th style={th}>Period</th>
                <th style={{ ...th, textAlign: "right" }}>Gross</th>
                <th style={{ ...th, textAlign: "right" }}>Net</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Annual",    gross: result.totalGross,      net: result.netAnnual },
                { label: "Monthly",   gross: result.grossMonthly,    net: result.netMonthly },
                { label: "Bi-Weekly", gross: result.grossBiweekly,   net: result.netBiweekly },
                { label: "Weekly",    gross: result.grossWeekly,     net: result.netWeekly },
                { label: "Daily",     gross: result.totalGross / 260, net: result.netDaily },
                { label: "Hourly Net", gross: null,                   net: result.netHourly },
              ].map((row) => (
                <tr key={row.label} style={{ borderBottom: "1px solid rgba(51,65,85,0.15)" }}>
                  <td style={{ ...td, color: "rgba(148,163,184,0.7)" }}>{row.label}</td>
                  <td style={{ ...td, textAlign: "right", color: "rgba(148,163,184,0.6)", fontWeight: 600 }}>
                    {row.gross != null ? fmt$(row.gross) : "—"}
                  </td>
                  <td style={{ ...td, textAlign: "right", color: "#34c98a", fontWeight: 700 }}>{fmt$(row.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 401k projection */}
      {result.k401annual > 0 && (
        <div style={{ background: "rgba(129,140,248,0.07)", border: "1px solid rgba(129,140,248,0.2)", borderRadius: 12, padding: "12px 14px", fontSize: 12, color: "rgba(148,163,184,0.75)", lineHeight: 1.6 }}>
          <span style={{ color: "#818cf8", fontWeight: 700 }}>401k projection:</span> Contributing {fmt$(result.k401annual)}/year grows to approximately{" "}
          <span style={{ color: "#818cf8", fontWeight: 800 }}>{fmt$(result.k401future)}</span> in 10 years at 7% annual return.
        </div>
      )}
    </div>
  );
}

// ─── Main FinanceCalculators component ───────────────────────────────────────

const CALC_TABS = [
  { id: "investment", label: "📈 Investment" },
  { id: "auto", label: "🚗 Auto Loan" },
  { id: "mortgage", label: "🏠 Mortgage" },
  { id: "retirement", label: "🏖️ Retirement" },
  { id: "fha", label: "🏡 FHA Loan" },
  { id: "salary", label: "💼 Salary" },
];

export default function FinanceCalculators() {
  const [tab, setTab] = useState("investment");

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Example values disclaimer */}
      <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.18)", borderRadius: 10, padding: "8px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(148,163,184,0.7)", lineHeight: 1.5 }}>
        <span style={{ flexShrink: 0 }}>{"\u{1F4A1}"}</span>
        <span>All calculators are pre-filled with <strong style={{ color: "rgba(165,180,252,0.8)" }}>example values</strong> to show how they work. Replace them with your own numbers.</span>
      </div>
      {/* Sub-tab bar */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20, borderBottom: "1px solid rgba(51,65,85,0.35)", paddingBottom: 10 }}>
        {CALC_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: tab === t.id ? "rgba(99,102,241,0.15)" : "transparent",
              border: `1px solid ${tab === t.id ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 20,
              color: tab === t.id ? "#818cf8" : "rgba(148,163,184,0.6)",
              padding: "6px 14px",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: tab === t.id ? 700 : 400,
              fontFamily: "'DM Sans',sans-serif",
              transition: "all 0.15s ease",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "investment" && <InvestmentCalc />}
      {tab === "auto" && <AutoLoanCalc />}
      {tab === "mortgage" && <MortgageCalc />}
      {tab === "retirement" && <RetirementCalc />}
      {tab === "fha" && <FHACalc />}
      {tab === "salary" && <SalaryCalc />}
    </div>
  );
}
