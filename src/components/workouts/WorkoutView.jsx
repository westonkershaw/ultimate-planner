import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import WorkoutBuilder from './WorkoutBuilder';
import SessionMode from './SessionMode';
import { useWorkoutStore } from '../../store';
import {
  calcWeeklyVolumeTrend,
  calcPRBoard,
  calcFrequencyGrid,
  calcStrengthStandards,
  calcMuscleGroupBalance,
  calcPRTimeline,
  calcWorkoutRecommendation,
  calc7DayDailyVolume,
} from '../../utils/math';

const TABS = ['routines', 'history', 'progress'];

// ── Beginner starter template ──────────────────────────────────────────────
// Pre-seeds a full-body routine so a brand-new user can start in 2 taps.
const STARTER_TEMPLATE = {
  name: 'Full Body Starter',
  exercises: [
    { name: 'Bench Press', category: 'chest', equipment: 'barbell', sets: [{ weight: '', reps: 8 }, { weight: '', reps: 8 }, { weight: '', reps: 8 }] },
    { name: 'Squat',       category: 'legs',  equipment: 'barbell', sets: [{ weight: '', reps: 8 }, { weight: '', reps: 8 }, { weight: '', reps: 8 }] },
    { name: 'Deadlift',    category: 'back',  equipment: 'barbell', sets: [{ weight: '', reps: 5 }, { weight: '', reps: 5 }, { weight: '', reps: 5 }] },
  ],
};

// ── Pre-built workout templates ───────────────────────────────────────────

const s = (weight, reps, count = 3) =>
  Array.from({ length: count }, () => ({ weight, reps }));

const WORKOUT_TEMPLATES = [
  {
    id: 'tpl-push',
    name: 'Push Day',
    icon: '💪',
    description: 'Chest, shoulders, and triceps. Classic push-focused session for upper body pressing strength and hypertrophy.',
    level: 'Intermediate',
    routines: [
      {
        name: 'Push Day (Chest/Shoulders/Triceps)',
        exercises: [
          { name: 'Bench Press',      sets: s(0, 8, 4) },
          { name: 'Overhead Press',   sets: s(0, 10, 3) },
          { name: 'Incline DB Press', sets: s(0, 10, 3) },
          { name: 'Lateral Raises',   sets: s(0, 15, 3) },
          { name: 'Tricep Pushdowns', sets: s(0, 12, 3) },
          { name: 'Dips',             sets: s(0, 10, 3) },
        ],
      },
    ],
  },
  {
    id: 'tpl-pull',
    name: 'Pull Day',
    icon: '🏋️',
    description: 'Back and biceps. Heavy pulls paired with isolation curls for a complete posterior chain session.',
    level: 'Intermediate',
    routines: [
      {
        name: 'Pull Day (Back/Biceps)',
        exercises: [
          { name: 'Deadlift',     sets: s(0, 8, 4) },
          { name: 'Barbell Row',  sets: s(0, 10, 3) },
          { name: 'Pull-ups',     sets: s(0, 8, 3) },
          { name: 'Face Pulls',   sets: s(0, 15, 3) },
          { name: 'Barbell Curl', sets: s(0, 10, 3) },
          { name: 'Hammer Curl',  sets: s(0, 12, 3) },
        ],
      },
    ],
  },
  {
    id: 'tpl-legs',
    name: 'Leg Day',
    icon: '🦵',
    description: 'Quads, hamstrings, and calves. Compound movements plus targeted isolation for complete leg development.',
    level: 'Intermediate',
    routines: [
      {
        name: 'Leg Day',
        exercises: [
          { name: 'Squat',                sets: s(0, 8, 4) },
          { name: 'Romanian Deadlift',    sets: s(0, 10, 3) },
          { name: 'Leg Press',            sets: s(0, 12, 3) },
          { name: 'Leg Curl',             sets: s(0, 12, 3) },
          { name: 'Calf Raises',          sets: s(0, 15, 4) },
          { name: 'Bulgarian Split Squat', sets: s(0, 10, 3) },
        ],
      },
    ],
  },
  {
    id: 'tpl-upper',
    name: 'Upper Body',
    icon: '🔄',
    description: 'Balanced upper body session hitting chest, back, shoulders, and arms in a single workout.',
    level: 'Intermediate',
    routines: [
      {
        name: 'Upper Body',
        exercises: [
          { name: 'Bench Press',      sets: s(0, 8, 4) },
          { name: 'Barbell Row',      sets: s(0, 10, 3) },
          { name: 'Overhead Press',   sets: s(0, 10, 3) },
          { name: 'Pull-ups',         sets: s(0, 8, 3) },
          { name: 'Dumbbell Curl',    sets: s(0, 12, 3) },
          { name: 'Tricep Extension', sets: s(0, 12, 3) },
        ],
      },
    ],
  },
  {
    id: 'tpl-lower',
    name: 'Lower Body',
    icon: '⚡',
    description: 'Complete lower body workout with squats, deadlifts, and accessories for strength and size.',
    level: 'Intermediate',
    routines: [
      {
        name: 'Lower Body',
        exercises: [
          { name: 'Squat',      sets: s(0, 8, 4) },
          { name: 'Deadlift',   sets: s(0, 8, 3) },
          { name: 'Lunges',     sets: s(0, 10, 3) },
          { name: 'Leg Press',  sets: s(0, 12, 3) },
          { name: 'Leg Curl',   sets: s(0, 12, 3) },
          { name: 'Calf Raises', sets: s(0, 15, 4) },
        ],
      },
    ],
  },
  {
    id: 'tpl-fullbody',
    name: 'Full Body',
    icon: '🤸',
    description: 'Hit every major muscle group in one session. Six compound movements for maximum efficiency.',
    level: 'Beginner',
    routines: [
      {
        name: 'Full Body',
        exercises: [
          { name: 'Squat',          sets: s(0, 8, 4) },
          { name: 'Bench Press',    sets: s(0, 8, 3) },
          { name: 'Barbell Row',    sets: s(0, 10, 3) },
          { name: 'Overhead Press', sets: s(0, 10, 3) },
          { name: 'Deadlift',       sets: s(0, 8, 3) },
          { name: 'Pull-ups',       sets: s(0, 8, 3) },
        ],
      },
    ],
  },
  {
    id: 'tpl-core',
    name: 'Core & Abs',
    icon: '🎯',
    description: 'Dedicated core session targeting abs, obliques, and deep stabilizers for a strong midsection.',
    level: 'Beginner',
    routines: [
      {
        name: 'Core & Abs',
        exercises: [
          { name: 'Plank',             sets: s(0, 45, 3) },
          { name: 'Russian Twist',     sets: s(0, 15, 3) },
          { name: 'Hanging Leg Raise', sets: s(0, 12, 3) },
          { name: 'Ab Wheel',          sets: s(0, 10, 3) },
          { name: 'Cable Crunch',      sets: s(0, 15, 3) },
          { name: 'Side Plank',        sets: s(0, 30, 3) },
        ],
      },
    ],
  },
  {
    id: 'tpl-hiit',
    name: 'HIIT Cardio',
    icon: '⏱️',
    description: 'High-intensity interval training. Explosive movements to torch calories and build conditioning.',
    level: 'Advanced',
    routines: [
      {
        name: 'HIIT Cardio',
        exercises: [
          { name: 'Burpees',           sets: s(0, 12, 3) },
          { name: 'Mountain Climbers', sets: s(0, 15, 3) },
          { name: 'Jump Squats',       sets: s(0, 15, 3) },
          { name: 'High Knees',        sets: s(0, 15, 3) },
          { name: 'Box Jumps',         sets: s(0, 10, 3) },
          { name: 'Battle Ropes',      sets: s(0, 12, 3) },
        ],
      },
    ],
  },
];

// ── Template Library Component ───────────────────────────────────────────

const LEVEL_BADGE = {
  Beginner:     { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.25)' },
  Intermediate: { color: '#eab308', bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.25)' },
  Advanced:     { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)' },
};

function TemplateLibrary({ onImport, onClose }) {
  const handleImport = useCallback(
    (template) => {
      onImport(template);
    },
    [onImport],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-syne text-lg font-bold text-fg">Template Library</div>
          <div className="text-xs text-fg-muted">Popular programs ready to import</div>
        </div>
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-xs text-fg-muted hover:text-fg-secondary rounded-lg hover:bg-white/[0.05] transition-colors"
        >
          Back
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {WORKOUT_TEMPLATES.map((tpl, i) => {
          const badge = LEVEL_BADGE[tpl.level] || LEVEL_BADGE.Beginner;
          const totalExercises = tpl.routines.reduce((a, r) => a + r.exercises.length, 0);

          return (
            <motion.div
              key={tpl.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="p-4" hover>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl flex-shrink-0" aria-hidden="true">{tpl.icon}</span>
                    <div className="font-syne text-sm font-bold text-fg truncate">{tpl.name}</div>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      color: badge.color,
                      backgroundColor: badge.bg,
                      border: '1px solid ' + badge.border,
                    }}
                  >
                    {tpl.level}
                  </span>
                </div>

                <p className="text-[11px] text-fg-muted leading-relaxed mb-3">{tpl.description}</p>

                <div className="flex items-center gap-3 text-[10px] text-fg-faint mb-3">
                  <span>{tpl.routines.length} routine{tpl.routines.length !== 1 ? 's' : ''}</span>
                  <span className="text-fg-faint">·</span>
                  <span>{totalExercises} exercises</span>
                </div>

                <div className="flex gap-1.5 flex-wrap mb-4">
                  {tpl.routines.map((r) => (
                    <span
                      key={r.name}
                      className="text-[10px] text-fg-muted bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-lg"
                    >
                      {r.name}
                    </span>
                  ))}
                </div>

                <Button onClick={() => handleImport(tpl)} className="w-full" size="sm">
                  Import {tpl.routines.length > 1 ? tpl.routines.length + ' Routines' : 'Routine'}
                </Button>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function RoutineCard({ routine, onStart, onEdit, onDelete }) {
  const totalSets = routine.exercises?.reduce((a, ex) => a + (ex.sets?.length || 0), 0) || 0;
  const duration = totalSets * 2;

  return (
    <Card className="p-4" hover>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="font-syne text-base font-bold text-fg truncate">{routine.name}</div>
          <div className="text-xs text-fg-faint mt-0.5">
            {routine.exercises?.length || 0} exercises · {totalSets} sets · ~{duration}m
          </div>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <button
            onClick={() => onEdit(routine)}
            className="p-1.5 rounded-lg text-fg-faint hover:text-fg-secondary hover:bg-white/[0.05] transition-colors text-xs"
            aria-label={`Edit ${routine.name}`}
          >
            ✏
          </button>
          <button
            onClick={() => onDelete(routine.id)}
            className="p-1.5 rounded-lg text-fg-faint hover:text-red-400 hover:bg-red-500/5 transition-colors text-xs"
            aria-label={`Delete ${routine.name}`}
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap mb-4">
        {routine.exercises?.slice(0, 4).map((ex, i) => (
          <span key={i} className="text-[10px] text-fg-muted bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-lg">
            {ex.name}
          </span>
        ))}
        {(routine.exercises?.length || 0) > 4 && (
          <span className="text-[10px] text-fg-faint px-2 py-0.5">
            +{routine.exercises.length - 4} more
          </span>
        )}
      </div>

      <Button onClick={() => onStart(routine)} className="w-full" size="sm">
        Start Workout
      </Button>
    </Card>
  );
}

// ── Volume Trend Bar Chart ─────────────────────────────────────────────────

function VolumeTrendChart({ sessions }) {
  const weeks = useMemo(() => calcWeeklyVolumeTrend(sessions), [sessions]);
  const maxVol = useMemo(() => Math.max(...weeks.map((w) => w.volume), 1), [weeks]);

  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-fg-muted mb-3">
        Weekly Volume (lbs)
      </div>
      <div className="flex items-end gap-1.5 h-24" role="img" aria-label="Weekly volume trend bar chart">
        {weeks.map((week, i) => {
          const heightPct = maxVol > 0 ? (week.volume / maxVol) * 100 : 0;
          const isCurrentWeek = i === weeks.length - 1;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full relative" style={{ height: 80 }}>
                <motion.div
                  className="absolute bottom-0 left-0 right-0 rounded-t-sm"
                  style={{
                    background: isCurrentWeek
                      ? 'rgba(45, 212, 191,0.8)'
                      : 'rgba(45, 212, 191,0.3)',
                  }}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(heightPct, week.volume > 0 ? 4 : 0)}%` }}
                  transition={{ type: 'spring', stiffness: 200, damping: 30, delay: i * 0.04 }}
                />
              </div>
              <div className="text-[9px] text-fg-faint truncate w-full text-center">
                {week.weekLabel.split(' ')[1]}
              </div>
            </div>
          );
        })}
      </div>
      {weeks.every((w) => w.volume === 0) && (
        <div className="text-center text-xs text-fg-faint mt-2">
          Complete workouts to see volume trend
        </div>
      )}
    </div>
  );
}

// ── PR Board ──────────────────────────────────────────────────────────────

function PRBoard({ sessions }) {
  const prs = useMemo(() => calcPRBoard(sessions, 3), [sessions]);

  if (prs.length === 0) {
    return (
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-fg-muted mb-3">
          Personal Records
        </div>
        <div className="text-center py-4 text-xs text-fg-faint">
          Log workouts to see your PRs
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-fg-muted mb-3">
        Personal Records
      </div>
      <div className="space-y-2">
        {prs.map((pr, i) => (
          <motion.div
            key={pr.exerciseName}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02]"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base" aria-hidden="true">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
              </span>
              <div>
                <div className="text-sm font-medium text-fg-secondary truncate max-w-[160px]">
                  {pr.exerciseName}
                </div>
                <div className="text-[10px] text-fg-faint">
                  {pr.bestWeight} lbs × {pr.repsAtBest} reps
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-syne text-base font-bold text-amber-400">{pr.epley1RM}</div>
              <div
                className="text-[9px] text-fg-faint uppercase tracking-wider cursor-help"
                title="Estimated One Rep Max — the maximum weight you could lift for a single rep, calculated from your best set"
              >
                est. 1RM ?
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Frequency Grid ────────────────────────────────────────────────────────

function FrequencyGrid({ sessions }) {
  const cells = useMemo(() => calcFrequencyGrid(sessions), [sessions]);
  const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  // 28 cells = 4 weeks × 7 days; render as 7 rows × 4 cols
  const rows = useMemo(() => {
    const result = [];
    for (let day = 0; day < 7; day++) {
      result.push(cells.filter((_, i) => i % 7 === day));
    }
    return result;
  }, [cells]);

  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-fg-muted mb-3">
        4-Week Activity
      </div>
      <div className="flex gap-1 items-start" role="img" aria-label="4-week workout frequency grid">
        {/* Day labels */}
        <div className="flex flex-col gap-1 mr-1">
          {DAY_LABELS.map((label, i) => (
            <div key={i} className="h-5 w-4 flex items-center justify-center text-[9px] text-fg-faint">
              {label}
            </div>
          ))}
        </div>
        {/* Grid: 4 columns (weeks), 7 rows (days) */}
        <div className="flex gap-1">
          {Array.from({ length: 4 }, (_, col) => (
            <div key={col} className="flex flex-col gap-1">
              {rows.map((row, day) => {
                const cell = row[col];
                if (!cell) return null;
                return (
                  <motion.div
                    key={cell.dateStr}
                    title={`${cell.dateStr}${cell.worked ? ' — workout logged' : ''}`}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: (col * 7 + day) * 0.01 }}
                    className="w-5 h-5 rounded-sm"
                    style={{
                      backgroundColor: cell.worked
                        ? 'rgba(45, 212, 191,0.85)'
                        : 'rgba(255,255,255,0.05)',
                      border: cell.worked
                        ? '1px solid rgba(45, 212, 191,0.5)'
                        : '1px solid rgba(255,255,255,0.06)',
                    }}
                    aria-label={`${cell.dateStr}: ${cell.worked ? 'worked out' : 'rest day'}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Strength Standards Card ────────────────────────────────────────────────

const LEVEL_COLORS = {
  untrained:    '#64748b',
  beginner:     '#64748b',
  novice:       '#ef4444',
  intermediate: '#eab308',
  advanced:     '#22c55e',
  elite:        '#f59e0b',
};

const LEVEL_LABELS = {
  untrained:    'Untrained',
  beginner:     'Beginner',
  novice:       'Novice',
  intermediate: 'Intermediate',
  advanced:     'Advanced',
  elite:        'Elite',
};

const SEGMENT_LEVELS = ['beginner', 'novice', 'intermediate', 'advanced', 'elite'];
const SEGMENT_COLORS = ['#64748b', '#ef4444', '#eab308', '#22c55e', '#f59e0b'];

function StrengthStandardsCard({ sessions, bodyweightLbs }) {
  const standards = useMemo(
    () => calcStrengthStandards(sessions, bodyweightLbs),
    [sessions, bodyweightLbs],
  );

  if (standards.length === 0) {
    return (
      <Card className="p-4">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-fg-muted mb-3">
          Strength Standards
        </div>
        <div className="text-center py-4 text-xs text-fg-faint">
          Log Bench Press, Squat, or Deadlift to see your strength level
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-fg-muted mb-4">
        Strength Standards
      </div>
      <div className="space-y-5">
        {standards.map((entry, i) => {
          const levelColor = LEVEL_COLORS[entry.level] ?? '#64748b';
          const levelLabel = LEVEL_LABELS[entry.level] ?? entry.level;
          const bwRatioDisplay = entry.bwRatio.toFixed(2) + 'x BW';

          // Determine which segment the marker lives in (0–4)
          const levelIdx = SEGMENT_LEVELS.indexOf(entry.level);
          const safeIdx = levelIdx < 0 ? 0 : levelIdx;
          // Marker position across full bar: each segment is 20% wide
          const markerPct = Math.min(
            safeIdx * 20 + entry.progressToNext * 20,
            100,
          );

          const ariaLabel = entry.exerciseName + ': ' + levelLabel + ', ' + bwRatioDisplay;

          return (
            <motion.div
              key={entry.exerciseName}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-fg-secondary">
                  {entry.exerciseName}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-fg-muted">{bwRatioDisplay}</span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ color: levelColor, backgroundColor: levelColor + '22' }}
                  >
                    {levelLabel}
                  </span>
                </div>
              </div>

              {/* Segmented bar */}
              <div
                className="relative h-3 rounded-full overflow-hidden flex"
                role="img"
                aria-label={ariaLabel}
              >
                {SEGMENT_COLORS.map((color, idx) => (
                  <div
                    key={idx}
                    className="flex-1 h-full"
                    style={{ backgroundColor: color + (idx <= safeIdx ? 'cc' : '33') }}
                  />
                ))}

                {/* Marker pip */}
                <motion.div
                  className="absolute top-0 bottom-0 w-1 rounded-full bg-white shadow-md"
                  style={{ left: markerPct + '%', transform: 'translateX(-50%)' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.08 + 0.2 }}
                />
              </div>

              {/* Threshold labels */}
              <div className="flex justify-between mt-1">
                {SEGMENT_LEVELS.map((lvl) => (
                  <span key={lvl} className="text-[8px] text-fg-faint capitalize flex-1 text-center">
                    {lvl.slice(0, 3)}
                  </span>
                ))}
              </div>

              <div
                className="text-[10px] text-fg-faint mt-0.5 cursor-help"
                title="Estimated One Rep Max — the maximum weight you could lift for a single rep"
              >
                {entry.best1RM} lb est. 1RM ?
              </div>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Muscle Group Balance Card ──────────────────────────────────────────────

const GROUP_COLORS = {
  push: '#14b8a6',
  pull: '#06b6d4',
  legs: '#22c55e',
  core: '#f59e0b',
};

function MuscleGroupBalanceCard({ sessions }) {
  const groups = useMemo(() => calcMuscleGroupBalance(sessions), [sessions]);
  const maxSessions = useMemo(
    () => Math.max(...groups.map((g) => g.sessionsLast28Days), 1),
    [groups],
  );

  return (
    <Card className="p-4">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-fg-muted mb-4">
        Muscle Group Balance — Last 30 Days
      </div>
      <div className="space-y-3">
        {groups.map((g, i) => {
          const pct = (g.sessionsLast28Days / maxSessions) * 100;
          const barColor = GROUP_COLORS[g.group] ?? '#14b8a6';
          const isNeglected7Days = g.daysSinceLast >= 7 || g.daysSinceLast === -1;
          const lastTrainedLabel = g.daysSinceLast === -1
            ? 'Never'
            : g.daysSinceLast === 0
              ? 'Today'
              : g.daysSinceLast + 'd ago';

          return (
            <motion.div
              key={g.group}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span aria-hidden="true">{g.emoji}</span>
                  <span className="text-sm font-medium text-fg-secondary">{g.label}</span>
                  {isNeglected7Days && (
                    <span
                      className="text-xs"
                      role="img"
                      aria-label={g.label + ' not trained in 7+ days'}
                    >
                      ⚠️
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-fg-muted">
                  <span>{g.sessionsLast28Days} sessions</span>
                  <span className="text-fg-faint">·</span>
                  <span>{lastTrainedLabel}</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: barColor }}
                  initial={{ width: 0 }}
                  animate={{ width: pct + '%' }}
                  transition={{ type: 'spring', stiffness: 200, damping: 30, delay: i * 0.07 + 0.1 }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Workout Recommendation Card ────────────────────────────────────────────

const REC_STYLES = {
  recovery:  { bg: 'bg-blue-500/10',  border: 'border-blue-500/20',  text: 'text-blue-300'  },
  lift_heavy:{ bg: 'bg-accent/10',border: 'border-accent/20',text: 'text-accent-text' },
  leg_day:   { bg: 'bg-emerald-500/10',border:'border-emerald-500/20',text:'text-emerald-300' },
  pull_day:  { bg: 'bg-cyan-500/10',  border: 'border-cyan-500/20',  text: 'text-cyan-300'  },
  push_day:  { bg: 'bg-violet-500/10',border: 'border-violet-500/20',text: 'text-violet-300' },
  rest:      { bg: 'bg-slate-500/10', border: 'border-slate-500/20', text: 'text-fg-secondary'  },
  general:   { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-300'  },
};

function WorkoutRecommendationCard({ sessions }) {
  const rec = useMemo(() => calcWorkoutRecommendation(sessions), [sessions]);
  const style = REC_STYLES[rec.type] ?? REC_STYLES.general;

  return (
    <Card className="p-4">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-fg-muted mb-3">
        Today's Recommendation
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className={'rounded-xl border px-4 py-3 ' + style.bg + ' ' + style.border}
        role="status"
        aria-live="polite"
      >
        <p className={'text-sm font-medium leading-relaxed ' + style.text}>
          {rec.message}
        </p>
        {rec.urgency === 'high' && (
          <div className="mt-1.5 text-[10px] text-fg-muted uppercase tracking-widest">
            High priority
          </div>
        )}
      </motion.div>
    </Card>
  );
}

// ── PR Timeline Card ───────────────────────────────────────────────────────

function PRTimelineCard({ sessions }) {
  const timeline = useMemo(() => calcPRTimeline(sessions).slice(0, 8), [sessions]);

  if (timeline.length === 0) {
    return (
      <Card className="p-4">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-fg-muted mb-3">
          PR Timeline
        </div>
        <div className="text-center py-4 text-xs text-fg-faint">
          Complete sets to start tracking PRs
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-fg-muted mb-3">
        PR Timeline — Top 8 by Recency
      </div>
      <div className="space-y-2">
        {timeline.map((entry, i) => {
          const deltaLabel = entry.delta != null && entry.delta > 0
            ? '+' + entry.delta + ' lbs'
            : null;

          return (
            <motion.div
              key={entry.exerciseName}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {entry.isHotStreak && (
                  <span className="text-xs shrink-0" aria-label="PR set in last 14 days">🔥</span>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-medium text-fg-secondary truncate max-w-[150px]">
                    {entry.exerciseName}
                  </div>
                  <div className="text-[10px] text-fg-faint">{entry.currentPRDate}</div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div
                  className="font-syne text-sm font-bold text-amber-400 cursor-help"
                  title="Estimated One Rep Max — the maximum weight you could lift for a single rep"
                >
                  {entry.current1RM} lbs 1RM ?
                </div>
                {deltaLabel != null && (
                  <div className="text-[10px] text-emerald-400">{deltaLabel}</div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Daily Volume Trend (7-bar) ─────────────────────────────────────────────

function DailyVolumeTrendChart({ sessions }) {
  const days = useMemo(() => calc7DayDailyVolume(sessions), [sessions]);
  const maxVol = useMemo(() => Math.max(...days.map((d) => d.volume), 1), [days]);
  const isEmpty = days.every((d) => d.volume === 0);

  return (
    <Card className="p-4">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-fg-muted mb-3">
        Volume — Last 7 Days (lbs)
      </div>
      <div
        className="flex items-end gap-2 h-24"
        role="img"
        aria-label="7-day daily volume bar chart"
      >
        {days.map((day, i) => {
          const heightPct = maxVol > 0 ? (day.volume / maxVol) * 100 : 0;
          const barColor = day.aboveAverage ? '#22c55e' : 'rgba(255,255,255,0.12)';

          return (
            <div key={day.dateStr} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full relative" style={{ height: 72 }}>
                <motion.div
                  className="absolute bottom-0 left-0 right-0 rounded-t"
                  style={{ backgroundColor: barColor }}
                  initial={{ height: 0 }}
                  animate={{ height: Math.max(heightPct, day.volume > 0 ? 6 : 0) + '%' }}
                  transition={{ type: 'spring', stiffness: 200, damping: 30, delay: i * 0.06 }}
                  title={day.dateStr + ': ' + day.volume + ' lbs'}
                />
              </div>
              <div className="text-[9px] text-fg-faint">{day.dayLabel}</div>
            </div>
          );
        })}
      </div>
      {isEmpty && (
        <div className="text-center text-xs text-fg-faint mt-2">
          Log workouts to see daily volume
        </div>
      )}
      <div className="flex items-center gap-3 mt-3 text-[10px] text-fg-faint">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          Above average
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-white/10" />
          Below average
        </span>
      </div>
    </Card>
  );
}

// ── Progress Section (composed) ───────────────────────────────────────────

function ProgressSection({ workoutHistory, streak, bodyweightLbs }) {
  return (
    <div className="space-y-6">
      {/* Streak hero */}
      <Card className="p-4 flex items-center gap-4">
        <div className="text-4xl" aria-hidden="true">🔥</div>
        <div>
          <div className="font-syne text-3xl font-bold text-amber-400">{streak}</div>
          <div className="text-sm text-fg-muted">
            day workout streak
          </div>
          {streak === 0 && (
            <div className="text-xs text-fg-faint mt-0.5">Log a workout to start your streak</div>
          )}
        </div>
      </Card>

      {/* Today's recommendation */}
      <WorkoutRecommendationCard sessions={workoutHistory} />

      {/* 7-day daily volume */}
      <DailyVolumeTrendChart sessions={workoutHistory} />

      {/* Strength standards */}
      <StrengthStandardsCard sessions={workoutHistory} bodyweightLbs={bodyweightLbs} />

      {/* Muscle group balance */}
      <MuscleGroupBalanceCard sessions={workoutHistory} />

      {/* PR Timeline */}
      <PRTimelineCard sessions={workoutHistory} />

      {/* Weekly volume trend (historic, 7-week) */}
      <Card className="p-4">
        <VolumeTrendChart sessions={workoutHistory} />
      </Card>

      {/* PR Board (top 3 by 1RM) */}
      <Card className="p-4">
        <PRBoard sessions={workoutHistory} />
      </Card>

      {/* Frequency grid */}
      <Card className="p-4">
        <FrequencyGrid sessions={workoutHistory} />
      </Card>
    </div>
  );
}

// ── Main WorkoutView ──────────────────────────────────────────────────────

const DEFAULT_BODYWEIGHT_LBS = 175;

const WorkoutView = React.memo(function WorkoutView() {
  const { routines, workoutHistory, deleteRoutine, startSession, activeSession, getStreak, userProfile } =
    useWorkoutStore();
  const [activeTab, setActiveTab] = useState('routines');
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const streak = getStreak();

  // Convert userProfile.weightKg → lbs; fall back to 175 if not set
  const bodyweightLbs = useMemo(() => {
    if (userProfile && userProfile.weightKg > 0) {
      return Math.round(userProfile.weightKg * 2.20462);
    }
    return DEFAULT_BODYWEIGHT_LBS;
  }, [userProfile]);

  const isNewUser = routines.length === 0 && workoutHistory.length === 0;

  const handleStart = useCallback((routine) => {
    startSession(routine);
  }, [startSession]);

  const handleEdit = useCallback((routine) => {
    setEditingRoutine(routine);
    setShowBuilder(true);
  }, []);

  // Seeds the beginner template routine and immediately launches a session.
  const { addRoutine } = useWorkoutStore();
  const handleStarterTemplate = useCallback(() => {
    const uid = () => Math.random().toString(36).slice(2, 9);
    const seeded = {
      ...STARTER_TEMPLATE,
      exercises: STARTER_TEMPLATE.exercises.map((ex) => ({ ...ex, id: uid() })),
    };
    addRoutine(seeded);
    startSession(seeded);
  }, [addRoutine, startSession]);

  const handleBuilderClose = useCallback(() => {
    setShowBuilder(false);
    setEditingRoutine(null);
  }, []);

  const handleImportTemplate = useCallback(
    (template) => {
      const uid = () => Math.random().toString(36).slice(2, 9);
      template.routines.forEach((routine) => {
        addRoutine({
          name: routine.name,
          exercises: routine.exercises.map((ex) => ({
            ...ex,
            id: uid(),
          })),
        });
      });
      setShowTemplates(false);
    },
    [addRoutine],
  );

  if (activeSession) {
    return (
      <div className="max-w-xl mx-auto">
        <SessionMode />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-syne text-2xl font-bold text-fg">Workouts</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-fg-faint text-sm">{routines.length} routines</span>
            {isNewUser && (
              <span className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                New here? Start below
              </span>
            )}
            {streak > 0 && (
              <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                {streak} day streak
              </span>
            )}
          </div>
        </div>
        <Button onClick={() => { setEditingRoutine(null); setShowBuilder(true); }} size="sm">
          + New Routine
        </Button>
      </div>

      {/* Stats */}
      {workoutHistory.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="p-3 text-center">
            <div className="font-syne text-xl font-bold text-accent-text">{workoutHistory.length}</div>
            <div className="text-[10px] text-fg-faint uppercase tracking-wider mt-0.5">Total</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="font-syne text-xl font-bold text-amber-400">{streak}</div>
            <div className="text-[10px] text-fg-faint uppercase tracking-wider mt-0.5">Streak</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="font-syne text-xl font-bold text-emerald-400">
              {workoutHistory.filter((w) => {
                const d = new Date(w.completedAt);
                const now = new Date();
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
              }).length}
            </div>
            <div className="text-[10px] text-fg-faint uppercase tracking-wider mt-0.5">This Month</div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-white/[0.06]">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-accent text-accent-text'
                : 'border-transparent text-fg-muted hover:text-fg-secondary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'routines' && (
          <motion.div
            key="routines"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {showTemplates ? (
              <TemplateLibrary
                onImport={handleImportTemplate}
                onClose={() => setShowTemplates(false)}
              />
            ) : routines.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6"
              >
                {/* Headline */}
                <div className="text-center mb-6">
                  <div className="text-4xl mb-3" aria-hidden="true">🏋️</div>
                  <div className="font-syne text-xl font-bold text-fg mb-1">
                    Welcome to Workouts
                  </div>
                  <div className="text-fg-muted text-sm max-w-xs mx-auto">
                    Track every lift, build strength over time, and hit personal records.
                    Getting started takes under a minute.
                  </div>
                </div>

                {/* How it works — 3 steps */}
                <div className="grid grid-cols-3 gap-3 mb-6 text-center">
                  {[
                    { step: '1', label: 'Pick a routine', sub: 'or use our starter' },
                    { step: '2', label: 'Log sets + reps', sub: 'weight optional' },
                    { step: '3', label: 'See your PRs', sub: 'progress auto-tracked' },
                  ].map(({ step, label, sub }) => (
                    <div
                      key={step}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
                    >
                      <div className="w-6 h-6 rounded-full bg-accent/20 border border-accent/30 text-accent-text text-xs font-bold flex items-center justify-center mx-auto mb-2">
                        {step}
                      </div>
                      <div className="text-xs font-medium text-fg-secondary">{label}</div>
                      <div className="text-[10px] text-fg-faint mt-0.5">{sub}</div>
                    </div>
                  ))}
                </div>

                {/* Beginner template preview */}
                <div className="rounded-xl border border-accent/20 bg-accent/[0.04] p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-sm font-semibold text-fg-secondary">Full Body Starter</div>
                      <div className="text-[11px] text-fg-muted mt-0.5">
                        Recommended for beginners — 3 exercises, ~20 min
                      </div>
                    </div>
                    <span className="text-[10px] text-accent-text bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full">
                      Template
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {STARTER_TEMPLATE.exercises.map((ex) => (
                      <span
                        key={ex.name}
                        className="text-[11px] text-fg-muted bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-lg"
                      >
                        {ex.name} {ex.sets.length}×{ex.sets[0].reps}
                      </span>
                    ))}
                  </div>
                  <Button onClick={handleStarterTemplate} className="w-full">
                    Start Full Body Starter now
                  </Button>
                </div>

                {/* Browse Templates */}
                <button
                  onClick={() => setShowTemplates(true)}
                  className="w-full rounded-xl border border-accent/15 bg-accent/[0.04] py-3 text-sm text-accent-text hover:text-accent-text hover:bg-accent/[0.08] transition-colors mb-4"
                >
                  Browse All Templates
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 text-fg-faint text-xs mb-4">
                  <div className="flex-1 h-px bg-white/[0.06]" />
                  or
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>

                {/* Build own */}
                <button
                  onClick={() => { setEditingRoutine(null); setShowBuilder(true); }}
                  className="w-full rounded-xl border border-dashed border-white/10 py-3 text-sm text-fg-muted hover:text-fg-secondary hover:border-accent/30 transition-colors"
                >
                  Build my own routine
                </button>
              </motion.div>
            ) : (
              <div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {routines.map((routine) => (
                    <RoutineCard
                      key={routine.id}
                      routine={routine}
                      onStart={handleStart}
                      onEdit={handleEdit}
                      onDelete={deleteRoutine}
                    />
                  ))}
                </div>

                {/* Browse Templates button below routine grid */}
                <button
                  onClick={() => setShowTemplates(true)}
                  className="w-full mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02] py-3 text-sm text-fg-muted hover:text-accent-text hover:border-accent/20 hover:bg-accent/[0.04] transition-colors flex items-center justify-center gap-2"
                >
                  <span aria-hidden="true">📋</span>
                  Browse Templates
                </button>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="space-y-3"
          >
            {workoutHistory.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-3xl mb-3" aria-hidden="true">📋</div>
                <div className="text-fg-muted font-medium mb-1">No sessions logged yet</div>
                <div className="text-fg-faint text-sm mb-5">
                  Complete your first workout and it will appear here.
                </div>
                <Button size="sm" onClick={() => setActiveTab('routines')}>
                  Go to Routines
                </Button>
              </div>
            ) : (
              workoutHistory.map((session) => (
                <Card key={session.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-fg-secondary">{session.routineName}</div>
                      <div className="text-xs text-fg-faint">
                        {new Date(session.completedAt).toLocaleDateString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric',
                        })}
                        {' · '}
                        {session.duration}m
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-400">
                        {session.exercises?.reduce((a, ex) => a + ex.sets.filter((s) => s.completed).length, 0) || 0} sets
                      </div>
                      <div className="text-[10px] text-fg-faint">{session.exercises?.length || 0} exercises</div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'progress' && (
          <motion.div
            key="progress"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <ProgressSection workoutHistory={workoutHistory} streak={streak} bodyweightLbs={bodyweightLbs} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Builder Modal */}
      <Modal
        open={showBuilder}
        onClose={handleBuilderClose}
        title={editingRoutine ? 'Edit Routine' : 'New Routine'}
        maxWidth="max-w-xl"
      >
        <WorkoutBuilder editingRoutine={editingRoutine} onClose={handleBuilderClose} />
      </Modal>
    </div>
  );
});

export default WorkoutView;
