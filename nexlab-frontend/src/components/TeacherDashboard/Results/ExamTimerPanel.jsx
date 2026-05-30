import { useEffect, useState, useMemo, useRef } from 'react';
import { Clock, Timer } from 'lucide-react';

function ExamTimerPanel({ exam, isExamLiveWindow }) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const serverOffsetRef = useRef(0);

  useEffect(() => {
    if (exam?.serverTime) {
      serverOffsetRef.current = new Date(exam.serverTime).getTime() - Date.now();
    } else {
      serverOffsetRef.current = 0;
    }
  }, [exam?.serverTime]);

  const timerInfo = useMemo(() => {
    if (!exam?.startTime || !exam?.endTime) {
      return { status: 'invalid', displayTime: '--:--:--' };
    }

    const now = Date.now() + (serverOffsetRef.current || 0);
    const startTime = new Date(exam.startTime).getTime();
    const endTime = new Date(exam.endTime).getTime();

    if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
      return { status: 'invalid', displayTime: '--:--:--' };
    }

    if (now < startTime) {
      return {
        status: 'not_started',
        displayTime: 'Waiting to start',
        remainingSeconds: Math.max(0, Math.floor((startTime - now) / 1000))
      };
    }

    if (now > endTime) {
      return { status: 'ended', displayTime: 'Exam ended', remainingSeconds: 0 };
    }

    const remainingMs = endTime - now;
    const remainingSeconds = Math.floor(remainingMs / 1000);

    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;

    const displayTime = `${remainingSeconds} sec`;
    const compactClock = [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0')
    ].join(':');

    let status = 'ongoing';
    if (remainingSeconds <= 300) {
      status = 'critical';
    } else if (remainingSeconds <= 900) {
      status = 'warning';
    }

    return { status, displayTime, compactClock, remainingSeconds };
  }, [exam, timeRemaining]);

  useEffect(() => {
    if (!exam?.startTime || !exam?.endTime) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [exam?.startTime, exam?.endTime]);

  const getStatusColor = () => {
    if (timerInfo.status === 'critical') return 'text-red-400';
    if (timerInfo.status === 'warning') return 'text-amber-400';
    if (timerInfo.status === 'ended') return 'text-white/30';
    if (timerInfo.status === 'not_started') return 'text-white/30';
    return 'text-emerald-400';
  };

  const getBorderColor = () => {
    if (timerInfo.status === 'critical') return 'border-red-500/20';
    if (timerInfo.status === 'warning') return 'border-amber-500/20';
    if (timerInfo.status === 'ended') return 'border-white/[0.06]';
    if (timerInfo.status === 'not_started') return 'border-white/[0.06]';
    return 'border-emerald-500/20';
  };

  const getBgColor = () => {
    if (timerInfo.status === 'critical') return 'bg-red-500/5';
    if (timerInfo.status === 'warning') return 'bg-amber-500/5';
    if (timerInfo.status === 'ended') return 'bg-white/[0.02]';
    if (timerInfo.status === 'not_started') return 'bg-white/[0.02]';
    return 'bg-emerald-500/5';
  };

  const getIconBg = () => {
    if (timerInfo.status === 'critical') return 'bg-red-500/10 text-red-400';
    if (timerInfo.status === 'warning') return 'bg-amber-500/10 text-amber-400';
    if (timerInfo.status === 'ended') return 'bg-white/[0.04] text-white/30';
    if (timerInfo.status === 'not_started') return 'bg-white/[0.04] text-white/30';
    return 'bg-emerald-500/10 text-emerald-400';
  };

  const getStatusLabel = () => {
    if (timerInfo.status === 'critical') return 'Critical';
    if (timerInfo.status === 'warning') return 'Warning';
    if (timerInfo.status === 'ongoing') return 'Running';
    if (timerInfo.status === 'ended') return 'Ended';
    if (timerInfo.status === 'not_started') return 'Waiting';
    return 'Unknown';
  };

  const getStatusMessage = () => {
    if (timerInfo.status === 'critical') return 'Final minutes — monitor submissions closely.';
    if (timerInfo.status === 'warning') return 'Time is running down.';
    if (timerInfo.status === 'ongoing') return 'Exam in progress.';
    if (timerInfo.status === 'ended') return 'Session closed.';
    if (timerInfo.status === 'not_started') return 'Waiting for the exam to begin.';
    return 'Timer not available.';
  };

  return (
    <div className={`overflow-hidden rounded-2xl border ${getBorderColor()} ${getBgColor()}`}>
      <div className="flex items-center gap-4 px-5 py-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${getIconBg()}`}>
          {timerInfo.status === 'critical' ? <Timer size={22} /> : <Clock size={22} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Exam Timer</p>
          <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1">
            <p className={`text-2xl font-bold tabular-nums ${getStatusColor()}`}>
              {timerInfo.compactClock || timerInfo.displayTime}
            </p>
            {timerInfo.compactClock && (
              <p className="pb-0.5 text-xs text-white/30">{timerInfo.displayTime}</p>
            )}
          </div>
          <p className="mt-1 text-xs text-white/35">{getStatusMessage()}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">State</p>
          <div className="mt-1 flex items-center gap-1.5">
            {timerInfo.status === 'ongoing' && (
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
            {timerInfo.status === 'critical' && (
              <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
            )}
            <p className={`text-sm font-semibold ${getStatusColor()}`}>
              {getStatusLabel()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExamTimerPanel;
