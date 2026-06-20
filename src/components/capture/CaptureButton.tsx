import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useCaptureStore } from '@/store/useCaptureStore';

interface CaptureButtonProps {
  onClick: () => void;
}

export default function CaptureButton({ onClick }: CaptureButtonProps) {
  const inboxCount = useCaptureStore((s) => s.items.filter((i) => !i.archived && !i.convertedToTask).length);

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-24 right-4 sm:bottom-6 sm:right-6 z-40 w-12 h-12 rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 flex items-center justify-center hover:bg-indigo-400 transition-colors"
      aria-label="Quick capture"
    >
      <Plus size={22} strokeWidth={2.5} />
      {inboxCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
          {inboxCount > 99 ? '99+' : inboxCount}
        </span>
      )}
    </motion.button>
  );
}
