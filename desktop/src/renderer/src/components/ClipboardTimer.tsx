import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';

interface ClipboardTimerProps {
  duration?: number; // default 15 seconds
  onComplete?: () => void;
}

export const ClipboardTimer: React.FC<ClipboardTimerProps> = ({
  duration = 15,
  onComplete
}) => {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    setTimeLeft(duration);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (onComplete) onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [duration, onComplete]);

  const percentage = (timeLeft / duration) * 100;

  if (timeLeft === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce-short">
      <div className="glass-card px-4 py-3 rounded-xl border border-sky-500/30 flex items-center gap-3 shadow-2xl bg-slate-900/90 backdrop-blur-xl">
        <div className="relative w-8 h-8 flex items-center justify-center">
          <svg className="w-8 h-8 transform -rotate-90">
            <circle
              cx="16"
              cy="16"
              r="13"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-slate-800"
              fill="transparent"
            />
            <circle
              cx="16"
              cy="16"
              r="13"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-sky-400 transition-all duration-1000 ease-linear"
              fill="transparent"
              strokeDasharray={81.68}
              strokeDashoffset={81.68 - (81.68 * percentage) / 100}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-[11px] font-bold text-sky-400">
            {timeLeft}s
          </span>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> Password Copied!
          </div>
          <span className="text-[11px] text-slate-400">
            Auto-wiping clipboard in {timeLeft} seconds
          </span>
        </div>
      </div>
    </div>
  );
};
