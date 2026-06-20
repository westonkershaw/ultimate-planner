import React, { useState, useCallback, useRef } from 'react';
import { ArrowRightLeft, Loader2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { formatNumber } from '@/utils/travelEngine';

const POPULAR_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'MXN', 'BRL', 'CHF', 'CNY',
  'INR', 'KRW', 'SEK', 'NOK', 'NZD', 'THB', 'SGD', 'HKD', 'TWD', 'COP',
];

interface CurrencyConverterProps {
  tripCurrency: string;
  onCurrencyChange: (currency: string) => void;
}

const CurrencyConverter = React.memo(function CurrencyConverter({
  tripCurrency, onCurrencyChange,
}: CurrencyConverterProps) {
  const [amount, setAmount] = useState(100);
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState(tripCurrency && tripCurrency !== 'USD' ? tripCurrency : 'EUR');
  const [result, setResult] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const cache = useRef<Map<string, { rate: number; ts: number }>>(new Map());

  const convert = useCallback(async () => {
    if (from === to) { setResult(amount); setRate(1); return; }
    setLoading(true);
    setError('');
    try {
      const cacheKey = `${from}_${to}`;
      const cached = cache.current.get(cacheKey);
      let r: number;
      if (cached && Date.now() - cached.ts < 3_600_000) {
        r = cached.rate;
      } else {
        const res = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
        if (!res.ok) throw new Error('Conversion failed');
        const data = await res.json();
        r = data.rates[to];
        cache.current.set(cacheKey, { rate: r, ts: Date.now() });
      }
      setRate(r);
      setResult(Math.round(amount * r * 100) / 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed');
    } finally {
      setLoading(false);
    }
  }, [amount, from, to]);

  const swap = useCallback(() => {
    setFrom(to);
    setTo(from);
    setResult(null);
    setRate(null);
  }, [from, to]);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <ArrowRightLeft size={16} className="text-violet-400" />
        <h3 className="text-sm font-semibold text-slate-200">Currency Converter</h3>
      </div>

      <div className="flex items-end gap-2 mb-3">
        <Input containerClassName="w-24" label="Amount" type="number" min={0} step={1}
          value={amount || ''} onChange={(e) => { setAmount(parseFloat(e.target.value) || 0); setResult(null); }} />
        <CurrencySelect value={from} onChange={(v) => { setFrom(v); setResult(null); }} />
        <button onClick={swap} className="p-2 mb-0.5 rounded-lg text-slate-500 hover:text-violet-400 transition-colors">
          <ArrowRightLeft size={14} />
        </button>
        <CurrencySelect value={to} onChange={(v) => { setTo(v); setResult(null); onCurrencyChange(v); }} />
        <Button size="sm" onClick={convert} disabled={loading || amount <= 0} className="mb-0.5">
          {loading ? <Loader2 size={12} className="animate-spin" /> : 'Go'}
        </Button>
      </div>

      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

      {result !== null && rate !== null && (
        <div className="p-3 rounded-xl bg-violet-500/8 border border-violet-500/15">
          <p className="text-sm font-bold text-slate-100">
            {formatNumber(amount, 2)} {from} = {formatNumber(result, 2)} {to}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">1 {from} = {formatNumber(rate, 4)} {to}</p>
        </div>
      )}
    </Card>
  );
});

function CurrencySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500/50 mb-0.5">
      {POPULAR_CURRENCIES.map((c) => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>
  );
}

export default CurrencyConverter;
