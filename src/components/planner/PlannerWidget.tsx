import { Target, Sparkles } from 'lucide-react';
import Card from '@/components/ui/Card';
import { usePlannerStore } from '@/store/usePlannerStore';

interface PlannerWidgetProps {
  onClick: () => void;
}

export default function PlannerWidget({ onClick }: PlannerWidgetProps) {
  const plan = usePlannerStore((s) => s.getToday());

  const ENERGY_EMOJI = ['', '😴', '😐', '🙂', '😊', '⚡'];

  return (
    <Card className="p-4 cursor-pointer" hover onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <div className="text-2xl"><Target size={20} className="text-accent-text" /></div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Daily Plan</div>
      </div>
      {plan?.intention ? (
        <>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={12} className="text-accent-text" />
            <span className="text-sm text-fg-secondary truncate">{plan.intention}</span>
          </div>
          <div className="text-xs text-fg-faint">
            {ENERGY_EMOJI[plan.energyLevel]} Energy: {plan.energyLevel}/5 · {plan.topPriorities.length} priorities
          </div>
        </>
      ) : (
        <div className="text-sm text-fg-muted">Set your daily intention →</div>
      )}
    </Card>
  );
}
