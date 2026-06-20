import React, { useState, useRef } from 'react';
import { parseOFXFile, isOFXContent, applyColumnMapping } from '../utils/fileImportParser';

// Known bank CSV formats — column index mappings
const BANK_FORMATS = [
  { name: 'Chase',          detect: h => h.includes('Transaction Date') && h.includes('Description'),   date: 1, name_: 2, amount: 3, type_col: -1 },
  { name: 'Bank of America',detect: h => h.includes('Date') && h.includes('Payee') && h.includes('Amount'), date: 0, name_: 1, amount: 3, type_col: -1 },
  { name: 'Wells Fargo',    detect: h => h.length >= 5 && h[0].match(/\d{2}\/\d{2}\/\d{4}/), date: 0, name_: 4, amount: 1, type_col: -1, noHeader: true },
  { name: 'Citi',           detect: h => h.includes('Date') && h.includes('Description') && h.includes('Debit') && h.includes('Credit'), date: 0, name_: 1, debit: 2, credit: 3 },
  { name: 'Capital One',    detect: h => h.includes('Transaction Date') && h.includes('Transaction Amount'), date: 0, name_: 3, amount: 4, type_col: 2 },
  { name: 'Discover',       detect: h => h.includes('Trans. Date') && h.includes('Description') && h.includes('Amount'), date: 0, name_: 2, amount: 3, type_col: -1 },
  { name: 'Generic',        detect: () => true, date: 0, name_: 1, amount: 2, type_col: -1 },
];

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  return lines.map(line => {
    const cols = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    cols.push(cur.trim());
    return cols;
  });
}

function detectFormat(rows) {
  const header = rows[0] || [];
  const headerStr = header.join(',').toLowerCase().replace(/['"]/g, '');
  const headerNorm = headerStr.split(',');
  for (const fmt of BANK_FORMATS) {
    if (fmt.detect(fmt.noHeader ? rows[0] : headerNorm)) return fmt;
  }
  return BANK_FORMATS[BANK_FORMATS.length - 1];
}

function parseAmount(str) {
  if (!str) return 0;
  const cleaned = String(str).replace(/[$,\s]/g, '');
  return parseFloat(cleaned) || 0;
}

function parseDate(str) {
  if (!str) return '';
  // Handle MM/DD/YYYY
  const mdyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mdyMatch) return `${mdyMatch[3]}-${mdyMatch[1].padStart(2,'0')}-${mdyMatch[2].padStart(2,'0')}`;
  // Handle YYYY-MM-DD already
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0,10);
  return str;
}

function rowsToTransactions(rows, fmt) {
  const dataRows = fmt.noHeader ? rows : rows.slice(1);
  return dataRows.map((cols, i) => {
    const name = (cols[fmt.name_] || '').replace(/[*]/g, '').trim();
    if (!name) return null;

    let amount = 0;
    if (fmt.debit !== undefined) {
      // Citi-style: separate debit/credit columns
      const debit  = parseAmount(cols[fmt.debit]);
      const credit = parseAmount(cols[fmt.credit]);
      amount = debit > 0 ? debit : -credit;
    } else {
      amount = parseAmount(cols[fmt.amount]);
    }

    if (amount === 0) return null;

    // Normalize: expenses are positive, income is negative in most bank exports
    // Chase uses negative for debits (spending), positive for credits (income)
    const type = amount < 0 ? 'income' : 'expense';
    const absAmount = Math.abs(amount);

    return {
      id:       `csv_${Date.now()}_${i}`,
      date:     parseDate(cols[fmt.date] || ''),
      name,
      merchant: name,
      amount:   absAmount,
      type,
      category: 'other',
      source:   'csv',
    };
  }).filter(Boolean);
}

function guessCategory(name) {
  const n = name.toLowerCase();
  if (/uber|lyft|taxi|parking|gas|shell|exxon|chevron|bp |valero/.test(n))   return 'transport';
  if (/amazon|walmart|target|costco|shop|store|market/.test(n))               return 'shopping';
  if (/restaurant|cafe|coffee|starbucks|mcdonald|chipotle|pizza|doordash|grubhub|ubereats|food/.test(n)) return 'food';
  if (/netflix|spotify|hulu|disney|apple\.com\/bill|google play|youtube/.test(n)) return 'entertainment';
  if (/gym|fitness|planet fitness|equinox|health/.test(n))                    return 'health';
  if (/rent|mortgage|electric|water|utility|comcast|at&t|verizon|t-mobile/.test(n)) return 'housing';
  if (/salary|payroll|direct dep|zelle|venmo|cashapp/.test(n))               return 'income';
  return 'other';
}

const S = {
  overlay: { position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.88)', backdropFilter:'blur(12px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 },
  modal:   { background:'#0d1117', border:'1px solid rgba(51,65,85,0.6)', borderRadius:20, width:'100%', maxWidth:560, maxHeight:'90vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 0 60px rgba(0,0,0,0.6)' },
  header:  { padding:'20px 24px 16px', borderBottom:'1px solid rgba(51,65,85,0.4)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 },
  body:    { flex:1, overflowY:'auto', padding:'16px 24px' },
  footer:  { padding:'14px 24px', borderTop:'1px solid rgba(51,65,85,0.4)', display:'flex', gap:10, flexShrink:0 },
  btn:     (bg, color='#fff') => ({ background:bg, border:'none', borderRadius:10, color, padding:'10px 20px', fontSize:13, fontWeight:700, fontFamily:"'DM Sans',sans-serif", cursor:'pointer' }),
  inp:     { background:'rgba(15,23,42,0.8)', border:'1px solid rgba(51,65,85,0.55)', borderRadius:8, color:'#e2e8f0', padding:'6px 10px', fontSize:12, fontFamily:"'DM Sans',sans-serif", outline:'none' },
};

export default function CSVImportModal({ onImport, onClose }) {
  const [step, setStep]             = useState('upload');   // upload | mapping | preview | done
  const [transactions, setTxns]     = useState([]);
  const [bankName, setBankName]     = useState('');
  const [selected, setSelected]     = useState(new Set());
  const [filter, setFilter]         = useState('all');
  const [toastMsg, setToastMsg]     = useState('');
  const [csvRows, setCsvRows]       = useState([]);
  const [colMapping, setColMapping] = useState({ date: 0, description: 1, amount: 2 });
  const fileRef = useRef(null);

  function showToast(msg) { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3000); }

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = f.name.split('.').pop()?.toLowerCase() || '';
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result || '';

        // OFX/QFX file detection
        if (ext === 'ofx' || ext === 'qfx' || isOFXContent(text)) {
          const ofxTxns = parseOFXFile(text);
          if (!ofxTxns.length) { showToast('No transactions found in OFX file.'); return; }
          setBankName('OFX/QFX');
          const mapped = ofxTxns.map((t, i) => ({
            id: `ofx_${Date.now()}_${i}`,
            date: t.date,
            name: t.description,
            merchant: t.description,
            amount: t.amount,
            type: t.type,
            category: t.category,
            source: 'ofx',
          }));
          setTxns(mapped);
          setSelected(new Set(mapped.map(t => t.id)));
          setStep('preview');
          return;
        }

        // CSV parsing
        const rows = parseCSV(text);
        if (rows.length < 2) { showToast('File appears empty or has only headers.'); return; }
        const fmt = detectFormat(rows);

        // If only Generic format matched, offer column mapping
        if (fmt.name === 'Generic') {
          setCsvRows(rows);
          setStep('mapping');
          return;
        }

        setBankName(fmt.name);
        const txns = rowsToTransactions(rows, fmt).map(t => ({
          ...t,
          category: guessCategory(t.name),
        }));
        if (!txns.length) { showToast('No valid transactions found. Make sure this is a bank transaction export.'); return; }
        setTxns(txns);
        setSelected(new Set(txns.map(t => t.id)));
        setStep('preview');
      } catch (err) {
        showToast('Failed to parse file: ' + err.message);
      }
    };
    reader.readAsText(f);
    e.target.value = '';
  }

  function applyMapping() {
    try {
      const mapped = applyColumnMapping(csvRows, colMapping, true);
      if (!mapped.length) { showToast('No valid transactions found with this mapping.'); return; }
      setBankName('Custom Mapping');
      const txns = mapped.map((t, i) => ({
        id: `csv_${Date.now()}_${i}`,
        date: t.date,
        name: t.description,
        merchant: t.description,
        amount: t.amount,
        type: t.type,
        category: t.category,
        source: 'csv',
      }));
      setTxns(txns);
      setSelected(new Set(txns.map(t => t.id)));
      setStep('preview');
    } catch (err) {
      showToast('Mapping failed: ' + err.message);
    }
  }

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(t => t.id)));
  }

  function toggleOne(id) {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  }

  function updateCategory(id, cat) {
    setTxns(p => p.map(t => t.id === id ? { ...t, category: cat } : t));
  }

  function doImport() {
    const toImport = transactions.filter(t => selected.has(t.id));
    onImport(toImport);
    setStep('done');
  }

  const filtered = filter === 'all' ? transactions
    : transactions.filter(t => t.type === filter);

  const totalExpenses = transactions.filter(t => selected.has(t.id) && t.type === 'expense').reduce((s,t) => s + t.amount, 0);
  const totalIncome   = transactions.filter(t => selected.has(t.id) && t.type === 'income').reduce((s,t) => s + t.amount, 0);

  const CATEGORIES = ['food','transport','shopping','housing','health','entertainment','income','other'];

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      {toastMsg && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#6366f1', color: '#fff', padding: '12px 20px', borderRadius: 8, zIndex: 10000, fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}>
          {toastMsg}
        </div>
      )}
      <div style={S.modal}>

        {/* Header */}
        <div style={S.header}>
          <div>
            <div style={{ fontFamily:"'Syne',serif", fontSize:18, fontWeight:800, color:'#f1f5f9' }}>
              Import Bank Statement
            </div>
            {step === 'preview' && (
              <div style={{ fontSize:12, color:'rgba(100,116,139,0.8)', marginTop:3 }}>
                Detected: <span style={{ color:'#a5b4fc' }}>{bankName}</span> · {transactions.length} transactions
              </div>
            )}
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background:'transparent', border:'none', color:'rgba(255,255,255,0.4)', fontSize:20, cursor:'pointer', padding:4 }}>✕</button>
        </div>

        {/* Body */}
        <div style={S.body}>

          {/* Step: Upload */}
          {step === 'upload' && (
            <div>
              <div style={{ textAlign:'center', padding:'24px 0 20px' }}>
                <div style={{ fontSize:48, marginBottom:12 }}>🏦</div>
                <div style={{ fontSize:15, fontWeight:700, color:'#f1f5f9', marginBottom:8 }}>Upload your bank statement</div>
                <div style={{ fontSize:13, color:'rgba(100,116,139,0.8)', lineHeight:1.6, marginBottom:24 }}>
                  Supports CSV, OFX, and QFX files. Works with Chase, Bank of America, Wells Fargo, Citi, Capital One, Discover, and most banks.
                </div>
                <button onClick={() => fileRef.current?.click()} style={{ ...S.btn('linear-gradient(135deg,#6366f1,#8b5cf6)'), padding:'12px 32px', fontSize:14 }}>
                  Choose File
                </button>
                <input ref={fileRef} type="file" accept=".csv,.CSV,.ofx,.OFX,.qfx,.QFX" style={{ display:'none' }} onChange={handleFile} />
              </div>

              {/* How to export guide */}
              <div style={{ background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.15)', borderRadius:12, padding:'14px 16px', marginTop:8 }}>
                <div style={{ fontSize:11, color:'#818cf8', fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', marginBottom:10 }}>How to export from your bank</div>
                {[
                  { bank:'Chase', steps:'Sign in → Activity → Download Account Activity → CSV' },
                  { bank:'Bank of America', steps:'Sign in → Transactions → Download → CSV Format' },
                  { bank:'Wells Fargo', steps:'Sign in → Account Activity → Download → Comma-Delimited' },
                  { bank:'Capital One', steps:'Sign in → Transactions → Download → CSV' },
                  { bank:'Citi', steps:'Sign in → View Transactions → Download → CSV' },
                ].map(({ bank, steps }) => (
                  <div key={bank} style={{ display:'flex', gap:8, marginBottom:7 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'rgba(165,180,252,0.9)', minWidth:110 }}>{bank}</div>
                    <div style={{ fontSize:12, color:'rgba(100,116,139,0.8)' }}>{steps}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step: Column Mapping (for unrecognized CSV formats) */}
          {step === 'mapping' && csvRows.length > 0 && (
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:'#f1f5f9', marginBottom:6 }}>Map Your Columns</div>
              <div style={{ fontSize:12, color:'rgba(100,116,139,0.8)', marginBottom:16 }}>
                We couldn't auto-detect your bank format. Select which column contains each field.
              </div>

              {/* Sample data preview */}
              <div style={{ background:'rgba(15,23,42,0.6)', borderRadius:10, padding:12, marginBottom:16, overflowX:'auto', border:'1px solid rgba(51,65,85,0.3)' }}>
                <div style={{ fontSize:10, color:'#818cf8', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>Preview (first 3 rows)</div>
                <table style={{ width:'100%', fontSize:11, color:'#e2e8f0', borderCollapse:'collapse' }}>
                  <thead>
                    <tr>
                      {(csvRows[0] || []).map((col, i) => (
                        <th key={i} style={{ padding:'4px 8px', textAlign:'left', borderBottom:'1px solid rgba(51,65,85,0.3)', color:'#a5b4fc', fontWeight:600 }}>
                          Col {i}: {col.slice(0, 20)}{col.length > 20 ? '...' : ''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.slice(1, 4).map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci} style={{ padding:'4px 8px', borderBottom:'1px solid rgba(51,65,85,0.15)', color:'rgba(148,163,184,0.8)' }}>
                            {cell.slice(0, 20)}{cell.length > 20 ? '...' : ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mapping dropdowns */}
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[
                  { key: 'date', label: 'Date Column' },
                  { key: 'description', label: 'Description Column' },
                  { key: 'amount', label: 'Amount Column' },
                ].map(({ key, label }) => (
                  <div key={key} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'#e2e8f0', minWidth:130 }}>{label}</div>
                    <select
                      value={colMapping[key]}
                      onChange={e => setColMapping(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
                      style={{ ...S.inp, flex:1 }}
                    >
                      {(csvRows[0] || []).map((col, i) => (
                        <option key={i} value={i}>Col {i}: {col.slice(0, 30)}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && (
            <div>
              {/* Summary bar */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:14 }}>
                {[
                  { label:'Selected', val:selected.size, color:'#a5b4fc' },
                  { label:'Expenses', val:`$${totalExpenses.toFixed(0)}`, color:'#f87171' },
                  { label:'Income',   val:`$${totalIncome.toFixed(0)}`,   color:'#34c98a' },
                ].map(s => (
                  <div key={s.label} style={{ background:'rgba(15,23,42,0.7)', borderRadius:10, padding:'10px 12px', textAlign:'center', border:'1px solid rgba(51,65,85,0.35)' }}>
                    <div style={{ fontSize:18, fontWeight:800, color:s.color, fontFamily:"'Syne',serif" }}>{s.val}</div>
                    <div style={{ fontSize:10, color:'rgba(100,116,139,0.7)', marginTop:2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Filter + select all */}
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <div style={{ display:'flex', gap:4, flex:1 }}>
                  {['all','expense','income'].map(f => (
                    <button key={f} onClick={() => setFilter(f)} style={{ ...S.btn(filter===f ? 'rgba(99,102,241,0.25)' : 'rgba(15,23,42,0.6)', filter===f ? '#a5b4fc' : 'rgba(100,116,139,0.7)'), border:`1px solid ${filter===f?'rgba(99,102,241,0.4)':'rgba(51,65,85,0.4)'}`, padding:'5px 12px', fontSize:11, borderRadius:8 }}>
                      {f.charAt(0).toUpperCase()+f.slice(1)}
                    </button>
                  ))}
                </div>
                <button onClick={toggleAll} style={{ ...S.btn('rgba(15,23,42,0.6)', 'rgba(148,163,184,0.8)'), border:'1px solid rgba(51,65,85,0.4)', padding:'5px 12px', fontSize:11, borderRadius:8 }}>
                  {selected.size === filtered.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Transaction list */}
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {filtered.map(t => (
                  <div key={t.id} onClick={() => toggleOne(t.id)} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:10, cursor:'pointer', background: selected.has(t.id) ? 'rgba(99,102,241,0.08)' : 'rgba(15,23,42,0.4)', border:`1px solid ${selected.has(t.id)?'rgba(99,102,241,0.25)':'rgba(51,65,85,0.25)'}`, transition:'all 0.15s' }}>
                    {/* Checkbox */}
                    <div style={{ width:16, height:16, borderRadius:4, border:`2px solid ${selected.has(t.id)?'#6366f1':'rgba(100,116,139,0.4)'}`, background:selected.has(t.id)?'#6366f1':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:10, color:'#fff' }}>
                      {selected.has(t.id) ? '✓' : ''}
                    </div>

                    {/* Date */}
                    <div style={{ fontSize:11, color:'rgba(100,116,139,0.7)', minWidth:72, flexShrink:0 }}>{t.date}</div>

                    {/* Name */}
                    <div style={{ flex:1, fontSize:12, color:'#e2e8f0', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.name}</div>

                    {/* Category picker */}
                    <select
                      value={t.category}
                      onClick={e => e.stopPropagation()}
                      onChange={e => { e.stopPropagation(); updateCategory(t.id, e.target.value); }}
                      style={{ ...S.inp, padding:'3px 6px', fontSize:11, minWidth:90 }}
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    {/* Amount */}
                    <div style={{ fontSize:13, fontWeight:700, color: t.type==='income' ? '#34c98a' : '#f87171', minWidth:60, textAlign:'right', flexShrink:0 }}>
                      {t.type==='income' ? '+' : '-'}${t.amount.toFixed(0)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && (
            <div style={{ textAlign:'center', padding:'32px 0' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
              <div style={{ fontSize:16, fontWeight:700, color:'#f1f5f9', marginBottom:8 }}>Import complete!</div>
              <div style={{ fontSize:13, color:'rgba(100,116,139,0.8)' }}>
                {selected.size} transactions added to your Finance tab.
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={S.footer}>
          {step === 'upload' && (
            <button onClick={onClose} style={{ ...S.btn('rgba(15,23,42,0.8)', 'rgba(148,163,184,0.7)'), border:'1px solid rgba(51,65,85,0.5)', flex:1 }}>Cancel</button>
          )}
          {step === 'mapping' && (
            <>
              <button onClick={() => setStep('upload')} style={{ ...S.btn('rgba(15,23,42,0.8)', 'rgba(148,163,184,0.7)'), border:'1px solid rgba(51,65,85,0.5)' }}>Back</button>
              <button onClick={applyMapping} style={{ ...S.btn('linear-gradient(135deg,#6366f1,#8b5cf6)'), flex:1 }}>
                Apply Mapping
              </button>
            </>
          )}
          {step === 'preview' && (
            <>
              <button onClick={() => setStep('upload')} style={{ ...S.btn('rgba(15,23,42,0.8)', 'rgba(148,163,184,0.7)'), border:'1px solid rgba(51,65,85,0.5)' }}>← Back</button>
              <button onClick={doImport} disabled={selected.size === 0} style={{ ...S.btn('linear-gradient(135deg,#6366f1,#8b5cf6)'), flex:1, opacity: selected.size===0 ? 0.5 : 1 }}>
                Import {selected.size} Transaction{selected.size !== 1 ? 's' : ''}
              </button>
            </>
          )}
          {step === 'done' && (
            <button onClick={onClose} style={{ ...S.btn('linear-gradient(135deg,#6366f1,#8b5cf6)'), flex:1 }}>Done</button>
          )}
        </div>

      </div>
    </div>
  );
}
