import { AlertTriangle, Bell, Clock, X } from 'lucide-react';
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
    <div className="fixed right-4 top-20 z-50 flex w-[min(92vw,360px)] flex-col gap-3">
      {notifications.map((notification) => (
        <article
          key={notification.id}
          className="overflow-hidden rounded-2xl border border-[#f59e0b]/20 bg-[#111]/95 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        >
          <div className="flex items-start gap-3 border-b border-white/10 bg-gradient-to-r from-[#f59e0b]/15 to-transparent px-4 py-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f59e0b]/15 text-[#fbbf24]">
              <Bell size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{notification.title || 'Announcement'}</p>
                  <p className="mt-0.5 text-[11px] text-white/45">From {notification.senderName || 'Teacher'}</p>
                  {notification.courseTitle && (
                    <p className="mt-0.5 text-[11px] text-[#fbbf24]">Subject: {notification.courseTitle}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onDismiss?.(notification.id)}
                  className="rounded-lg p-1 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
                  aria-label="Dismiss notification"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="mt-2 text-sm leading-6 text-white/80">{notification.message}</p>
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-2 text-[11px] text-white/45">
            <span className="inline-flex items-center gap-1">
              <AlertTriangle size={12} className="text-[#fbbf24]" />
              Live message
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock size={12} />
              {timers[notification.id] ? `${timers[notification.id]}s` : '0s'}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

export default StudentNotifications;
