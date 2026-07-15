/**
 * learningEvents.ts
 *
 * One thin call site for capturing behavioural signals: `logLearningEvent(...)`.
 * Fire-and-forget by design — it never throws and never blocks the UI. Call it
 * at natural moments (task done/skipped, goal set, plan accepted, review saved).
 *
 * The heavy lifting (aggregation) happens later in the deterministic learn step
 * (profileEngine), run on review — not here, and not per event.
 */

import { appendEvent, currentUserId } from './profileSync';
import type { LearningEvent, LearningEventType, LearningEventPayload } from '@/types';

const WDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const uid = (): string =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/**
 * Record a single learning signal. Automatically stamps the local weekday/hour
 * when the caller didn't provide them, so the profile can learn *when* things
 * happen without every call site remembering to pass it.
 */
export function logLearningEvent(type: LearningEventType, payload: LearningEventPayload = {}): void {
  try {
    const now = new Date();
    const event: LearningEvent = {
      id: uid(),
      userId: currentUserId(),
      ts: now.toISOString(),
      type,
      payload: {
        weekday: payload.weekday ?? WDAY[now.getDay()],
        hour: payload.hour ?? now.getHours(),
        ...payload,
      },
    };
    // Fire-and-forget; appendEvent buffers locally and best-effort syncs.
    void appendEvent(event);
  } catch {
    /* never let telemetry break a user action */
  }
}
