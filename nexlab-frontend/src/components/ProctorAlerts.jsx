import { useState, useEffect } from 'react';
import { AlertCircle, X, Clock, AlertTriangle, Info } from 'lucide-react';
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
      console.log('[ProctorAlerts] loaded events:', data);
      
      // Filter alerts for this specific student
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
    if (severity === 'warning') return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
    if (severity === 'error') return <AlertCircle className="w-5 h-5 text-red-400" />;
    return <Info className="w-5 h-5 text-blue-400" />;
  };

  const getSeverityBg = (severity) => {
    if (severity === 'warning') return 'bg-yellow-500/10 border-yellow-500/30';
    if (severity === 'error') return 'bg-red-500/10 border-red-500/30';
    return 'bg-blue-500/10 border-blue-500/30';
  };

  const getEventTypeLabel = (type) => {
    const labels = {
      tab_switch: '🔀 Tab Switch',
      copy_attempt: '📋 Copy Attempt',
      paste_attempt: '📌 Paste Attempt',
      fullscreen_exit: '⛔ Fullscreen Exit',
    };
    return labels[type] || type;
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800 bg-[#111]">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-orange-400" />
              Proctor Alerts
            </h2>
            <p className="text-sm text-gray-400 mt-1">for {studentName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border b-orange-400 border-t-transparent"></div>
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12">
              <Info className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No proctor alerts for this student</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${getSeverityBg(alert.severity)} transition-all hover:shadow-lg`}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">
                      {getSeverityIcon(alert.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-white">
                          {getEventTypeLabel(alert.type)}
                        </p>
                        <span className="text-xs text-gray-400 flex items-center gap-1 whitespace-nowrap">
                          <Clock className="w-3 h-3" />
                          {formatTime(alert.createdAt)}
                        </span>
                      </div>
                      {alert.message && (
                        <p className="text-sm text-gray-300 mt-1">{alert.message}</p>
                      )}
                      {alert.meta && Object.keys(alert.meta).length > 0 && (
                        <div className="mt-2 text-xs text-gray-400 space-y-1">
                          {Object.entries(alert.meta).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-gray-500">{key}:</span>
                              <span className="text-gray-300 font-mono">
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
        <div className="border-t border-gray-800 p-4 bg-[#111] flex justify-between items-center">
          <p className="text-sm text-gray-400">
            Total alerts: <span className="font-semibold text-white">{alerts.length}</span>
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#ffa116] hover:bg-[#ff8c00] text-black font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProctorAlerts;
