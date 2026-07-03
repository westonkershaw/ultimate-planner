import { Inbox } from 'lucide-react';
import Card from '@/components/ui/Card';
import { useCaptureStore } from '@/store/useCaptureStore';

interface CaptureWidgetProps {
  onOpen: () => void;
}

export default function CaptureWidget({ onOpen }: CaptureWidgetProps) {
  // Select the stable `items` reference and filter in render — filtering inside
  // the selector returns a fresh array every render → infinite loop (React #185).
  const allItems = useCaptureStore((s) => s.items);
  const items = allItems.filter((i) => !i.archived && !i.convertedToTask);
  const count = items.length;
  const latest = items[0];

  return (
    <Card className="p-4 cursor-pointer" hover onClick={onOpen}>
      <div className="flex items-start justify-between mb-3">
        <div className="text-2xl"><Inbox size={20} className="text-accent-text" /></div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Inbox</div>
      </div>
      <div className="font-syne text-2xl font-bold text-accent-text">
        {count}
      </div>
      <div className="text-xs text-fg-faint mt-0.5">
        {count === 0 ? 'All clear' : latest ? `"${latest.text.slice(0, 30)}${latest.text.length > 30 ? '...' : ''}"` : 'items to process'}
      </div>
    </Card>
  );
}
