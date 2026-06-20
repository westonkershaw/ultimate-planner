import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ArrowRight, Loader2, Clock, Route, Plus, X, RefreshCw } from 'lucide-react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { formatNumber, formatDuration } from '@/utils/travelEngine';
import type { Waypoint } from '@/types';

interface LocationRouteProps {
  fromLocation: string;
  toLocation: string;
  waypoints: Waypoint[];
  roundTrip: boolean;
  distanceMiles: number;
  durationHours: number;
  onFromChange: (val: string) => void;
  onToChange: (val: string) => void;
  onRoundTripToggle: (val: boolean) => void;
  onAddWaypoint: (location: string) => void;
  onRemoveWaypoint: (id: string) => void;
  onRouteCalculated: (distance: number, duration: number) => void;
}

async function fetchRoute(from: string, to: string) {
  const qs = new URLSearchParams({ action: 'route', from, to }).toString();
  const res = await fetch(`/api/fuel-economy?${qs}`);
  if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Route failed'); }
  return res.json() as Promise<{ distanceMiles: number; durationHours: number }>;
}

const LocationRoute = React.memo(function LocationRoute({
  fromLocation, toLocation, waypoints, roundTrip,
  distanceMiles, durationHours,
  onFromChange, onToChange, onRoundTripToggle,
  onAddWaypoint, onRemoveWaypoint, onRouteCalculated,
}: LocationRouteProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newStop, setNewStop] = useState('');

  const calculateRoute = useCallback(async () => {
    if (!fromLocation.trim() || !toLocation.trim()) return;
    setLoading(true);
    setError('');
    try {
      const points = [fromLocation.trim(), ...waypoints.map((w) => w.location), toLocation.trim()];
      let totalDist = 0;
      let totalDur = 0;
      for (let i = 0; i < points.length - 1; i++) {
        const seg = await fetchRoute(points[i]!, points[i + 1]!);
        totalDist += seg.distanceMiles;
        totalDur += seg.durationHours;
      }
      onRouteCalculated(
        Math.round(totalDist * 10) / 10,
        Math.round(totalDur * 10) / 10,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate route');
    } finally {
      setLoading(false);
    }
  }, [fromLocation, toLocation, waypoints, onRouteCalculated]);

  const handleAddStop = useCallback(() => {
    if (!newStop.trim()) return;
    onAddWaypoint(newStop.trim());
    setNewStop('');
  }, [newStop, onAddWaypoint]);

  const displayDist = roundTrip ? distanceMiles * 2 : distanceMiles;
  const displayDur = roundTrip ? durationHours * 2 : durationHours;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Route size={16} className="text-indigo-400" />
        <h3 className="text-sm font-semibold text-slate-200">Route</h3>
        <button
          onClick={() => onRoundTripToggle(!roundTrip)}
          className={[
            'ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors',
            roundTrip
              ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
              : 'bg-white/5 text-slate-500 border border-white/10 hover:text-slate-300',
          ].join(' ')}
        >
          <RefreshCw size={10} /> Round Trip
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
        <Input containerClassName="flex-1" label="From" value={fromLocation}
          onChange={(e) => onFromChange(e.target.value)} placeholder="e.g. Salt Lake City, UT"
          icon={<MapPin size={14} />} />
        <div className="hidden sm:flex items-center pb-2.5 text-slate-700"><ArrowRight size={16} /></div>
        <Input containerClassName="flex-1" label="To" value={toLocation}
          onChange={(e) => onToChange(e.target.value)} placeholder="e.g. Denver, CO"
          icon={<MapPin size={14} />} />
      </div>

      {waypoints.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {waypoints.map((w, i) => (
            <div key={w.id} className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg bg-white/[0.03] border border-white/5">
              <span className="text-[10px] text-indigo-400 font-bold w-4">{i + 1}</span>
              <span className="text-xs text-slate-300 flex-1 truncate">{w.location}</span>
              <button onClick={() => onRemoveWaypoint(w.id)}
                className="text-slate-600 hover:text-red-400 transition-colors"><X size={12} /></button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <Input containerClassName="flex-1" placeholder="Add a stop..." value={newStop}
          onChange={(e) => setNewStop(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAddStop(); }}
          icon={<Plus size={14} />} />
        <Button variant="ghost" size="sm" onClick={handleAddStop} disabled={!newStop.trim()}>
          <Plus size={14} />
        </Button>
      </div>

      <div className="mt-3">
        <Button size="sm" onClick={calculateRoute}
          disabled={loading || !fromLocation.trim() || !toLocation.trim()} className="w-full">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Route size={14} />}
          {loading ? 'Calculating...' : 'Calculate Route'}
        </Button>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-xs text-red-400 mt-2">{error}</motion.p>
        )}
      </AnimatePresence>

      {distanceMiles > 0 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-3 rounded-xl bg-indigo-500/8 border border-indigo-500/15">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm">
              <Route size={14} className="text-indigo-400" />
              <span className="font-bold text-slate-100">{formatNumber(displayDist, 0)}</span>
              <span className="text-xs text-slate-500">miles{roundTrip ? ' total' : ''}</span>
            </div>
            {displayDur > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <Clock size={14} className="text-indigo-400" />
                <span className="font-bold text-slate-100">{formatDuration(displayDur)}</span>
                <span className="text-xs text-slate-500">drive{roundTrip ? ' total' : ''}</span>
              </div>
            )}
          </div>
          {roundTrip && (
            <p className="text-[10px] text-slate-500 mt-1.5">
              {formatNumber(distanceMiles, 0)} mi one-way &middot; {formatDuration(durationHours)} each way
            </p>
          )}
        </motion.div>
      )}
    </Card>
  );
});

export default LocationRoute;
