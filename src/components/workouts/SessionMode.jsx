import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../ui/Card';
import Button from '../ui/Button';
import RestTimer from './RestTimer';
import { useWorkoutStore } from '../../store';
import {
  calcSessionExerciseVolume,
  calcEpley1RM,
  calcPRBoard,
} from '../../utils/math';

// ── Floating set-completion badge ─────────────────────────────────────────

function FloatingVolBadge({ value, id }) {
  return (
    <AnimatePresence>
      {value && (
        <motion.div
          key={id}
          initial={{ opacity: 1, y: 0, scale: 1 }}
          animate={{ opacity: 0, y: -48, scale: 1.2 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="pointer-events-none absolute right-4 top-2 font-syne font-bold text-emerald-400 text-lg select-none"
          aria-hidden="true"
        >
          +{value} lbs
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── PR Banner ─────────────────────────────────────────────────────────────

function PRBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: -8 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30"
      role="status"
      aria-live="polite"
    >
      <span className="text-lg" aria-hidden="true">🏆</span>
      <span className="font-syne font-bold text-amber-400 text-sm tracking-wide">NEW PR!</span>
    </motion.div>
  );
}

// ── Session Mode ──────────────────────────────────────────────────────────

const SessionMode = React.memo(function SessionMode() {
  const { activeSession, workoutHistory, completeSet, endSession, cancelSession } =
    useWorkoutStore();

  const [showRestTimer, setShowRestTimer] = useState(false);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [flashId, setFlashId] = useState(null);
  const [flashValue, setFlashValue] = useState(null);
  const [showPR, setShowPR] = useState(false);
  const prTimerRef = useRef(null);

  const exercises = useMemo(() => activeSession?.exercises ?? [], [activeSession]);
  const routineName = activeSession?.routineName ?? '';

  // Locate current exercise/set
  let currentExIndex = 0;
  let currentSetIndex = 0;
  let found = false;
  for (let ei = 0; ei < exercises.length && !found; ei++) {
    for (let si = 0; si < (exercises[ei]?.sets?.length ?? 0) && !found; si++) {
      if (!exercises[ei]?.sets?.[si]?.completed) {
        currentExIndex = ei;
        currentSetIndex = si;
        found = true;
      }
    }
  }

  const allDone = !found;
  const currentEx = exercises[currentExIndex];
  const currentSet = currentEx?.sets[currentSetIndex];
  const nextEx = !allDone ? exercises[currentExIndex + (currentSetIndex === currentEx.sets.length - 1 ? 1 : 0)] : null;
  const nextExIsNew = !allDone && currentSetIndex === currentEx.sets.length - 1;

  const prevWeight = currentSet?.actualWeight || currentSet?.weight || '';
  const prevReps = currentSet?.actualReps || currentSet?.reps || 8;

  const totalSets = useMemo(
    () => exercises.reduce((a, ex) => a + (ex?.sets?.length ?? 0), 0),
    [exercises],
  );
  const completedSets = useMemo(
    () => exercises.reduce((a, ex) => a + (ex?.sets?.filter((s) => s.completed).length ?? 0), 0),
    [exercises],
  );

  // Live total volume across all completed sets
  const totalVolume = useMemo(
    () => exercises.reduce((sum, ex) => sum + calcSessionExerciseVolume(ex), 0),
    [exercises],
  );

  // PR detection: compare proposed set against best historical 1RM for this exercise
  const historicalPRs = useMemo(() => calcPRBoard(workoutHistory, 50), [workoutHistory]);
  const currentExPR = useMemo(() => {
    if (!currentEx) return null;
    return historicalPRs.find(
      (p) => p.exerciseName.toLowerCase() === currentEx.name.toLowerCase(),
    ) ?? null;
  }, [currentEx, historicalPRs]);

  const handleCompleteSet = useCallback(() => {
    const w = Number(weight || prevWeight || 0);
    const r = Number(reps || prevReps || 0);
    const setVol = w * r;

    // PR detection before mutation
    if (w > 0 && r >= 1 && currentExPR) {
      let proposedRM = w;
      try { proposedRM = calcEpley1RM(w, r); } catch { /* swallow */ }
      if (proposedRM > currentExPR.epley1RM) {
        setShowPR(true);
        clearTimeout(prTimerRef.current);
        prTimerRef.current = setTimeout(() => setShowPR(false), 3500);
      }
    }

    completeSet(currentExIndex, currentSetIndex, w, r);
    setWeight('');
    setReps('');
    setShowRestTimer(true);

    // Trigger floating badge
    if (setVol > 0) {
      const id = Date.now();
      setFlashId(id);
      setFlashValue(setVol);
      setTimeout(() => setFlashId(null), 1000);
    }
  }, [weight, reps, prevWeight, prevReps, currentExIndex, currentSetIndex, completeSet, currentExPR]);

  const handleFinishWorkout = useCallback(() => {
    setShowSummary(true);
  }, []);

  const handleConfirmFinish = useCallback(() => {
    endSession();
  }, [endSession]);

  // Track elapsed time in state to avoid calling Date.now() during render
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  if (!activeSession) return null;

  const startedAt = activeSession.startedAt;
  const elapsed = startedAt ? Math.round((now - new Date(startedAt).getTime()) / 1000 / 60) : 0;
  const progressPct = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  // ── Summary Screen ────────────────────────────────────────────────────

  if (showSummary) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-6 flex flex-col items-center gap-6 text-center"
      >
        <div className="text-5xl">🏆</div>
        <div>
          <div className="font-syne text-2xl font-bold text-slate-100 mb-1">Workout Complete!</div>
          <div className="text-slate-500 text-sm">{routineName}</div>
        </div>

        <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="text-2xl font-bold text-indigo-400">{completedSets}</div>
            <div className="text-[10px] text-slate-600 uppercase tracking-wider">Sets Done</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="text-2xl font-bold text-emerald-400">{exercises.length}</div>
            <div className="text-[10px] text-slate-600 uppercase tracking-wider">Exercises</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="text-2xl font-bold text-amber-400">{elapsed}m</div>
            <div className="text-[10px] text-slate-600 uppercase tracking-wider">Duration</div>
          </div>
        </div>

        {totalVolume > 0 && (
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-6 py-3">
            <div className="font-syne text-xl font-bold text-indigo-400">
              {totalVolume.toLocaleString()} lbs
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Total Volume</div>
          </div>
        )}

        <div className="w-full max-w-sm space-y-2">
          {exercises.map((ex) => {
            const done = ex.sets.filter((s) => s.completed).length;
            return (
              <div
                key={ex.name}
                className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06]"
              >
                <span className="text-slate-300">{ex.name}</span>
                <span className="text-slate-500 text-xs">{done}/{ex.sets.length} sets</span>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <Button onClick={handleConfirmFinish}>Save Workout</Button>
          <Button variant="ghost" onClick={() => setShowSummary(false)}>Keep Going</Button>
        </div>
      </motion.div>
    );
  }

  // ── Active Session ────────────────────────────────────────────────────

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-syne text-lg font-bold text-slate-100">{routineName}</div>
          <div className="text-xs text-slate-600">{elapsed}m elapsed</div>
        </div>
        <div className="flex items-center gap-3">
          {/* Live volume counter */}
          <div className="text-right">
            <div className="font-syne text-sm font-bold text-indigo-400">
              {totalVolume > 0 ? `${totalVolume.toLocaleString()} lbs` : '—'}
            </div>
            <div className="text-[9px] text-slate-600 uppercase tracking-wider">volume</div>
          </div>
          <Button variant="ghost" size="sm" onClick={cancelSession}>End</Button>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between text-[10px] text-slate-600 mb-1">
          <span>{completedSets} of {totalSets} sets</span>
          <span>{Math.round(progressPct)}%</span>
        </div>
        <div
          className="h-2 rounded-full bg-white/[0.06] overflow-hidden"
          role="progressbar"
          aria-valuenow={completedSets}
          aria-valuemin={0}
          aria-valuemax={totalSets}
          aria-label="Workout progress"
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, rgba(99,102,241,0.9) 0%, rgba(139,92,246,0.9) 100%)',
            }}
            animate={{ width: `${progressPct}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          />
        </div>
      </div>

      {/* PR Banner */}
      <AnimatePresence>
        {showPR && <PRBanner />}
      </AnimatePresence>

      {/* Exercise accordion */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {exercises.map((ex, ei) => {
          const doneSets = ex.sets.filter((s) => s.completed).length;
          const isCurrent = ei === currentExIndex && !allDone;
          return (
            <div
              key={ex.name}
              className={`flex-shrink-0 px-3 py-2 rounded-lg border text-xs transition-colors ${
                isCurrent
                  ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300'
                  : doneSets === ex.sets.length
                  ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400'
                  : 'border-white/[0.06] bg-white/[0.02] text-slate-500'
              }`}
            >
              <div className="font-medium truncate max-w-[100px]">{ex.name}</div>
              <div>{doneSets}/{ex.sets.length} sets</div>
            </div>
          );
        })}
      </div>

      {/* Current exercise or all-done */}
      {allDone ? (
        <Card className="p-6 text-center">
          <div className="text-3xl mb-3">✅</div>
          <div className="font-syne text-lg font-bold text-slate-100 mb-1">All sets complete!</div>
          <div className="text-sm text-slate-500 mb-4">Great workout. Ready to finish?</div>
          <Button onClick={handleFinishWorkout} className="w-full">Finish Workout</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Current exercise card */}
          <Card className="p-5 relative overflow-hidden">
            {/* Set flash overlay */}
            <AnimatePresence>
              {flashId && (
                <motion.div
                  key={flashId}
                  initial={{ opacity: 0.6 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  className="pointer-events-none absolute inset-0 rounded-xl bg-emerald-500/15"
                  aria-hidden="true"
                />
              )}
            </AnimatePresence>

            <FloatingVolBadge value={flashValue} id={flashId} />

            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-1">
              Exercise {currentExIndex + 1} of {exercises.length}
            </div>
            <div className="font-syne text-xl font-bold text-slate-100 mb-0.5">{currentEx.name}</div>
            <div className="text-xs text-slate-600 capitalize mb-4">
              Set {currentSetIndex + 1} of {currentEx.sets.length}
            </div>

            {/* Smart Set inputs */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 block mb-1">
                  Weight (lb)
                </label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder={String(prevWeight || '0')}
                  className="w-full rounded-xl border border-white/10 bg-[#0a1120]/80 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 block mb-1">
                  Reps
                </label>
                <input
                  type="number"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  placeholder={String(prevReps)}
                  className="w-full rounded-xl border border-white/10 bg-[#0a1120]/80 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <Button onClick={handleCompleteSet} className="w-full mb-3">
              Complete Set {currentSetIndex + 1}
            </Button>

            <button
              onClick={handleFinishWorkout}
              className="w-full text-xs text-slate-600 hover:text-slate-400 transition-colors"
            >
              Finish early
            </button>
          </Card>

          {/* Next exercise preview (collapsed accordion) */}
          {nextExIsNew && nextEx && nextEx.name !== currentEx.name && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 flex items-center justify-between"
            >
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-widest text-slate-600 mb-0.5">
                  Up next
                </div>
                <div className="text-sm font-medium text-slate-400">{nextEx.name}</div>
                <div className="text-[10px] text-slate-600">{nextEx.sets.length} sets</div>
              </div>
              <div className="text-slate-700 text-xl" aria-hidden="true">›</div>
            </motion.div>
          )}
        </div>
      )}

      {/* Rest Timer */}
      <AnimatePresence>
        {showRestTimer && !allDone && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <Card className="p-5">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 text-center mb-4">
                Rest Timer
              </div>
              <RestTimer
                autoStart
                defaultDuration={90}
                onComplete={() => setShowRestTimer(false)}
              />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default SessionMode;
