import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';

const EXERCISE_LIBRARY = {
  chest: [
    { name: 'Barbell Bench Press', equipment: 'barbell', type: 'strength' },
    { name: 'Incline Bench Press', equipment: 'barbell', type: 'strength' },
    { name: 'Dumbbell Fly', equipment: 'dumbbell', type: 'strength' },
    { name: 'Cable Fly', equipment: 'cable', type: 'strength' },
    { name: 'Push-Up', equipment: 'bodyweight', type: 'strength' },
    { name: 'Chest Dip', equipment: 'bodyweight', type: 'strength' },
  ],
  back: [
    { name: 'Deadlift', equipment: 'barbell', type: 'strength' },
    { name: 'Barbell Row', equipment: 'barbell', type: 'strength' },
    { name: 'Lat Pulldown', equipment: 'cable', type: 'strength' },
    { name: 'Seated Cable Row', equipment: 'cable', type: 'strength' },
    { name: 'Pull-Up', equipment: 'bodyweight', type: 'strength' },
    { name: 'Face Pull', equipment: 'cable', type: 'strength' },
  ],
  shoulders: [
    { name: 'Overhead Press', equipment: 'barbell', type: 'strength' },
    { name: 'Dumbbell Shoulder Press', equipment: 'dumbbell', type: 'strength' },
    { name: 'Lateral Raise', equipment: 'dumbbell', type: 'strength' },
    { name: 'Arnold Press', equipment: 'dumbbell', type: 'strength' },
    { name: 'Front Raise', equipment: 'dumbbell', type: 'strength' },
    { name: 'Rear Delt Fly', equipment: 'dumbbell', type: 'strength' },
  ],
  legs: [
    { name: 'Barbell Squat', equipment: 'barbell', type: 'strength' },
    { name: 'Leg Press', equipment: 'machine', type: 'strength' },
    { name: 'Romanian Deadlift', equipment: 'barbell', type: 'strength' },
    { name: 'Bulgarian Split Squat', equipment: 'dumbbell', type: 'strength' },
    { name: 'Hip Thrust', equipment: 'barbell', type: 'strength' },
    { name: 'Leg Curl', equipment: 'machine', type: 'strength' },
    { name: 'Calf Raise', equipment: 'machine', type: 'strength' },
  ],
  arms: [
    { name: 'Barbell Curl', equipment: 'barbell', type: 'strength' },
    { name: 'Hammer Curl', equipment: 'dumbbell', type: 'strength' },
    { name: 'Skull Crusher', equipment: 'barbell', type: 'strength' },
    { name: 'Tricep Pushdown', equipment: 'cable', type: 'strength' },
    { name: 'Preacher Curl', equipment: 'barbell', type: 'strength' },
    { name: 'Overhead Tricep Extension', equipment: 'cable', type: 'strength' },
  ],
  core: [
    { name: 'Plank', equipment: 'bodyweight', type: 'core' },
    { name: 'Hanging Leg Raise', equipment: 'bodyweight', type: 'core' },
    { name: 'Ab Wheel Rollout', equipment: 'other', type: 'core' },
    { name: 'Cable Crunch', equipment: 'cable', type: 'core' },
    { name: 'Russian Twist', equipment: 'bodyweight', type: 'core' },
    { name: 'Dead Bug', equipment: 'bodyweight', type: 'core' },
  ],
  cardio: [
    { name: 'Running', equipment: 'none', type: 'cardio' },
    { name: 'Cycling', equipment: 'none', type: 'cardio' },
    { name: 'Rowing Machine', equipment: 'machine', type: 'cardio' },
    { name: 'Jump Rope', equipment: 'other', type: 'cardio' },
    { name: 'HIIT', equipment: 'none', type: 'cardio' },
    { name: 'Stair Climber', equipment: 'machine', type: 'cardio' },
  ],
};

const CATEGORY_COLORS = {
  chest: '#6366f1',
  back: '#10b981',
  shoulders: '#f59e0b',
  legs: '#ef4444',
  arms: '#3b82f6',
  core: '#8b5cf6',
  cardio: '#ec4899',
};

// Muscle group emoji icons for category chips
const CATEGORY_ICONS = {
  chest: '🏋️',
  back: '🔙',
  shoulders: '💪',
  legs: '🦵',
  arms: '💪',
  core: '🎯',
  cardio: '🏃',
};

// Convert exercise name to slug for image path
function exerciseSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// AI-generated exercise images — local files in /exercises/{slug}.png
function getExerciseImage(name) {
  return `/exercises/${exerciseSlug(name)}.png`;
}

// Category fallback images (use a representative exercise per category)

const CATEGORIES = Object.keys(EXERCISE_LIBRARY);

// ── Exercise row (thumbnail card) ─────────────────────────────────────────

function ExerciseRow({ ex, onAdd, onExpand }) {
  const [imgError, setImgError] = useState(false);

  const imgSrc = getExerciseImage(ex.name);
  const accentColor = CATEGORY_COLORS[ex.category] || '#6366f1';
  const addAriaLabel = 'Add ' + ex.name + ' to routine';

  const handleAdd = useCallback(
    (e) => {
      e.stopPropagation();
      onAdd?.({ ...ex, sets: [{ weight: 0, reps: 8, completed: false }] });
    },
    [ex, onAdd],
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onExpand?.(ex);
      }
    },
    [ex, onExpand],
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -4 }}
      whileHover={{ x: 2 }}
      transition={{ duration: 0.12 }}
      className="flex items-center gap-3 px-3 py-2 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] transition-colors cursor-pointer group"
      onClick={() => onExpand?.(ex)}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={ex.name}
    >
      {/* Thumbnail */}
      <div
        className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden"
        aria-hidden="true"
      >
        {!imgError ? (
          <img
            src={imgSrc}
            alt={ex.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-xl"
            style={{ backgroundColor: accentColor + '33' }}
          >
            <span>{CATEGORY_ICONS[ex.category] || '🏋️'}</span>
          </div>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-slate-300 font-medium truncate">{ex.name}</div>
        <div className="text-[10px] text-slate-600 capitalize mt-0.5">
          {ex.equipment} · {ex.category}
        </div>
      </div>

      {/* Add button */}
      <button
        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
        onClick={handleAdd}
        aria-label={addAriaLabel}
        tabIndex={-1}
      >
        <span className="text-lg leading-none" aria-hidden="true">+</span>
      </button>
    </motion.div>
  );
}

// ── ExerciseDetailCard ────────────────────────────────────────────────────

function ExerciseDetailCard({ ex, onAdd, onClose }) {
  const [imgError, setImgError] = useState(false);

  const imgSrc = getExerciseImage(ex.name);
  const accentColor = CATEGORY_COLORS[ex.category] || '#6366f1';
  const categoryIcon = CATEGORY_ICONS[ex.category] || '🏋️';
  const addLabel = 'Add ' + ex.name + ' to routine';
  const badgeBg = accentColor + '33';
  const badgeText = accentColor;

  const handleAdd = useCallback(() => {
    onAdd?.({ ...ex, sets: [{ weight: 0, reps: 8, completed: false }] });
    onClose?.();
  }, [ex, onAdd, onClose]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose?.();
    },
    [onClose],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      className="rounded-2xl border border-white/10 overflow-hidden bg-[#0d0e14]"
      role="dialog"
      aria-label={ex.name + ' detail'}
      onKeyDown={handleKeyDown}
    >
      {/* Hero image */}
      <div className="relative w-full h-40 overflow-hidden">
        {!imgError ? (
          <img
            src={imgSrc}
            alt={ex.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-5xl"
            style={{ backgroundColor: accentColor + '22' }}
          >
            <span>{categoryIcon}</span>
          </div>
        )}
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, #0d0e14 0%, transparent 60%)' }}
          aria-hidden="true"
        />
        {/* Close button */}
        <button
          className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/40 backdrop-blur-sm flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          onClick={onClose}
          aria-label="Close exercise detail"
        >
          <span aria-hidden="true" className="text-sm leading-none">x</span>
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pb-4 -mt-2">
        <div className="text-base font-semibold text-white mb-2">{ex.name}</div>

        {/* Badges */}
        <div className="flex gap-2 mb-4">
          <span
            className="px-2 py-0.5 rounded-md text-[11px] font-medium capitalize"
            style={{ backgroundColor: badgeBg, color: badgeText }}
          >
            {ex.category}
          </span>
          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium capitalize bg-white/[0.06] text-slate-400">
            {ex.equipment}
          </span>
          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium capitalize bg-white/[0.06] text-slate-400">
            {ex.type}
          </span>
        </div>

        {/* CTA */}
        <button
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 active:opacity-75"
          style={{ backgroundColor: accentColor }}
          onClick={handleAdd}
          aria-label={addLabel}
        >
          Add to Routine
        </button>
      </div>
    </motion.div>
  );
}

// ── ExerciseLibrary ───────────────────────────────────────────────────────

/**
 * @param {object}   props
 * @param {function} props.onAdd           Called with the exercise object when user adds it
 * @param {string[]} [props.recentlyUsed]  Array of exercise names used recently (last 5 shown)
 */
const ExerciseLibrary = React.memo(function ExerciseLibrary({ onAdd, recentlyUsed = [] }) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [expanded, setExpanded] = useState(null);

  const handleExpand = useCallback((ex) => {
    setExpanded((prev) => (prev?.name === ex.name ? null : ex));
  }, []);

  const handleCloseExpanded = useCallback(() => {
    setExpanded(null);
  }, []);

  // Build "recently used" exercise objects from all categories
  const recentExercises = useMemo(() => {
    const allExercises = Object.entries(EXERCISE_LIBRARY).flatMap(([cat, exs]) =>
      exs.map((ex) => ({ ...ex, category: cat })),
    );
    return recentlyUsed
      .slice(0, 5)
      .map((name) => allExercises.find((ex) => ex.name === name))
      .filter(Boolean);
  }, [recentlyUsed]);

  const filteredExercises = useMemo(() => {
    const base =
      activeCategory === 'all'
        ? Object.entries(EXERCISE_LIBRARY).flatMap(([cat, exs]) =>
            exs.map((ex) => ({ ...ex, category: cat })),
          )
        : (EXERCISE_LIBRARY[activeCategory] || []).map((ex) => ({
            ...ex,
            category: activeCategory,
          }));

    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(
      (ex) => ex.name.toLowerCase().includes(q) || ex.equipment.includes(q),
    );
  }, [search, activeCategory]);

  const showRecent = recentExercises.length > 0 && !search.trim() && activeCategory === 'all';

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search exercises..."
        className="text-sm"
        aria-label="Search exercises"
      />

      {/* Category filter chips */}
      <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Exercise category filters">
        <button
          onClick={() => setActiveCategory('all')}
          aria-pressed={activeCategory === 'all'}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
            activeCategory === 'all'
              ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/40'
              : 'bg-white/5 text-slate-500 hover:text-slate-300 border border-white/10'
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            aria-pressed={activeCategory === cat}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
              activeCategory === cat
                ? 'text-slate-900 border border-transparent'
                : 'bg-white/5 text-slate-500 hover:text-slate-300 border border-white/10'
            }`}
            style={
              activeCategory === cat
                ? { backgroundColor: CATEGORY_COLORS[cat], borderColor: CATEGORY_COLORS[cat] }
                : {}
            }
          >
            <span aria-hidden="true">{CATEGORY_ICONS[cat]}</span>
            {cat}
          </button>
        ))}
      </div>

      {/* Expanded exercise detail */}
      <AnimatePresence>
        {expanded && (
          <ExerciseDetailCard
            key={expanded.name}
            ex={expanded}
            onAdd={onAdd}
            onClose={handleCloseExpanded}
          />
        )}
      </AnimatePresence>

      {/* Recently Used */}
      <AnimatePresence>
        {showRecent && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-1.5">
              Recently Used
            </div>
            <div className="flex flex-col gap-1 mb-3">
              {recentExercises.map((ex) => (
                <ExerciseRow
                  key={'recent-' + ex.name}
                  ex={ex}
                  onAdd={onAdd}
                  onExpand={handleExpand}
                />
              ))}
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-1.5">
              All Exercises
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exercise list */}
      <div className="flex flex-col gap-1.5 max-h-72 overflow-auto pr-1" role="list">
        <AnimatePresence initial={false}>
          {filteredExercises.map((ex) => (
            <ExerciseRow
              key={ex.category + '-' + ex.name}
              ex={ex}
              onAdd={onAdd}
              onExpand={handleExpand}
            />
          ))}
        </AnimatePresence>
        {filteredExercises.length === 0 && (
          <div className="text-center py-8 text-slate-600 text-sm">No exercises found</div>
        )}
      </div>
    </div>
  );
});

export default ExerciseLibrary;
export { EXERCISE_LIBRARY, CATEGORY_COLORS, CATEGORY_ICONS };
