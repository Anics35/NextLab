import { useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, Clock, Info, Shield, X } from 'lucide-react';
import { getProctorEventsByExam } from '../services/api';
import { toast } from 'react-hot-toast';

function ProctorAlerts({ examId, studentId, studentName, isOpen, onClose }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && examId && studentId) {
      loadProctorAlerts();
    }
  }, [isOpen, examId, studentId]);

  const loadProctorAlerts = async () => {
    setLoading(true);
    try {
      const data = await getProctorEventsByExam(examId);
      const studentAlerts = (data.events || []).filter(
        event => event.studentId === studentId
      );
      setAlerts(studentAlerts);
    } catch (error) {
      toast.error(error.message || 'Unable to load proctor alerts.');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity) => {
    if (severity === 'warning') return <AlertTriangle size={16} className="text-amber-400" />;
    if (severity === 'error') return <AlertCircle size={16} className="text-red-400" />;
    return <Info size={16} className="text-indigo-400" />;
  };

  const getSeverityStyle = (severity) => {
    if (severity === 'warning') return 'border-amber-500/20 bg-amber-500/5';
    if (severity === 'error') return 'border-red-500/20 bg-red-500/5';
    return 'border-indigo-500/20 bg-indigo-500/5';
  };

  const getEventTypeLabel = (type) => {
    const labels = {
      tab_switch: 'Tab Switch',
      copy_attempt: 'Copy Attempt',
      paste_attempt: 'Paste Attempt',
      fullscreen_exit: 'Fullscreen Exit',
    };
    return labels[type] || type;
  };

  const getEventTypeIcon = (type) => {
    const icons = {
      tab_switch: '🔀',
      copy_attempt: '📋',
      paste_attempt: '📌',
      fullscreen_exit: '⛔',
    };
    return icons[type] || '⚠️';
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111113] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Proctor Alerts</h2>
              <p className="text-xs text-white/40">Student: <span className="text-white/60">{studentName}</span></p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-white/30 transition-colors hover:bg-white/[0.05] hover:text-white/60"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <Shield size={24} className="text-white/15" />
              </div>
              <p className="text-sm text-white/30">No proctor alerts for this student</p>
              <p className="text-xs text-white/20">All clear — no suspicious activity detected</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border p-4 transition-all ${getSeverityStyle(alert.severity)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {getSeverityIcon(alert.severity)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-white">
                          {getEventTypeIcon(alert.type)} {getEventTypeLabel(alert.type)}
                        </p>
                        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-white/35">
                          <Clock size={10} />
                          {formatTime(alert.createdAt)}
                        </span>
                      </div>
                      {alert.message && (
                        <p className="mt-1 text-xs text-white/50">{alert.message}</p>
                      )}
                      {alert.meta && Object.keys(alert.meta).length > 0 && (
                        <div className="mt-2 rounded-lg bg-black/20 p-2 space-y-1">
                          {Object.entries(alert.meta).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-[11px]">
                              <span className="text-white/30">{key}</span>
                              <span className="font-mono text-white/50">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/[0.06] px-6 py-4">
          <p className="text-xs text-white/30">
            Total: <span className="font-semibold text-white/60">{alerts.length}</span> alert{alerts.length !== 1 ? 's' : ''}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2 text-sm font-bold text-black shadow-lg shadow-amber-500/20 transition-all hover:brightness-110"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProctorAlerts;
