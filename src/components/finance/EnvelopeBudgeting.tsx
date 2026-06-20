import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import EnvelopeCard from './EnvelopeCard';
import EnvelopeFormModal from './EnvelopeFormModal';
import { useFinanceStore } from '@/store';
import { calcAllEnvelopesReport } from '@/utils/envelopeEngine';
import { fmt$ } from '@/utils/financeEngine';
import type { CreateEnvelopeInput } from '@/types';

export default function EnvelopeBudgeting() {
  const {
    envelopes,
    transactions,
    addEnvelope,
    updateEnvelope,
    deleteEnvelope,
  } = useFinanceStore();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const report = useMemo(
    () => calcAllEnvelopesReport(envelopes, transactions),
    [envelopes, transactions],
  );

  const totalBudget = envelopes.reduce((s, e) => s + e.budgetAmount, 0);
  const totalSpent = report.reduce((s, r) => s + r.spent, 0);
  const onTrackCount = report.filter((r) => r.status !== 'over').length;

  const handleSave = useCallback(
    (input: CreateEnvelopeInput) => {
      if (editId) {
        updateEnvelope(editId, input);
        setEditId(null);
      } else {
        addEnvelope(input);
      }
    },
    [editId, addEnvelope, updateEnvelope],
  );

  const handleEdit = useCallback((id: string) => {
    setEditId(id);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      deleteEnvelope(id);
    },
    [deleteEnvelope],
  );

  const editingEnvelope = editId
    ? envelopes.find((e) => e.id === editId)
    : undefined;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-100">
            Envelope Budgets
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Allocate fixed amounts per category and track spending
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setEditId(null);
            setShowForm(true);
          }}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add Envelope
        </Button>
      </div>

      {/* Summary strip */}
      {envelopes.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Total Budget', value: fmt$(totalBudget), color: '#6366f1' },
            { label: 'Total Spent', value: fmt$(totalSpent), color: '#f59e0b' },
            {
              label: 'On Track',
              value: `${onTrackCount}/${envelopes.length}`,
              color: '#10b981',
            },
          ].map((s) => (
            <Card key={s.label} className="p-3 text-center">
              <div
                className="text-lg font-bold"
                style={{ color: s.color }}
              >
                {s.value}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {s.label}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Envelope grid */}
      {envelopes.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-2xl mb-2">
            <span role="img" aria-hidden>&#x1F4E6;</span>
          </div>
          <div className="text-sm font-semibold text-slate-300 mb-1">
            No envelopes yet
          </div>
          <div className="text-xs text-slate-500 max-w-xs mx-auto">
            Create spending envelopes to allocate fixed budgets per category.
            Track exactly where your money goes each month.
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AnimatePresence mode="popLayout">
            {envelopes.map((env) => (
              <motion.div
                key={env.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                <EnvelopeCard
                  envelope={env}
                  transactions={transactions}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Form modal */}
      <EnvelopeFormModal
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditId(null);
        }}
        onSave={handleSave}
        initial={editingEnvelope ? {
          name: editingEnvelope.name,
          budgetAmount: editingEnvelope.budgetAmount,
          mappedCategories: editingEnvelope.mappedCategories,
          keywords: editingEnvelope.keywords,
          color: editingEnvelope.color,
          rollover: editingEnvelope.rollover,
        } : undefined}
      />
    </div>
  );
}
