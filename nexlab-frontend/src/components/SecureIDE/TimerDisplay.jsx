import { Clock } from 'lucide-react';
import { formatTime } from './constants';

function TimerDisplay({ remainingTime, perProblemTimeLeft, isPerProblemTimer, problemTimerExpired }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
          remainingTime <= 60 ? 'border-red-500/30 text-red-400' : 'border-white/15 text-white/80'
        }`}
      >
        <Clock size={14} />
        Global {formatTime(remainingTime)}
      </div>
      {isPerProblemTimer ? (
        <div
          className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
            problemTimerExpired ? 'border-red-500/30 text-red-400' : 'border-indigo-500/30 text-indigo-300'
          }`}
        >
          <Clock size={14} />
          Problem {formatTime(perProblemTimeLeft)}
        </div>
      ) : null}
    </div>
  );
}

export default TimerDisplay;
