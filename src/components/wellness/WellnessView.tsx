import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { HeartPulse, Droplet, Sparkles as Meditate, Footprints, Check } from 'lucide-react';
import { useWellnessStore, perfectDaysLast, wellnessScoreLast } from '@/store';
import { todayKey } from '@/store/useWellnessStore';

const WATER_TARGET = 8;

function WaterRow({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="p-4 rounded-xl border border-cyan-500/15 bg-cyan-500/[0.04] space-y-2">
      <div className="flex items-center gap-2">
        <Droplet size={14} className="text-cyan-400" />
        <span className="text-[10px] uppercase tracking-wider text-cyan-300 font-semibold">Water</span>
        <span className="ml-auto text-xs text-fg-muted">{value} / {WATER_TARGET} glasses</span>
      </div>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: WATER_TARGET }).map((_, i) => {
          const filled = i < value;
          return (
            <button
              key={i}
              onClick={() => onChange(filled && i === value - 1 ? value - 1 : i + 1)}
              aria-label={`${i + 1} glasses of water`}
              className={[
                'flex-1 h-8 rounded-md transition-colors',
                filled ? 'bg-cyan-500' : 'bg-surface-2 hover:bg-surface-2',
              ].join(' ')}
            />
          );
        })}
      </div>
    </div>
  );
}

function HabitTile({ Icon, label, accent, active, onToggle }: {
  Icon: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }>;
  label: string; accent: string; active: boolean; onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={active}
      className={[
        'flex-1 p-4 rounded-xl border transition-all flex flex-col items-center gap-2',
        active
          ? 'border-accent/30 bg-accent/[0.08] scale-[1.02]'
          : 'border-border bg-surface-1 hover:border-border-strong',
      ].join(' ')}
      style={active ? { borderColor: `${accent}66`, boxShadow: `0 0 0 1px ${accent}33` } : undefined}
    >
      <Icon size={20} className={active ? '' : 'text-fg-muted'} style={active ? { color: accent } : undefined} />
      <span className={`text-xs font-medium ${active ? 'text-fg' : 'text-fg-muted'}`}>{label}</span>
      {active && <Check size={11} className="text-emerald-400" />}
    </button>
  );
}

function ScorePill({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-surface-1">
      <span className="text-[10px] uppercase tracking-wider text-fg-muted">{label}</span>
      <span className="text-sm font-semibold ml-auto" style={{ color }}>{value}</span>
    </div>
  );
}

function HeatStrip({ log }: { log: ReturnType<typeof useWellnessStore.getState>['log'] }) {
  const cells = useMemo(() => {
    const out: Array<{ key: string; score: number }> = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toLocaleDateString('en-CA');
      const day = log[key];
      if (!day) { out.push({ key, score: 0 }); continue; }
      const waterPct = Math.min(100, (day.water / WATER_TARGET) * 100);
      const med = day.meditated ? 100 : 0;
      const mov = day.moved ? 100 : 0;
      out.push({ key, score: Math.round((waterPct + med + mov) / 3) });
    }
    return out;
  }, [log]);
  return (
    <div className="p-3 rounded-xl border border-border bg-surface-1">
      <div className="text-[10px] uppercase tracking-wider text-fg-muted mb-2">Last 14 days</div>
      <div className="flex items-center gap-1">
        {cells.map(({ key, score }) => (
          <div
            key={key}
            title={`${key}: ${score}%`}
            className="flex-1 h-5 rounded-sm"
            style={{
              background: score === 0
                ? 'rgba(51,65,85,0.4)'
                : `rgba(34,197,94,${Math.max(0.15, score / 100)})`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function WellnessView() {
  const log = useWellnessStore((s) => s.log);
  const setWater = useWellnessStore((s) => s.setWater);
  const setMeditated = useWellnessStore((s) => s.setMeditated);
  const setMoved = useWellnessStore((s) => s.setMoved);

  const today = todayKey();
  const day = log[today] ?? { water: 0, meditated: false, moved: false };

  const score7 = useMemo(() => wellnessScoreLast(log, 7, WATER_TARGET), [log]);
  const perfect7 = useMemo(() => perfectDaysLast(log, 7, WATER_TARGET), [log]);

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5 pb-24">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2"
      >
        <HeartPulse size={18} className="text-accent-text" />
        <h1 className="font-syne text-lg font-bold text-fg">Wellness</h1>
      </motion.div>

      <div className="grid grid-cols-2 gap-2">
        <ScorePill label="7d score" value={`${score7}%`} color="#22c55e" />
        <ScorePill label="Perfect days" value={`${perfect7} / 7`} color="#a78bfa" />
      </div>

      <WaterRow value={day.water} onChange={(n) => setWater(today, n)} />

      <div className="flex items-stretch gap-2">
        <HabitTile
          Icon={Meditate}
          label="Meditated"
          accent="#a78bfa"
          active={day.meditated}
          onToggle={() => setMeditated(today, !day.meditated)}
        />
        <HabitTile
          Icon={Footprints}
          label="Moved"
          accent="#22c55e"
          active={day.moved}
          onToggle={() => setMoved(today, !day.moved)}
        />
      </div>

      <HeatStrip log={log} />
    </div>
  );
}
