import React, { useCallback } from 'react';
import { Download, Share2, Copy, Check } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { calcTripBudgetFromTrip, formatUsd, formatNumber, formatDuration } from '@/utils/travelEngine';
import type { SavedTrip } from '@/types';

interface TripExportProps {
  trip: SavedTrip;
}

function buildTextSummary(trip: SavedTrip): string {
  const b = calcTripBudgetFromTrip(trip);
  const lines: string[] = [
    `=== ${trip.name} ===`,
    `${trip.fromLocation} → ${trip.toLocation}${trip.roundTrip ? ' (Round Trip)' : ''}`,
    trip.waypoints.length > 0 ? `Stops: ${trip.waypoints.map((w) => w.location).join(' → ')}` : '',
    `${trip.days} days, ${trip.nights} nights, ${trip.people} people`,
    trip.distanceMiles > 0 ? `Distance: ${formatNumber(trip.distanceMiles, 0)} mi${trip.durationHours > 0 ? ` · ${formatDuration(trip.durationHours)} drive` : ''}` : '',
    '',
    '--- Budget ---',
    b.fuel > 0 ? `Fuel: ${formatUsd(b.fuel)}` : '',
    b.food > 0 ? `Food: ${formatUsd(b.food)}` : '',
    b.accommodation > 0 ? `Accommodation: ${formatUsd(b.accommodation)}` : '',
    b.entertainment > 0 ? `Entertainment: ${formatUsd(b.entertainment)}` : '',
    b.flight > 0 ? `Flights: ${formatUsd(b.flight)}` : '',
    b.rentalCar > 0 ? `Rental Car: ${formatUsd(b.rentalCar)}` : '',
    b.custom > 0 ? `Other: ${formatUsd(b.custom)}` : '',
    `TOTAL: ${formatUsd(b.total)}`,
  ];

  if (trip.itinerary.length > 0) {
    lines.push('', '--- Itinerary ---');
    trip.itinerary.forEach((day) => {
      lines.push(`Day ${day.dayNumber}:`);
      day.blocks.forEach((bl) => {
        lines.push(`  ${bl.time} ${bl.title}${bl.cost > 0 ? ` (${formatUsd(bl.cost)})` : ''}`);
      });
    });
  }

  return lines.filter(Boolean).join('\n');
}

const TripExport = React.memo(function TripExport({ trip }: TripExportProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = useCallback(async () => {
    const text = buildTextSummary(trip);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [trip]);

  const handleShare = useCallback(async () => {
    const text = buildTextSummary(trip);
    if (navigator.share) {
      await navigator.share({ title: trip.name, text });
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [trip]);

  const handleDownload = useCallback(() => {
    const text = buildTextSummary(trip);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${trip.name.replace(/[^a-zA-Z0-9]/g, '_')}_trip.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [trip]);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Share2 size={16} className="text-pink-400" />
        <h3 className="text-sm font-semibold text-slate-200">Export & Share</h3>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={handleCopy} className="flex-1">
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy'}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleShare} className="flex-1">
          <Share2 size={12} /> Share
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDownload} className="flex-1">
          <Download size={12} /> Download
        </Button>
      </div>
    </Card>
  );
});

export default TripExport;
