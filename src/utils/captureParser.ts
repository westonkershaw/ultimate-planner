import type { Priority } from '@/types';
import type { ParsedCapture } from '@/types/capture.types';

/**
 * Parses raw capture text and extracts structured metadata.
 * Supports: priority (!), dates (tomorrow, next monday), tags (#tag), duration (~30m)
 */
export function parseCapture(raw: string): ParsedCapture {
  let text = raw.trim();
  let priority: Priority | null = null;
  let dueDate: string | null = null;
  const tags: string[] = [];
  let duration: number | null = null;

  // Extract priority: !! = high, ! = medium (at start or end)
  if (/^!!/.test(text) || /!!$/.test(text)) {
    priority = 'high';
    text = text.replace(/!!/g, '').trim();
  } else if (/^!/.test(text) || /!$/.test(text)) {
    priority = 'medium';
    text = text.replace(/(?<!=)!(?!=)/g, '').trim();
  }

  // Extract tags: #word
  const tagMatches = text.match(/#(\w+)/g);
  if (tagMatches) {
    tagMatches.forEach((t) => tags.push(t.slice(1)));
    text = text.replace(/#\w+/g, '').trim();
  }

  // Extract duration: ~30m, ~2h, ~1.5h
  const durationMatch = text.match(/~(\d+(?:\.\d+)?)(m|h)/i);
  if (durationMatch) {
    const val = parseFloat(durationMatch[1]!);
    duration = durationMatch[2]!.toLowerCase() === 'h' ? Math.round(val * 60) : val;
    text = text.replace(/~\d+(?:\.\d+)?(?:m|h)/i, '').trim();
  }

  // Extract relative dates
  dueDate = extractDate(text);
  if (dueDate) {
    text = removeDateText(text);
  }

  return {
    cleanText: text.replace(/\s{2,}/g, ' ').trim(),
    priority,
    dueDate,
    tags,
    duration,
  };
}

function extractDate(text: string): string | null {
  const lower = text.toLowerCase();
  const today = new Date();

  if (/\btomorrow\b/.test(lower)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return formatDate(d);
  }

  if (/\btoday\b/.test(lower)) {
    return formatDate(today);
  }

  const nextDayMatch = lower.match(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
  if (nextDayMatch) {
    return formatDate(getNextDay(nextDayMatch[1]!));
  }

  const dayMatch = lower.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
  if (dayMatch) {
    return formatDate(getNextDay(dayMatch[1]!));
  }

  return null;
}

function removeDateText(text: string): string {
  return text
    .replace(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, '')
    .replace(/\b(tomorrow|today)\b/i, '')
    .replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function getNextDay(dayName: string): Date {
  const target = DAYS.indexOf(dayName.toLowerCase());
  const today = new Date();
  const current = today.getDay();
  let diff = target - current;
  if (diff <= 0) diff += 7;
  const result = new Date(today);
  result.setDate(result.getDate() + diff);
  return result;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0] as string;
}
