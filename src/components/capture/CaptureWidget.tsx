import { Inbox } from 'lucide-react';
import Card from '@/components/ui/Card';
import { useCaptureStore } from '@/store/useCaptureStore';

interface CaptureWidgetProps {
  onOpen: () => void;
}

export default function CaptureWidget({ onOpen }: CaptureWidgetProps) {
  const items = useCaptureStore((s) => s.items.filter((i) => !i.archived && !i.convertedToTask));
  const count = items.length;
  const latest = items[0];

  return (
    <Card className="p-4 cursor-pointer" hover onClick={onOpen}>
      <div className="flex items-start justify-between mb-3">
        <div className="text-2xl"><Inbox size={20} className="text-indigo-400" /></div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">Inbox</div>
      </div>
      <div className="font-syne text-2xl font-bold text-indigo-400">
        {count}
      </div>
      <div className="text-xs text-slate-600 mt-0.5">
        {count === 0 ? 'All clear' : latest ? `"${latest.text.slice(0, 30)}${latest.text.length > 30 ? '...' : ''}"` : 'items to process'}
      </div>
    </Card>
  );
}
