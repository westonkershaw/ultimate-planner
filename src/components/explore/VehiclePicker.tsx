import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, Loader2, X, Fuel, Gauge } from 'lucide-react';
import Card from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import type { VehicleMenuItem, VehicleSelection, VehicleMpg } from '@/types';

// ── Types ───────────────────────────────────────────────────────────────────

interface VehiclePickerProps {
  vehicle: VehicleSelection | null;
  vehicleMpg: VehicleMpg | null;
  onSelect: (vehicle: VehicleSelection, mpg: VehicleMpg) => void;
  onClear: () => void;
}

// ── API helpers ─────────────────────────────────────────────────────────────

async function fetchMenu(action: string, params: Record<string, string> = {}): Promise<VehicleMenuItem[]> {
  const qs = new URLSearchParams({ action, ...params }).toString();
  const res = await fetch(`/api/fuel-economy?${qs}`);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

interface VehicleApiResponse {
  cityMpg: number;
  highwayMpg: number;
  combinedMpg: number;
  fuelType: string;
  cylinders: number;
  displacement: number;
  transmission: string;
  drive: string;
  vehicleClass: string;
  annualFuelCost: number;
  co2Gpm: number;
}

async function fetchVehicle(id: string): Promise<VehicleApiResponse> {
  const res = await fetch(`/api/fuel-economy?action=vehicle&id=${id}`);
  if (!res.ok) throw new Error('Failed to fetch vehicle');
  return res.json();
}

// ── Component ───────────────────────────────────────────────────────────────

const VehiclePicker = React.memo(function VehiclePicker({
  vehicle,
  vehicleMpg,
  onSelect,
  onClear,
}: VehiclePickerProps) {
  const [years, setYears] = useState<VehicleMenuItem[]>([]);
  const [makes, setMakes] = useState<VehicleMenuItem[]>([]);
  const [models, setModels] = useState<VehicleMenuItem[]>([]);
  const [options, setOptions] = useState<VehicleMenuItem[]>([]);

  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');

  // Load years on mount
  useEffect(() => {
    setLoadingStep('years');
    fetchMenu('years')
      .then((items) => setYears(items.reverse()))
      .catch(() => setYears([]))
      .finally(() => setLoadingStep(''));
  }, []);

  // Load makes when year changes
  useEffect(() => {
    if (!year) { setMakes([]); return; }
    setMake(''); setModel(''); setMakes([]); setModels([]); setOptions([]);
    setLoadingStep('makes');
    fetchMenu('makes', { year })
      .then(setMakes)
      .catch(() => setMakes([]))
      .finally(() => setLoadingStep(''));
  }, [year]);

  // Load models when make changes
  useEffect(() => {
    if (!year || !make) { setModels([]); return; }
    setModel(''); setModels([]); setOptions([]);
    setLoadingStep('models');
    fetchMenu('models', { year, make })
      .then(setModels)
      .catch(() => setModels([]))
      .finally(() => setLoadingStep(''));
  }, [year, make]);

  // Load options when model changes
  useEffect(() => {
    if (!year || !make || !model) { setOptions([]); return; }
    setOptions([]);
    setLoadingStep('options');
    fetchMenu('options', { year, make, model })
      .then(setOptions)
      .catch(() => setOptions([]))
      .finally(() => setLoadingStep(''));
  }, [year, make, model]);

  const handleOptionSelect = useCallback(async (optionId: string) => {
    const opt = options.find((o) => o.value === optionId);
    if (!opt) return;
    setLoading(true);
    try {
      const v = await fetchVehicle(optionId);
      const selection: VehicleSelection = {
        year, make, model,
        optionId,
        optionLabel: opt.text,
      };
      const mpg: VehicleMpg = {
        city: v.cityMpg,
        highway: v.highwayMpg,
        combined: v.combinedMpg,
        fuelType: v.fuelType,
        cylinders: v.cylinders,
        displacement: v.displacement,
        transmission: v.transmission,
        drive: v.drive,
        vehicleClass: v.vehicleClass,
        annualFuelCost: v.annualFuelCost,
        co2Gpm: v.co2Gpm,
      };
      onSelect(selection, mpg);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [options, year, make, model, onSelect]);

  // If vehicle is already selected, show summary
  if (vehicle && vehicleMpg) {
    return (
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center flex-shrink-0">
              <Car size={18} className="text-indigo-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-100 truncate">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </p>
              <p className="text-xs text-slate-500 truncate">{vehicle.optionLabel}</p>
            </div>
          </div>
          <button
            onClick={onClear}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-white/5 transition-colors"
            aria-label="Remove vehicle"
          >
            <X size={14} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <MpgBadge label="City" value={vehicleMpg.city} icon={<Gauge size={12} />} />
          <MpgBadge label="Highway" value={vehicleMpg.highway} icon={<Gauge size={12} />} />
          <MpgBadge label="Combined" value={vehicleMpg.combined} icon={<Fuel size={12} />} />
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <InfoChip label={vehicleMpg.fuelType} />
          {vehicleMpg.cylinders > 0 && <InfoChip label={`${vehicleMpg.cylinders} cyl`} />}
          {vehicleMpg.displacement > 0 && <InfoChip label={`${vehicleMpg.displacement}L`} />}
          <InfoChip label={vehicleMpg.drive} />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Car size={16} className="text-indigo-400" />
        <h3 className="text-sm font-semibold text-slate-200">Select Vehicle</h3>
        <AnimatePresence>
          {loadingStep && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Loader2 size={12} className="text-indigo-400 animate-spin" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select label="Year" value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="">Select year</option>
          {years.map((y) => (
            <option key={y.value} value={y.value}>{y.text}</option>
          ))}
        </Select>

        <Select label="Make" value={make} onChange={(e) => setMake(e.target.value)} disabled={!year}>
          <option value="">Select make</option>
          {makes.map((m) => (
            <option key={m.value} value={m.value}>{m.text}</option>
          ))}
        </Select>

        <Select label="Model" value={model} onChange={(e) => setModel(e.target.value)} disabled={!make}>
          <option value="">Select model</option>
          {models.map((m) => (
            <option key={m.value} value={m.value}>{m.text}</option>
          ))}
        </Select>

        <Select
          label="Trim / Engine"
          value=""
          onChange={(e) => handleOptionSelect(e.target.value)}
          disabled={!model || options.length === 0}
        >
          <option value="">Select trim</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.text}</option>
          ))}
        </Select>
      </div>

      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 mt-3 text-xs text-slate-500"
          >
            <Loader2 size={12} className="animate-spin" />
            Loading vehicle data...
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
});

// ── Sub-components ──────────────────────────────────────────────────────────

function MpgBadge({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
      <span className="text-[10px] uppercase tracking-widest text-slate-500 flex items-center gap-1">
        {icon} {label}
      </span>
      <span className="text-lg font-bold text-slate-100">{value}</span>
      <span className="text-[10px] text-slate-600">mpg</span>
    </div>
  );
}

function InfoChip({ label }: { label: string }) {
  return (
    <span className="text-[10px] px-2 py-1 rounded-lg bg-white/5 border border-white/5 text-slate-400">
      {label}
    </span>
  );
}

export default VehiclePicker;
