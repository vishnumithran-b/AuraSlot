import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { getISTParts } from '../utils/date-ist';

export const LiveISTClock: React.FC = () => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const parts = getISTParts(new Date());
      const hour12 = parts.hour % 12 === 0 ? 12 : parts.hour % 12;
      const period = parts.hour >= 12 ? 'PM' : 'AM';
      const hStr = String(hour12).padStart(2, '0');
      const mStr = String(parts.minute).padStart(2, '0');
      const sStr = String(parts.second).padStart(2, '0');
      setTimeStr(`${hStr}:${mStr}:${sStr} ${period}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-red-900/10 text-xs font-mono text-[#1C1917] shadow-sm"
      title="Official Clock synchronized to Indian Standard Time (IST, UTC+5:30)"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#059669] opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#059669]"></span>
      </span>
      <Clock className="w-3.5 h-3.5 text-[#DC2626]" />
      <span className="font-semibold tracking-wider text-[#1C1917]">{timeStr || '12:00:00 PM'}</span>
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-[#B91C1C] border border-red-200">
        IST (UTC+5:30)
      </span>
    </div>
  );
};
