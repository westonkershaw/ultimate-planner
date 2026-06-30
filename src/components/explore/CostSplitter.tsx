import React, { useState, useCallback } from 'react';
import { Users, Plus, X, ArrowUpRight, ArrowDownRight, UserPlus } from 'lucide-react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { calcCostSplit, formatUsd } from '@/utils/travelEngine';
import type { SplitPerson } from '@/types';

interface CostSplitterProps {
  totalCost: number;
  people: SplitPerson[];
  tripPeopleCount: number;
  onAdd: (name: string) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<SplitPerson>) => void;
}

const CostSplitter = React.memo(function CostSplitter({
  totalCost, people, tripPeopleCount, onAdd, onRemove, onUpdate,
}: CostSplitterProps) {
  const [newName, setNewName] = useState('');
  const split = calcCostSplit(totalCost, people);

  const handleAdd = useCallback(() => {
    if (!newName.trim()) return;
    onAdd(newName.trim());
    setNewName('');
  }, [newName, onAdd]);

  const handleQuickFill = useCallback(() => {
    const existing = people.length;
    for (let i = existing + 1; i <= tripPeopleCount; i++) {
      onAdd(`Person ${i}`);
    }
  }, [people.length, tripPeopleCount, onAdd]);

  const canQuickFill = tripPeopleCount > people.length;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Users size={16} className="text-cyan-400" />
        <h3 className="text-sm font-semibold text-fg-secondary">Split Costs</h3>
        {people.length > 0 && (
          <span className="ml-auto text-xs text-fg-muted">{formatUsd(split.perPerson)}/person</span>
        )}
      </div>

      {/* Quick fill from trip people count */}
      {canQuickFill && (
        <button onClick={handleQuickFill}
          className="flex items-center gap-2 w-full mb-3 px-3 py-2 rounded-xl bg-cyan-500/8 border border-cyan-500/15 text-xs text-cyan-400 hover:bg-cyan-500/15 transition-colors">
          <UserPlus size={12} />
          Quick add {tripPeopleCount - people.length} {tripPeopleCount - people.length === 1 ? 'person' : 'people'} (from trip)
        </button>
      )}

      {people.length > 0 && (
        <div className="space-y-2 mb-3">
          {split.balances.map((b, i) => {
            const person = people[i];
            if (!person) return null;
            const isPositive = b.balance > 0;
            const isNegative = b.balance < 0;
            return (
              <div key={person.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-xs font-medium text-fg-secondary flex-1 truncate">{person.name}</span>
                <Input containerClassName="w-24" type="number" min={0} step={10}
                  value={person.paid || ''} placeholder="Paid $"
                  onChange={(e) => onUpdate(person.id, { paid: parseFloat(e.target.value) || 0 })} />
                <div className={`flex items-center gap-1 w-20 justify-end text-xs font-semibold ${
                  isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-fg-muted'
                }`}>
                  {isPositive && <ArrowUpRight size={10} />}
                  {isNegative && <ArrowDownRight size={10} />}
                  {formatUsd(Math.abs(b.balance))}
                </div>
                <button onClick={() => onRemove(person.id)}
                  className="text-fg-faint hover:text-red-400 transition-colors"><X size={12} /></button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <Input containerClassName="flex-1" placeholder="Person name" value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }} />
        <Button variant="ghost" size="sm" onClick={handleAdd} disabled={!newName.trim()}>
          <Plus size={14} />
        </Button>
      </div>

      {people.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5 text-[10px] text-fg-muted">
          <ArrowUpRight size={8} className="inline text-emerald-400" /> gets back &middot;{' '}
          <ArrowDownRight size={8} className="inline text-red-400" /> owes the group
        </div>
      )}
    </Card>
  );
});

export default CostSplitter;
