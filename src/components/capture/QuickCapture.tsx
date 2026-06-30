import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import CaptureInput from './CaptureInput';
import { useCaptureStore } from '@/store/useCaptureStore';

interface QuickCaptureProps {
  open: boolean;
  onClose: () => void;
}

export default function QuickCapture({ open, onClose }: QuickCaptureProps) {
  const addCapture = useCaptureStore((s) => s.addCapture);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleSubmit = (text: string) => {
    addCapture(text);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative w-full max-w-lg bg-[#0f1829]/95 backdrop-blur-xl border border-border rounded-panel p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-fg-secondary">Quick Capture</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-fg-muted hover:text-fg-secondary hover:bg-surface-2 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <CaptureInput onSubmit={handleSubmit} />

            <div className="mt-3 flex items-center gap-3 text-[10px] text-fg-faint">
              <span><kbd className="px-1 py-0.5 rounded bg-surface-2 text-fg-muted">Enter</kbd> to save</span>
              <span><kbd className="px-1 py-0.5 rounded bg-surface-2 text-fg-muted">Esc</kbd> to close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
