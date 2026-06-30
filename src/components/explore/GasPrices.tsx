import React, { useState, useEffect } from 'react';
import { Fuel, Loader2, RefreshCw } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { formatUsd } from '@/utils/travelEngine';
import type { FuelPrices } from '@/types';

interface GasPricesProps {
  prices: FuelPrices | null;
  onPricesFetched: (prices: FuelPrices) => void;
  onSelectPrice: (price: number) => void;
}

const FUEL_ROWS: { key: keyof Omit<FuelPrices, 'fetchedAt'>; label: string; octane: string }[] = [
  { key: 'regular', label: 'Regular', octane: '87' },
  { key: 'midgrade', label: 'Midgrade', octane: '89' },
  { key: 'premium', label: 'Premium', octane: '91-93' },
  { key: 'diesel', label: 'Diesel', octane: '' },
  { key: 'e85', label: 'E85', octane: '' },
];

const GasPrices = React.memo(function GasPrices({ prices, onPricesFetched, onSelectPrice }: GasPricesProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchPrices = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/fuel-economy?action=prices');
      if (!res.ok) throw new Error('Failed to fetch prices');
      const data = await res.json();
      onPricesFetched({ ...data, fetchedAt: Date.now() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fetch failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!prices || Date.now() - prices.fetchedAt > 86_400_000) {
      fetchPrices();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const age = prices ? Math.round((Date.now() - prices.fetchedAt) / 3_600_000) : null;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Fuel size={16} className="text-emerald-400" />
        <h3 className="text-sm font-semibold text-fg-secondary">National Avg Gas Prices</h3>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={fetchPrices} disabled={loading}>
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
        </Button>
      </div>

      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

      {prices ? (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-3 mb-1">
            <span className="text-[10px] text-fg-faint font-medium uppercase tracking-wider">Fuel Grade</span>
            <span className="text-[10px] text-fg-faint font-medium uppercase tracking-wider">Price/gal</span>
          </div>
          <div className="space-y-1.5">
            {FUEL_ROWS.map((row) => {
              const val = prices[row.key] as number;
              if (!val || val <= 0) return null;
              return (
                <button key={row.key} onClick={() => onSelectPrice(val)}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5 hover:border-accent/30 transition-colors group">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-fg-secondary">{row.label}</span>
                    {row.octane && <span className="text-[10px] text-fg-faint">{row.octane}</span>}
                  </div>
                  <span className="text-sm font-bold text-fg group-hover:text-accent-text transition-colors">
                    {formatUsd(val)}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-fg-muted mt-2">
            {age !== null && (age < 1 ? 'Updated just now' : `Updated ${age}h ago`)}
            {' '}&middot; Tap a price to use it in your fuel calculator
          </p>
        </>
      ) : !loading ? (
        <p className="text-xs text-fg-faint text-center py-3">No price data available</p>
      ) : null}
    </Card>
  );
});

export default GasPrices;
