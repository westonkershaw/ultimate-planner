import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { APP_SPRING } from '@/hooks/useAppSpring';

// ── Types ───────────────────────────────────────────────────────────────────

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  maxWidth?: string;
}

// ── Component ───────────────────────────────────────────────────────────────

const Modal = React.memo(function Modal({
  open,
  onClose,
  children,
  title,
  maxWidth = 'max-w-lg',
}: ModalProps) {
  // Keyboard escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={APP_SPRING}
            className={[
              'relative w-full',
              maxWidth,
              'rounded-panel',
              'bg-surface-1',
              'border border-border',
              'max-h-[90vh] overflow-auto',
            ].join(' ')}
            style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.45)' }}
          >
            {title && (
              <div className="flex items-center justify-between px-5 pt-5 pb-0">
                <h2 className="font-semibold text-lg text-fg tracking-tight">{title}</h2>
                <button
                  onClick={onClose}
                  className="text-fg-muted hover:text-fg transition-colors p-1 rounded-control hover:bg-surface-2"
                  aria-label="Close modal"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default Modal;
