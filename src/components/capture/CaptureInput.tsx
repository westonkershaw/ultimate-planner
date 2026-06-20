import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { parseCapture } from '@/utils/captureParser';
import CapturePreview from './CapturePreview';

interface CaptureInputProps {
  onSubmit: (text: string) => void;
  autoFocus?: boolean;
}

export default function CaptureInput({ onSubmit, autoFocus = true }: CaptureInputProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const parsed = text.trim() ? parseCapture(text) : null;

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit(text.trim());
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Capture anything... (! priority, #tag, ~30m, tomorrow)"
          className="w-full bg-slate-900/60 border border-slate-800/60 rounded-xl px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
        />
        {text.trim() && (
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={handleSubmit}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-400 transition-colors"
          >
            <Zap size={16} />
          </motion.button>
        )}
      </div>
      {parsed && <CapturePreview parsed={parsed} />}
    </div>
  );
}
