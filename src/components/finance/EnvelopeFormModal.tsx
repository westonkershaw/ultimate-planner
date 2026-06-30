import { useState, useCallback } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import type { TransactionCategory, CreateEnvelopeInput } from '@/types';

const CATEGORY_OPTIONS: { id: TransactionCategory; label: string }[] = [
  { id: 'housing', label: 'Housing' },
  { id: 'food', label: 'Food' },
  { id: 'transport', label: 'Transport' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'health', label: 'Health' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'other', label: 'Other' },
];

const COLOR_OPTIONS = [
  '#14b8a6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#3b82f6', '#14b8a6', '#f97316', '#64748b',
];

interface EnvelopeFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (input: CreateEnvelopeInput) => void;
  initial?: Partial<CreateEnvelopeInput>;
}

export default function EnvelopeFormModal({
  open,
  onClose,
  onSave,
  initial,
}: EnvelopeFormModalProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [budget, setBudget] = useState(String(initial?.budgetAmount ?? ''));
  const [categories, setCategories] = useState<TransactionCategory[]>(
    initial?.mappedCategories ?? [],
  );
  const [keywords, setKeywords] = useState(initial?.keywords?.join(', ') ?? '');
  const [color, setColor] = useState(initial?.color ?? '#14b8a6');
  const [rollover, setRollover] = useState(initial?.rollover ?? false);

  const toggleCategory = useCallback((cat: TransactionCategory) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }, []);

  const handleSubmit = () => {
    const trimName = name.trim();
    const budgetNum = parseFloat(budget);
    if (!trimName || isNaN(budgetNum) || budgetNum <= 0) return;

    onSave({
      name: trimName,
      budgetAmount: budgetNum,
      mappedCategories: categories,
      keywords: keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
      color,
      rollover,
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit Envelope' : 'New Envelope'}>
      <div className="space-y-4">
        <Input
          label="Envelope Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Groceries"
        />
        <Input
          label="Monthly Budget ($)"
          type="number"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="400"
        />

        {/* Category mapping */}
        <div>
          <div className="text-xs font-semibold text-fg-secondary mb-2">
            Linked Categories
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => toggleCategory(id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  categories.includes(id)
                    ? 'bg-accent/25 text-accent-text border border-accent/40'
                    : 'bg-white/5 text-fg-muted border border-border-strong hover:bg-white/10'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Keywords (comma-separated)"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="starbucks, whole foods"
        />

        {/* Color picker */}
        <div>
          <div className="text-xs font-semibold text-fg-secondary mb-2">Color</div>
          <div className="flex gap-2">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="w-6 h-6 rounded-full transition-transform"
                style={{
                  background: c,
                  outline: color === c ? '2px solid #fff' : 'none',
                  outlineOffset: 2,
                  transform: color === c ? 'scale(1.15)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Rollover toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <button
            type="button"
            role="switch"
            aria-checked={rollover}
            onClick={() => setRollover(!rollover)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              rollover ? 'bg-accent' : 'bg-surface-3'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                rollover ? 'translate-x-5' : ''
              }`}
            />
          </button>
          <span className="text-xs text-fg-secondary">
            Roll unspent budget to next month
          </span>
        </label>

        <div className="flex gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} className="flex-1">
            {initial ? 'Save Changes' : 'Create Envelope'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
