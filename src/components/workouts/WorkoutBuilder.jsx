import React, { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import ExerciseLibrary from './ExerciseLibrary';
import { useWorkoutStore } from '../../store';

function SortableExercise({ ex, index, onRemove, onUpdateSet, onAddSet, onRemoveSet }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ex.id || ex.name });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-3">
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 px-1 flex-shrink-0"
          >
            ⠿
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-200">{ex.name}</div>
            <div className="text-[10px] text-slate-600 capitalize">{ex.equipment} · {ex.category}</div>
          </div>
          <button
            onClick={() => onRemove(index)}
            className="text-slate-600 hover:text-red-400 transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Sets */}
        <div className="space-y-1.5">
          <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 text-[10px] text-slate-600 px-1 mb-1">
            <span
              className="cursor-help"
              title="A set is one group of consecutive repetitions. e.g. 3 sets means you do the exercise 3 separate times with a rest in between."
            >
              SET ?
            </span>
            <span
              className="cursor-help"
              title="The amount of weight to lift. Leave blank or enter 0 to track bodyweight or unweighted exercises."
            >
              WEIGHT (lb) ?
            </span>
            <span
              className="cursor-help"
              title="Reps (repetitions) = how many times you perform the movement in one set. e.g. 8 reps means lift 8 times in a row."
            >
              REPS ?
            </span>
            <span></span>
          </div>
          {ex.sets.map((set, si) => (
            <div key={si} className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center">
              <span className="text-xs text-slate-600 w-6 text-center font-mono">{si + 1}</span>
              <input
                type="number"
                value={set.weight || ''}
                onChange={(e) => onUpdateSet(index, si, 'weight', e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-white/10 bg-[#0a1120]/80 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500/60"
              />
              <input
                type="number"
                value={set.reps || ''}
                onChange={(e) => onUpdateSet(index, si, 'reps', e.target.value)}
                placeholder="8"
                className="w-full rounded-lg border border-white/10 bg-[#0a1120]/80 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500/60"
              />
              <button
                onClick={() => onRemoveSet(index, si)}
                className="text-slate-700 hover:text-red-400 transition-colors text-xs"
                disabled={ex.sets.length <= 1}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={() => onAddSet(index)}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors mt-1"
          >
            + Add Set
          </button>
        </div>
      </Card>
    </div>
  );
}

const WorkoutBuilder = React.memo(function WorkoutBuilder({ editingRoutine, onClose }) {
  const { addRoutine, updateRoutine } = useWorkoutStore();
  const [name, setName] = useState(editingRoutine?.name || '');
  const [exercises, setExercises] = useState(
    editingRoutine?.exercises?.map((ex) => ({ ...ex, id: ex.id || ex.name })) || []
  );
  const [showLibrary, setShowLibrary] = useState(false);
  const [nameError, setNameError] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setExercises((items) => {
        const oldIndex = items.findIndex((i) => (i.id || i.name) === active.id);
        const newIndex = items.findIndex((i) => (i.id || i.name) === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const addExercise = useCallback((ex) => {
    const uid = () => Math.random().toString(36).slice(2, 9);
    setExercises((prev) => [...prev, { ...ex, id: uid(), sets: [{ weight: '', reps: 8 }] }]);
  }, []);

  const removeExercise = useCallback((index) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateSet = useCallback((exIndex, setIndex, field, value) => {
    setExercises((prev) =>
      prev.map((ex, ei) =>
        ei === exIndex
          ? {
              ...ex,
              sets: ex.sets.map((s, si) =>
                si === setIndex ? { ...s, [field]: value } : s
              ),
            }
          : ex
      )
    );
  }, []);

  const addSet = useCallback((exIndex) => {
    setExercises((prev) =>
      prev.map((ex, ei) =>
        ei === exIndex
          ? { ...ex, sets: [...ex.sets, { weight: ex.sets.at(-1)?.weight || '', reps: ex.sets.at(-1)?.reps || 8 }] }
          : ex
      )
    );
  }, []);

  const removeSet = useCallback((exIndex, setIndex) => {
    setExercises((prev) =>
      prev.map((ex, ei) =>
        ei === exIndex
          ? { ...ex, sets: ex.sets.filter((_, si) => si !== setIndex) }
          : ex
      )
    );
  }, []);

  const save = useCallback(() => {
    if (!name.trim()) { setNameError('Routine name is required'); return; }
    const routine = { name: name.trim(), exercises };
    if (editingRoutine) {
      updateRoutine(editingRoutine.id, routine);
    } else {
      addRoutine(routine);
    }
    onClose?.();
  }, [name, exercises, editingRoutine, addRoutine, updateRoutine, onClose]);

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="Routine Name"
        value={name}
        onChange={(e) => { setName(e.target.value); setNameError(''); }}
        placeholder="e.g. Upper Body Push"
        error={nameError}
      />

      {/* Exercises */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Exercises ({exercises.length})
          </span>
          <Button variant="ghost" size="sm" onClick={() => setShowLibrary(true)}>
            + Add Exercise
          </Button>
        </div>

        {exercises.length === 0 && (
          <div
            className="rounded-xl border border-dashed border-white/10 py-8 text-center text-slate-600 text-sm cursor-pointer hover:border-indigo-500/30 transition-colors"
            onClick={() => setShowLibrary(true)}
          >
            No exercises yet. Click to add from the library.
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={exercises.map((ex) => ex.id || ex.name)}
            strategy={verticalListSortingStrategy}
          >
            {exercises.map((ex, i) => (
              <SortableExercise
                key={ex.id || `${ex.name}-${i}`}
                ex={ex}
                index={i}
                onRemove={removeExercise}
                onUpdateSet={updateSet}
                onAddSet={addSet}
                onRemoveSet={removeSet}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={save} className="flex-1">
          {editingRoutine ? 'Save Changes' : 'Create Routine'}
        </Button>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
      </div>

      {/* Exercise Library Modal */}
      <Modal open={showLibrary} onClose={() => setShowLibrary(false)} title="Exercise Library">
        <ExerciseLibrary
          onAdd={(ex) => {
            addExercise(ex);
            setShowLibrary(false);
          }}
        />
      </Modal>
    </div>
  );
});

export default WorkoutBuilder;
