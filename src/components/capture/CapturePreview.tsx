import { motion } from 'framer-motion';
import { Flag, Calendar, Tag, Clock } from 'lucide-react';
import type { ParsedCapture } from '@/types/capture.types';

interface CapturePreviewProps {
  parsed: ParsedCapture;
}

export default function CapturePreview({ parsed }: CapturePreviewProps) {
  const hasMetadata = parsed.priority || parsed.dueDate || parsed.tags.length > 0 || parsed.duration;
  if (!hasMetadata) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap gap-2"
    >
      {parsed.priority && (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          <Flag size={11} /> {parsed.priority}
        </span>
      )}
      {parsed.dueDate && (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs">
          <Calendar size={11} /> {parsed.dueDate}
        </span>
      )}
      {parsed.tags.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
          <Tag size={11} /> {tag}
        </span>
      ))}
      {parsed.duration && (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
          <Clock size={11} /> {parsed.duration}m
        </span>
      )}
    </motion.div>
  );
}
