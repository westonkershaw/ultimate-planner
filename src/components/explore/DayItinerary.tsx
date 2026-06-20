import React, { useCallback } from 'react';
import { CalendarDays, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { formatUsd } from '@/utils/travelEngine';
import type { ItineraryDay, ItineraryBlock } from '@/types';

interface DayItineraryProps {
  itinerary: ItineraryDay[];
  onAddDay: () => void;
  onRemoveDay: (dayId: string) => void;
  onAddBlock: (dayId: string) => void;
  onUpdateBlock: (dayId: string, blockId: string, updates: Partial<ItineraryBlock>) => void;
  onRemoveBlock: (dayId: string, blockId: string) => void;
}

const DayItinerary = React.memo(function DayItinerary({
  itinerary, onAddDay, onRemoveDay, onAddBlock, onUpdateBlock, onRemoveBlock,
}: DayItineraryProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-violet-400" />
          <h3 className="text-sm font-semibold text-slate-200">Day-by-Day Itinerary</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onAddDay}><Plus size={12} /> Add Day</Button>
      </div>

      {itinerary.length === 0 ? (
        <p className="text-xs text-slate-600 text-center py-4">Add days to plan your itinerary</p>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {itinerary.map((day) => (
              <DayCard key={day.id} day={day} onRemoveDay={onRemoveDay}
                onAddBlock={onAddBlock} onUpdateBlock={onUpdateBlock} onRemoveBlock={onRemoveBlock} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </Card>
  );
});

function DayCard({ day, onRemoveDay, onAddBlock, onUpdateBlock, onRemoveBlock }: {
  day: ItineraryDay;
  onRemoveDay: (id: string) => void;
  onAddBlock: (dayId: string) => void;
  onUpdateBlock: (dayId: string, blockId: string, u: Partial<ItineraryBlock>) => void;
  onRemoveBlock: (dayId: string, blockId: string) => void;
}) {
  const dayTotal = day.blocks.reduce((s, b) => s + b.cost, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
      className="rounded-xl bg-white/[0.02] border border-white/5 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-violet-400">Day {day.dayNumber}</span>
          {dayTotal > 0 && <span className="text-[10px] text-slate-500">{formatUsd(dayTotal)}</span>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onAddBlock(day.id)}
            className="text-slate-600 hover:text-violet-400 transition-colors p-1"><Plus size={12} /></button>
          <button onClick={() => onRemoveDay(day.id)}
            className="text-slate-600 hover:text-red-400 transition-colors p-1"><X size={12} /></button>
        </div>
      </div>

      {day.blocks.length === 0 ? (
        <button onClick={() => onAddBlock(day.id)}
          className="w-full py-2 text-xs text-slate-600 border border-dashed border-slate-800 rounded-lg hover:text-slate-400 hover:border-slate-700 transition-colors">
          + Add activity
        </button>
      ) : (
        <div className="space-y-1.5">
          {day.blocks.map((block) => (
            <BlockRow key={block.id} dayId={day.id} block={block}
              onUpdate={onUpdateBlock} onRemove={onRemoveBlock} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function BlockRow({ dayId, block, onUpdate, onRemove }: {
  dayId: string; block: ItineraryBlock;
  onUpdate: (dayId: string, blockId: string, u: Partial<ItineraryBlock>) => void;
  onRemove: (dayId: string, blockId: string) => void;
}) {
  const handleUpdate = useCallback(
    (u: Partial<ItineraryBlock>) => onUpdate(dayId, block.id, u),
    [dayId, block.id, onUpdate],
  );

  return (
    <div className="flex items-center gap-2">
      <input type="time" value={block.time} onChange={(e) => handleUpdate({ time: e.target.value })}
        className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 w-20 outline-none focus:border-indigo-500/50" />
      <input value={block.title} onChange={(e) => handleUpdate({ title: e.target.value })}
        placeholder="Activity..." className="flex-1 bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-700" />
      <input type="number" min={0} step={5} value={block.cost || ''}
        onChange={(e) => handleUpdate({ cost: parseFloat(e.target.value) || 0 })}
        placeholder="$" className="w-16 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 outline-none text-right focus:border-indigo-500/50" />
      <button onClick={() => onRemove(dayId, block.id)}
        className="text-slate-700 hover:text-red-400 transition-colors"><X size={10} /></button>
    </div>
  );
}

export default DayItinerary;
