import { memo } from 'react';
import { motion } from 'framer-motion';
import Card from '../ui/Card';
import Button from '../ui/Button';
import type { Envelope, Transaction } from '@/types';
import { calcEnvelopeSpending, calcEnvelopeStatus } from '@/utils/envelopeEngine';
import { fmt$ } from '@/utils/financeEngine';

interface EnvelopeCardProps {
  envelope: Envelope;
  transactions: Transaction[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const EnvelopeCard = memo(function EnvelopeCard({
  envelope,
  transactions,
  onEdit,
  onDelete,
}: EnvelopeCardProps) {
  const spent = calcEnvelopeSpending(envelope, transactions);
  const { pct, status, remaining, color } = calcEnvelopeStatus(envelope, spent);

  return (
    <Card className="p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ background: envelope.color }}
          />
          <span className="text-sm font-semibold text-fg">
            {envelope.name}
          </span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => onEdit(envelope.id)}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(envelope.id)}>
            Delete
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: color }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-fg-muted">
            {fmt$(spent)} / {fmt$(envelope.budgetAmount)}
          </span>
          <span style={{ color }}>
            {status === 'over'
              ? `Over by ${fmt$(spent - envelope.budgetAmount)}`
              : `${fmt$(remaining)} left`}
          </span>
        </div>
      </div>

      {/* Footer badges */}
      <div className="flex items-center gap-2 flex-wrap">
        {envelope.mappedCategories.map((cat) => (
          <span
            key={cat}
            className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-fg-muted"
          >
            {cat}
          </span>
        ))}
        {envelope.rollover && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent/15 text-accent-text">
            Rollover
          </span>
        )}
      </div>
    </Card>
  );
});

export default EnvelopeCard;
