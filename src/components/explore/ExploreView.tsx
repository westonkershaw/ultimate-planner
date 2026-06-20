import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass,
  Plus,
  MapPin,
  ArrowRight,
  Calendar,
  Users,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import TripDetailView from './TripDetailView';
import TripComparison from './TripComparison';
import { useExploreStore } from '@/store/useExploreStore';
import { formatUsd, calcTripBudgetFromTrip } from '@/utils/travelEngine';
import { APP_SPRING } from '@/hooks/useAppSpring';
import type { SavedTrip } from '@/types';

const ExploreView = React.memo(function ExploreView() {
  const { trips, addTrip, deleteTrip } = useExploreStore();
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [newTripModal, setNewTripModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newFrom, setNewFrom] = useState('');
  const [newTo, setNewTo] = useState('');
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const activeTrip = trips.find((t) => t.id === activeTripId) ?? null;

  const handleCreate = useCallback(() => {
    if (!newName.trim()) return;
    const id = addTrip(newName.trim(), newFrom.trim(), newTo.trim());
    setNewName('');
    setNewFrom('');
    setNewTo('');
    setNewTripModal(false);
    setActiveTripId(id);
  }, [newName, newFrom, newTo, addTrip]);

  const handleDelete = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      deleteTrip(id);
      if (activeTripId === id) setActiveTripId(null);
      setCompareIds((prev) => prev.filter((x) => x !== id));
    },
    [deleteTrip, activeTripId],
  );

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }, []);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <AnimatePresence mode="wait">
        {activeTrip ? (
          <TripDetailView
            key={activeTrip.id}
            trip={activeTrip}
            onBack={() => setActiveTripId(null)}
          />
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
                  <Compass size={20} className="text-indigo-400" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-100 tracking-tight">Travel Planner</h1>
                  <p className="text-xs text-slate-500">Plan trips, calculate costs, and compare budgets</p>
                </div>
              </div>
              <Button size="sm" onClick={() => setNewTripModal(true)}>
                <Plus size={14} /> New Trip
              </Button>
            </div>

            {trips.length === 0 ? (
              <EmptyState onCreate={() => setNewTripModal(true)} />
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                  {trips.map((trip) => (
                    <TripCard key={trip.id} trip={trip}
                      onClick={() => setActiveTripId(trip.id)}
                      onDelete={(e) => handleDelete(e, trip.id)} />
                  ))}
                </div>
                <TripComparison trips={trips} selectedIds={compareIds}
                  onToggle={toggleCompare} onClear={() => setCompareIds([])} />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Modal open={newTripModal} onClose={() => setNewTripModal(false)} title="New Trip">
        <div className="space-y-3">
          <Input label="Trip Name" value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Spring Break Road Trip" autoFocus />
          <Input label="From" value={newFrom} onChange={(e) => setNewFrom(e.target.value)}
            placeholder="e.g. Salt Lake City, UT" icon={<MapPin size={14} />} />
          <Input label="To" value={newTo} onChange={(e) => setNewTo(e.target.value)}
            placeholder="e.g. Denver, CO" icon={<MapPin size={14} />} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setNewTripModal(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} disabled={!newName.trim()}>Create Trip</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
});

function TripCard({ trip, onClick, onDelete }: {
  trip: SavedTrip; onClick: () => void; onDelete: (e: React.MouseEvent) => void;
}) {
  const budget = calcTripBudgetFromTrip(trip);
  const hasRoute = trip.fromLocation && trip.toLocation;

  return (
    <Card hover onClick={onClick} className="p-4 group">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-100 truncate">{trip.name}</h3>
          {hasRoute && (
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
              <MapPin size={10} className="flex-shrink-0" />
              <span className="truncate">{trip.fromLocation}</span>
              <ArrowRight size={8} className="flex-shrink-0 text-slate-700" />
              <span className="truncate">{trip.toLocation}</span>
            </p>
          )}
        </div>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} transition={APP_SPRING}
          onClick={onDelete}
          className="p-1.5 rounded-lg text-slate-700 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Delete trip">
          <Trash2 size={12} />
        </motion.button>
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
        <span className="flex items-center gap-1"><Calendar size={10} /> {trip.days}d / {trip.nights}n</span>
        <span className="flex items-center gap-1"><Users size={10} /> {trip.people}</span>
        {trip.distanceMiles > 0 && (
          <span className="flex items-center gap-1"><MapPin size={10} /> {Math.round(trip.distanceMiles)} mi</span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-indigo-300">
          {budget.total > 0 ? formatUsd(budget.total) : 'No estimate'}
        </span>
        <ChevronRight size={14} className="text-slate-700 group-hover:text-slate-500 transition-colors" />
      </div>
    </Card>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className="flex flex-col items-center gap-4 py-20">
      <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
        <Compass size={28} className="text-indigo-500/60" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-slate-300">No trips planned yet</p>
        <p className="text-xs text-slate-600 mt-1">Create a trip to calculate fuel, food, accommodation, and total costs</p>
      </div>
      <Button size="sm" onClick={onCreate}><Plus size={14} /> Plan a Trip</Button>
    </motion.div>
  );
}

export default ExploreView;
