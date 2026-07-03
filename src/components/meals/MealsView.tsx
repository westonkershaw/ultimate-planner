import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Utensils, Plus, Trash2, Coffee, Sandwich, ChefHat, Cookie } from 'lucide-react';
import { useMealsStore, useUIStore, dayTotals } from '@/store';
import { todayKey } from '@/store/useMealsStore';
import { MEAL_SLOTS, type MealSlot, type MacroTargets } from '@/types';

const SLOT_META: Record<MealSlot, { label: string; Icon: React.FC<{ size?: number; className?: string }> }> = {
  breakfast: { label: 'Breakfast', Icon: Coffee },
  lunch:     { label: 'Lunch',     Icon: Sandwich },
  dinner:    { label: 'Dinner',    Icon: ChefHat },
  snacks:    { label: 'Snacks',    Icon: Cookie },
};

function MacroBar({ label, current, target, color }: { label: string; current: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const over = current > target && target > 0;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="text-fg-muted uppercase tracking-wider">{label}</span>
        <span className={over ? 'text-rose-400' : 'text-fg-secondary'}>
          {Math.round(current)} <span className="text-fg-faint">/ {target}{label === 'cals' ? '' : 'g'}</span>
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0"
          style={{ background: over ? '#ef4444' : color }}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        />
      </div>
    </div>
  );
}

function AddMealRow({ onAdd }: { onAdd: (m: { name: string; calories: number; protein: number; carbs: number; fat: number }) => void }) {
  const [name, setName] = useState('');
  const [cals, setCals] = useState<number | ''>('');
  const [p, setP] = useState<number | ''>('');
  const [c, setC] = useState<number | ''>('');
  const [f, setF] = useState<number | ''>('');
  const submit = () => {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      calories: cals === '' ? 0 : Number(cals),
      protein: p === '' ? 0 : Number(p),
      carbs: c === '' ? 0 : Number(c),
      fat: f === '' ? 0 : Number(f),
    });
    setName(''); setCals(''); setP(''); setC(''); setF('');
  };
  return (
    <div className="p-2.5 rounded-lg border border-dashed border-border-strong bg-surface-0 space-y-2">
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="What did you eat?"
          className="flex-1 min-w-0 bg-transparent text-sm text-fg-secondary placeholder:text-fg-faint outline-none"
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button
          onClick={submit}
          disabled={!name.trim()}
          aria-label="Add meal"
          className={[
            'p-1 rounded-md transition-colors',
            name.trim() ? 'text-accent-text hover:bg-accent/15' : 'text-fg-faint cursor-not-allowed',
          ].join(' ')}
        >
          <Plus size={14} />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {([['cals', cals, setCals], ['p', p, setP], ['c', c, setC], ['f', f, setF]] as const).map(([lbl, val, set]) => (
          <input
            key={lbl}
            type="number"
            value={val}
            onChange={(e) => set(e.target.value === '' ? '' : parseFloat(e.target.value))}
            placeholder={lbl}
            aria-label={lbl}
            className="w-full bg-surface-0 border border-border rounded px-1.5 py-1 text-[11px] text-center text-fg-secondary placeholder:text-fg-faint outline-none focus:border-accent/40"
          />
        ))}
      </div>
    </div>
  );
}

function SlotCard({ date, slot }: { date: string; slot: MealSlot }) {
  // Keep the default OUTSIDE the selector — returning a fresh `[]` from the
  // selector makes zustand see a new snapshot every render → infinite loop
  // (React #185). Selecting the raw value returns a stable `undefined`.
  const meals = useMealsStore((s) => s.plan[date]?.[slot]) ?? [];
  const addMeal = useMealsStore((s) => s.addMeal);
  const deleteMeal = useMealsStore((s) => s.deleteMeal);
  const addToast = useUIStore((s) => s.addToast);
  const { label, Icon } = SLOT_META[slot];
  const cals = meals.reduce((a, m) => a + m.calories, 0);

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-accent-text" />
        <h3 className="text-xs font-medium uppercase tracking-wider text-fg-muted">{label}</h3>
        <span className="text-[10px] text-fg-muted ml-auto">{Math.round(cals)} cal</span>
      </div>

      <ul className="space-y-1.5">
        <AnimatePresence initial={false}>
          {meals.map((m) => (
            <motion.li
              key={m.id}
              layout
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-2 p-2 rounded-lg border border-border bg-surface-1"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm text-fg-secondary truncate">{m.name}</div>
                <div className="text-[10px] text-fg-muted">
                  {Math.round(m.calories)} cal · P {Math.round(m.protein)} · C {Math.round(m.carbs)} · F {Math.round(m.fat)}
                </div>
              </div>
              <button
                onClick={() => { deleteMeal(date, slot, m.id); addToast('Meal removed', 'warning'); }}
                aria-label={`Delete ${m.name}`}
                className="text-fg-faint hover:text-rose-400 transition-colors p-1"
              >
                <Trash2 size={12} />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <AddMealRow onAdd={(m) => addMeal(date, slot, m)} />
    </section>
  );
}

export default function MealsView() {
  const targets = useMealsStore((s) => s.targets);
  const setTargets = useMealsStore((s) => s.setTargets);
  const today = todayKey();
  const day = useMealsStore((s) => s.plan[today]);
  const totals: MacroTargets = useMemo(
    () => (day ? dayTotals(day) : { calories: 0, protein: 0, carbs: 0, fat: 0 }),
    [day],
  );
  const [editing, setEditing] = useState(false);

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5 pb-24">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          <Utensils size={18} className="text-accent-text" />
          <h1 className="font-syne text-lg font-bold text-fg">Meals</h1>
        </div>
        <button onClick={() => setEditing((v) => !v)} className="text-[10px] text-fg-muted hover:text-fg-secondary transition-colors">
          {editing ? 'Done' : 'Edit targets'}
        </button>
      </motion.div>

      <div className="p-4 rounded-panel border border-border bg-surface-1 space-y-3">
        <MacroBar label="cals"    current={totals.calories} target={targets.calories} color="#14b8a6" />
        <MacroBar label="protein" current={totals.protein}  target={targets.protein}  color="#22c55e" />
        <MacroBar label="carbs"   current={totals.carbs}    target={targets.carbs}    color="#f59e0b" />
        <MacroBar label="fat"     current={totals.fat}      target={targets.fat}      color="#a78bfa" />

        {editing && (
          <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-border">
            {(['calories', 'protein', 'carbs', 'fat'] as const).map((k) => (
              <label key={k} className="block">
                <span className="block text-[9px] uppercase tracking-wider text-fg-muted mb-0.5">{k}</span>
                <input
                  type="number"
                  value={targets[k]}
                  onChange={(e) => setTargets({ [k]: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-surface-0 border border-border rounded px-1.5 py-1 text-xs text-center text-fg-secondary outline-none focus:border-accent/40"
                />
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {MEAL_SLOTS.map((slot) => (
          <SlotCard key={slot} date={today} slot={slot} />
        ))}
      </div>
    </div>
  );
}
