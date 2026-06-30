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
          className="w-full bg-surface-1 border border-border rounded-xl px-4 py-3.5 text-base text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
        />
        {text.trim() && (
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={handleSubmit}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors"
          >
            <Zap size={16} />
          </motion.button>
        )}
      </div>
      {parsed && <CapturePreview parsed={parsed} />}
    </div>
  );
}
