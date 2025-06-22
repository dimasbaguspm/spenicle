import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';

interface CalendarCurrentTimeLineProps {
  currentDate: dayjs.Dayjs;
  viewMode: 'day' | 'week';
}

export const CalendarCurrentTimeLine = ({ currentDate, viewMode }: CalendarCurrentTimeLineProps) => {
  const [now, setNow] = useState(() => dayjs());
  const [top, setTop] = useState<number | null>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(dayjs());
    }, 1000 * 30); // update every 30 seconds for smoothness
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (viewMode !== 'day' || !now.isSame(currentDate, 'day')) {
      setTop(null);
      return;
    }
    // calculate the current slot index (0-95)
    const hour = now.hour();
    const minute = now.minute();
    const quarterIndex = hour * 4 + Math.floor(minute / 15);
    const selector = `[data-quarter-index="${quarterIndex}"]`;
    const slotEl = document.querySelector(selector);
    if (slotEl instanceof HTMLElement) {
      // interpolate within the slot for minute-level accuracy
      const minutesIntoSlot = minute % 15;
      const slotHeight = slotEl.offsetHeight;
      const offsetWithinSlot = (minutesIntoSlot / 15) * slotHeight;
      setTop(slotEl.offsetTop + offsetWithinSlot);
    } else {
      setTop(null);
    }
  }, [now, currentDate, viewMode]);

  if (viewMode !== 'day' || !now.isSame(dayjs(), 'day') || !currentDate.isSame(dayjs(), 'day') || top == null) {
    return null;
  }

  return (
    <div
      ref={indicatorRef}
      className="absolute left-20 right-0 z-20 h-0.5 bg-coral-500"
      style={{ top: `${top}px` }}
      aria-label="current time indicator"
    >
      <span className="absolute -top-2 right-0 text-xs bg-coral-500 text-white px-2 py-0.5 rounded shadow">
        {now.format('HH:mm')}
      </span>
    </div>
  );
};
