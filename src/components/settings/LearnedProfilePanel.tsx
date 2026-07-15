import { useState } from 'react';
import { Brain, X, RefreshCw, Pin, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useProfileStore, useUIStore } from '@/store';
import { learnNow } from '@/utils/learnNow';

const fmtHour = (h: number): string => {
  const am = h < 12;
  const base = h % 12 === 0 ? 12 : h % 12;
  return `${base}:00 ${am ? 'AM' : 'PM'}`;
};

function Chip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-2 border border-border text-xs text-fg-secondary">
      {label}
      {onRemove && (
        <button onClick={onRemove} className="text-fg-faint hover:text-accent-text" aria-label={`Remove ${label}`}>
          <X size={11} />
        </button>
      )}
    </span>
  );
}

export default function LearnedProfilePanel() {
  const profile = useProfileStore((s) => s.profile);
  const setOverride = useProfileStore((s) => s.setOverride);
  const removeOverride = useProfileStore((s) => s.removeOverride);
  const dismissInsight = useProfileStore((s) => s.dismissInsight);
  const setValues = useProfileStore((s) => s.setValues);
  const resetLearned = useProfileStore((s) => s.resetLearned);
  const addToast = useUIStore((s) => s.addToast);
  const [valueInput, setValueInput] = useState('');

  if (!profile) return null;
  const prefs = profile.preferences;
  const hour = prefs.planningHour ?? 9;
  const hourPinned = 'preferences.planningHour' in profile.overrides;

  const setHour = (h: number) => setOverride('preferences.planningHour', ((h % 24) + 24) % 24);
  const addValue = () => {
    const v = valueInput.trim();
    if (!v) return;
    setValues(Array.from(new Set([...profile.identity.values, v])));
    setValueInput('');
  };

  return (
    <section className="space-y-4" aria-labelledby="learned-heading">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={15} className="text-accent-text" />
          <h2 id="learned-heading" className="text-xs font-medium text-fg-secondary uppercase tracking-wider">
            What the planner has learned
          </h2>
        </div>
        <button
          onClick={async () => { await learnNow(); addToast('Refreshed from your recent activity.', 'success'); }}
          className="flex items-center gap-1 text-xs text-fg-muted hover:text-accent-text transition-colors"
        >
          <RefreshCw size={12} /> Update now
        </button>
      </div>

      <p className="text-xs text-fg-muted">
        This is yours to correct. Anything you pin or edit here is never overwritten by learning.
      </p>

      {/* Values */}
      <div className="space-y-2">
        <p className="text-[11px] font-mono uppercase tracking-wide text-fg-faint">Values you care about</p>
        <div className="flex flex-wrap gap-1.5">
          {profile.identity.values.map((v) => (
            <Chip key={v} label={v} onRemove={() => setValues(profile.identity.values.filter((x) => x !== v))} />
          ))}
          <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5">
            <input
              value={valueInput}
              onChange={(e) => setValueInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addValue()}
              placeholder="add a value"
              className="bg-transparent text-xs text-fg placeholder:text-fg-faint outline-none w-24"
            />
            <button onClick={addValue} className="text-fg-faint hover:text-accent-text"><Plus size={12} /></button>
          </span>
        </div>
      </div>

      {/* Planning reminder time (editable / pinnable) */}
      <div className="flex items-center justify-between rounded-card border border-border bg-surface-1 p-3">
        <div>
          <p className="text-sm text-fg flex items-center gap-1.5">
            Planning reminder {hourPinned && <Pin size={11} className="text-accent-text" />}
          </p>
          <p className="text-xs text-fg-muted">{prefs.planningDays.length ? prefs.planningDays.join(', ') : 'When you tend to plan'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setHour(hour - 1)} className="p-1 text-fg-muted hover:text-fg"><ChevronLeft size={16} /></button>
          <span className="text-sm font-mono text-fg w-20 text-center tabular-nums">{fmtHour(hour)}</span>
          <button onClick={() => setHour(hour + 1)} className="p-1 text-fg-muted hover:text-fg"><ChevronRight size={16} /></button>
          {hourPinned && (
            <button onClick={() => removeOverride('preferences.planningHour')} className="text-[10px] text-fg-faint hover:text-accent-text ml-1">reset</button>
          )}
        </div>
      </div>

      {/* Learned categories */}
      {(prefs.preferredCategories.length > 0 || prefs.avoidCategories.length > 0) && (
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-fg-faint mb-1">You follow through on</p>
            <div className="flex flex-wrap gap-1">{prefs.preferredCategories.map((c) => <Chip key={c} label={c} />)}</div>
          </div>
          <div>
            <p className="text-fg-faint mb-1">Tends to slip</p>
            <div className="flex flex-wrap gap-1">{prefs.avoidCategories.map((c) => <Chip key={c} label={c} />)}</div>
          </div>
        </div>
      )}

      {/* Insights */}
      <div className="space-y-2">
        <p className="text-[11px] font-mono uppercase tracking-wide text-fg-faint">Insights</p>
        {profile.insights.length ? (
          profile.insights.map((i) => (
            <div key={i.id} className="flex items-start gap-2 rounded-card border border-border bg-surface-1 p-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
              <p className="flex-1 text-sm text-fg-secondary">{i.text}</p>
              <button onClick={() => dismissInsight(i.id)} className="text-fg-faint hover:text-accent-text" aria-label="Dismiss">
                <X size={13} />
              </button>
            </div>
          ))
        ) : (
          <p className="text-xs text-fg-muted">Nothing yet — plan a week and check a few things off.</p>
        )}
      </div>

      <button
        onClick={() => {
          if (window.confirm('Reset what has been learned? Your goals and values stay; behaviour and insights clear.')) {
            void resetLearned();
            addToast('Learned data cleared.', 'info');
          }
        }}
        className="text-xs text-fg-muted hover:text-rose-400 transition-colors"
      >
        Reset what’s been learned
      </button>
    </section>
  );
}
