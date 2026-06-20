import type { ID, Priority, Timestamp } from './common.types';

export interface CaptureItem {
  id: ID;
  text: string;
  rawText: string;
  capturedAt: Timestamp;
  priority: Priority | null;
  dueDate: string | null;
  tags: string[];
  duration: number | null; // minutes
  archived: boolean;
  convertedToTask: boolean;
}

export interface ParsedCapture {
  cleanText: string;
  priority: Priority | null;
  dueDate: string | null;
  tags: string[];
  duration: number | null;
}
