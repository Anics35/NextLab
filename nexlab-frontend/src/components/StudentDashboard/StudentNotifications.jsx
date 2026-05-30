import { Bell, Clock, X } from 'lucide-react';
import { useState, useEffect } from 'react';

function StudentNotifications({ notifications, onDismiss }) {
  const [timers, setTimers] = useState({});

  useEffect(() => {
    const intervalIds = {};

    notifications.forEach((notification) => {
      if (!intervalIds[notification.id]) {
        let remaining = 45;
        setTimers((prev) => ({ ...prev, [notification.id]: remaining }));

        const intervalId = setInterval(() => {
          remaining--;
          setTimers((prev) => ({ ...prev, [notification.id]: remaining }));
          if (remaining <= 0) {
            clearInterval(intervalId);
          }
        }, 1000);

        intervalIds[notification.id] = intervalId;
      }
    });

    return () => {
      Object.values(intervalIds).forEach((intervalId) => {
        clearInterval(intervalId);
      });
    };
  }, [notifications.length]);

  if (!notifications?.length) return null;

  return (
    <div className="fixed right-4 top-20 z-50 flex w-[min(92vw,380px)] flex-col gap-3">
      {notifications.map((notification) => {
        const timeLeft = timers[notification.id] ?? 0;
        const isExpiring = timeLeft <= 10;

        return (
          <article
            key={notification.id}
            className="overflow-hidden rounded-2xl border border-amber-500/20 bg-[#111113]/95 shadow-2xl shadow-black/40 backdrop-blur-xl"
          >
            {/* Header */}
            <div className="flex items-start gap-3 border-b border-white/[0.06] bg-gradient-to-r from-amber-500/10 to-transparent px-4 py-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                <Bell size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{notification.title || 'Announcement'}</p>
                    <p className="mt-0.5 text-[11px] text-white/35">From {notification.senderName || 'Teacher'}</p>
                    {notification.courseTitle && (
                      <p className="mt-0.5 text-[11px] text-amber-400/70">{notification.courseTitle}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onDismiss?.(notification.id)}
                    className="shrink-0 rounded-lg p-1 text-white/30 transition-colors hover:bg-white/[0.05] hover:text-white/60"
                    aria-label="Dismiss notification"
                  >
                    <X size={14} />
                  </button>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{notification.message}</p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] text-white/30">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                Live
              </span>
              <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${
                isExpiring ? 'text-red-400' : 'text-white/30'
              }`}>
                <Clock size={10} />
                {timeLeft > 0 ? `${timeLeft}s` : 'Expiring'}
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default StudentNotifications;
