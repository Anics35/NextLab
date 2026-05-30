import { useState } from 'react';
import { Bell, LoaderCircle, Megaphone, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { emitEvent } from '../../services/socket';
import { cardClass, inputClass } from './constants';

function NotificationsTab({ user, courses = [] }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [sendToAllStudents, setSendToAllStudents] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const selectedCourse = courses.find((course) => String(course._id) === String(selectedCourseId));
  const courseStudents = selectedCourse?.students || [];

  const handleSend = async () => {
    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      toast.error('Enter a notification message.');
      return;
    }

    if (!selectedCourseId) {
      toast.error('Select a course.');
      return;
    }

    if (!sendToAllStudents && selectedStudentIds.length === 0) {
      toast.error('Select at least one student.');
      return;
    }

    if (sendToAllStudents && courseStudents.length === 0) {
      toast.error('No students are enrolled in this course.');
      return;
    }

    setIsSending(true);
    try {
      emitEvent('teacher_notification', {
        title: trimmedTitle || 'Announcement',
        message: trimmedMessage,
        senderName: user?.name || 'Teacher',
        senderId: user?.id || user?._id || '',
        senderRole: user?.role || 'teacher',
        courseId: selectedCourseId,
        courseTitle: selectedCourse?.title || '',
        sendToAllStudents,
        targetStudentIds: sendToAllStudents
          ? courseStudents.map((student) => String(student._id || student.id))
          : selectedStudentIds,
        createdAt: new Date().toISOString()
      });
      toast.success('Notification sent successfully.');
      setTitle('');
      setMessage('');
      setSelectedCourseId('');
      setSelectedStudentIds([]);
      setSendToAllStudents(false);
    } catch (error) {
      toast.error(error.message || 'Unable to send notification.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell size={20} className="text-amber-400" />
            Notifications
          </h2>
          <p className="mt-1 text-sm text-white/40">Send live messages to students in a specific course.</p>
        </div>
        <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-400">
          Live Broadcast
        </span>
      </div>

      <div className={cardClass}>
        <div className="grid gap-5">
          {/* Course Selection */}
          <div>
            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-white/30">
              Select Course *
            </label>
            <select
              value={selectedCourseId}
              onChange={(event) => {
                setSelectedCourseId(event.target.value);
                setSelectedStudentIds([]);
                setSendToAllStudents(false);
              }}
              className={inputClass}
            >
              <option value="">-- Select a course --</option>
              {courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.title}
                </option>
              ))}
            </select>
            {selectedCourseId && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs text-amber-400">
                  Broadcasting to: <span className="font-semibold">{selectedCourse?.title}</span>
                </span>
              </div>
            )}
          </div>

          {/* Student Targets */}
          {selectedCourseId && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30">
                  Target Students *
                </label>
                <label className="inline-flex items-center gap-2 text-xs text-white/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendToAllStudents}
                    onChange={(event) => {
                      setSendToAllStudents(event.target.checked);
                      if (event.target.checked) setSelectedStudentIds([]);
                    }}
                    className="h-4 w-4 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/30"
                  />
                  All students
                </label>
              </div>

              {!sendToAllStudents && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs text-white/40">
                      Selected: <span className="text-amber-400 font-semibold">{selectedStudentIds.length}</span>
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedStudentIds(courseStudents.map((s) => String(s._id || s.id)))}
                        disabled={courseStudents.length === 0}
                        className="rounded-lg border border-white/[0.08] px-2 py-1 text-[10px] text-white/40 hover:bg-white/[0.04] disabled:opacity-50"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedStudentIds([])}
                        disabled={selectedStudentIds.length === 0}
                        className="rounded-lg border border-white/[0.08] px-2 py-1 text-[10px] text-white/40 hover:bg-white/[0.04] disabled:opacity-50"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-2">
                    {courseStudents.length > 0 ? (
                      courseStudents.map((student) => {
                        const studentId = String(student._id || student.id);
                        const isChecked = selectedStudentIds.includes(studentId);
                        return (
                          <label
                            key={studentId}
                            className="mb-1 flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/[0.04]"
                          >
                            <span className="truncate">
                              {student.name}{student.rollNumber ? ` (${student.rollNumber})` : ''}
                            </span>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(event) => {
                                if (event.target.checked) {
                                  setSelectedStudentIds((prev) => [...prev, studentId]);
                                } else {
                                  setSelectedStudentIds((prev) => prev.filter((id) => id !== studentId));
                                }
                              }}
                              className="h-4 w-4 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/30"
                            />
                          </label>
                        );
                      })
                    ) : (
                      <p className="px-3 py-4 text-center text-sm text-white/30">No students enrolled</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Title & Message */}
          <div>
            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-white/30">Title (optional)</label>
            <input
              className={inputClass}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Announcement title"
            />
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-white/30">Message *</label>
            <textarea
              className={`${inputClass} min-h-[120px] resize-none`}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Write the notification message..."
            />
          </div>

          {/* Send */}
          <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <Megaphone size={18} />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Broadcast</p>
                <p className="text-[11px] text-white/30">Students see this for 45 seconds.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending || !selectedCourseId || !message.trim() || (!sendToAllStudents && selectedStudentIds.length === 0)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-bold text-black shadow-lg shadow-amber-500/20 transition-all hover:brightness-110 disabled:opacity-40 disabled:shadow-none"
            >
              {isSending ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
              {isSending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default NotificationsTab;
