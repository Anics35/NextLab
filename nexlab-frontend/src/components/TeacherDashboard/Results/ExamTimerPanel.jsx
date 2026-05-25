import { useEffect, useState, useMemo, useRef } from 'react';
import { Clock } from 'lucide-react';

function ExamTimerPanel({ exam, isExamLiveWindow }) {
  const [timeRemaining, setTimeRemaining] = useState(0);

  const serverOffsetRef = useRef(0);

  useEffect(() => {
    // Capture a stable offset between server time and client receipt time when
    // the exam prop changes. This avoids recomputing offset against the current
    // Date.now() (which would freeze the timer as explained in comments).
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

    // Use the stable server offset to compute a running "now" that approximates
    // the server clock. This lets the timer continue advancing after page reloads
    // or when the exam object is deserialized from a cached source.
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

    // Determine time status
    let status = 'ongoing';
    if (remainingSeconds <= 300) {
      status = 'critical'; // Last 5 minutes
    } else if (remainingSeconds <= 900) {
      status = 'warning'; // Last 15 minutes
    }

    return { status, displayTime, compactClock, remainingSeconds };
  }, [exam, timeRemaining]);

  useEffect(() => {
    // Keep the timer ticking when we have valid exam timestamps so it can count
    // down to start, run during the exam, and show remaining time after end.
    if (!exam?.startTime || !exam?.endTime) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [exam?.startTime, exam?.endTime]);

  const getStatusColor = () => {
    if (timerInfo.status === 'critical') return 'text-red-500';
    if (timerInfo.status === 'warning') return 'text-yellow-500';
    if (timerInfo.status === 'ended') return 'text-gray-500';
    if (timerInfo.status === 'not_started') return 'text-gray-500';
    return 'text-green-500';
  };

  const getBackgroundColor = () => {
    if (timerInfo.status === 'critical') return 'bg-red-500 bg-opacity-10 border-red-500';
    if (timerInfo.status === 'warning') return 'bg-yellow-500 bg-opacity-10 border-yellow-500';
    if (timerInfo.status === 'ended') return 'bg-gray-500 bg-opacity-10 border-gray-500';
    if (timerInfo.status === 'not_started') return 'bg-gray-500 bg-opacity-10 border-gray-500';
    return 'bg-green-500 bg-opacity-10 border-green-500';
  };

  return (
    <div className={`overflow-hidden rounded-2xl border p-0 ${getBackgroundColor()}`}>
      <div className="flex items-center gap-4 bg-black/20 px-5 py-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${getBackgroundColor()} bg-black/30`}>
          <Clock className={`h-6 w-6 ${getStatusColor()}`} />
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Exam Timer</p>
          <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1">
            <p className={`text-3xl font-semibold tabular-nums ${getStatusColor()}`}>
              {timerInfo.displayTime}
            </p>
            {timerInfo.compactClock ? <p className="pb-1 text-sm text-gray-400">{timerInfo.compactClock}</p> : null}
          </div>
          <p className="mt-1 text-sm text-gray-400">
            {timerInfo.status === 'critical' && 'Final minutes. Keep attention on submissions.'}
            {timerInfo.status === 'warning' && 'Time is running down.'}
            {timerInfo.status === 'ongoing' && 'Live exam in progress.'}
            {timerInfo.status === 'ended' && 'Session closed.'}
            {timerInfo.status === 'not_started' && 'Waiting for the exam to begin.'}
            {timerInfo.status === 'invalid' && 'Timer not available.'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.24em] text-gray-500">State</p>
          <p className={`mt-1 text-sm font-semibold ${getStatusColor()}`}>
            {timerInfo.status === 'critical' && 'Critical'}
            {timerInfo.status === 'warning' && 'Warning'}
            {timerInfo.status === 'ongoing' && 'Running'}
            {timerInfo.status === 'ended' && 'Ended'}
            {timerInfo.status === 'not_started' && 'Waiting'}
            {timerInfo.status === 'invalid' && 'Invalid'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ExamTimerPanel;
