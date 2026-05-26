import { useState } from 'react';
import { Bell, LoaderCircle, Megaphone } from 'lucide-react';
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
    <section className={cardClass}>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bell size={18} className="text-[#ffa116]" />
            Student Notifications
          </h2>
          <p className="mt-1 text-sm text-gray-400">Send a live message to students in a specific course.</p>
        </div>
        <div className="rounded-full border border-[#ffa116]/20 bg-[#ffa116]/10 px-3 py-1 text-xs font-medium text-[#fbbf24]">
          Live Broadcast
        </div>
      </div>

      <div className="grid gap-4">
        <div>
          <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-gray-400">
            Select Course *
          </label>
          <div className="space-y-2">
            <select
              value={selectedCourseId}
              onChange={(event) => {
                setSelectedCourseId(event.target.value);
                setSelectedStudentIds([]);
                setSendToAllStudents(false);
              }}
              className="w-full px-4 py-2.5 bg-[#0a0a0a] text-white border border-gray-700 rounded-lg hover:border-[#ffa116]/50 focus:border-[#ffa116] focus:ring-2 focus:ring-[#ffa116]/30 outline-none transition-all cursor-pointer text-sm"
            >
              <option value="">-- Select a course --</option>
              {courses.length > 0 ? (
                courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.title}
                  </option>
                ))
              ) : (
                <option value="" disabled>
                  No courses available
                </option>
              )}
            </select>
            {selectedCourseId && (
              <div className="flex items-center gap-2 px-3 py-2 bg-[#ffa116]/10 border border-[#ffa116]/30 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-[#fbbf24]" />
                <span className="text-xs text-[#fbbf24] font-medium">
                  Notifications for: <span className="font-semibold">{selectedCourse?.title}</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {selectedCourseId && (
          <div className="grid gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Select Student Targets *
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-gray-300">
                <input
                  type="checkbox"
                  checked={sendToAllStudents}
                  onChange={(event) => {
                    setSendToAllStudents(event.target.checked);
                    if (event.target.checked) {
                      setSelectedStudentIds([]);
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-600 bg-[#0a0a0a] text-[#ffa116] focus:ring-[#ffa116]"
                />
                Send to all students in this course
              </label>
            </div>

            {!sendToAllStudents && (
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    Selected: <span className="text-[#fbbf24] font-semibold">{selectedStudentIds.length}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedStudentIds(courseStudents.map((student) => String(student._id || student.id)))}
                      disabled={courseStudents.length === 0}
                      className="rounded-md border border-white/15 px-2 py-1 text-[11px] text-gray-300 hover:bg-white/5 disabled:opacity-50"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedStudentIds([])}
                      disabled={selectedStudentIds.length === 0}
                      className="rounded-md border border-white/15 px-2 py-1 text-[11px] text-gray-300 hover:bg-white/5 disabled:opacity-50"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="max-h-[220px] overflow-y-auto rounded-lg border border-gray-700 bg-[#0a0a0a] p-2">
                  {courseStudents.length > 0 ? (
                    courseStudents.map((student) => {
                      const studentId = String(student._id || student.id);
                      const isChecked = selectedStudentIds.includes(studentId);

                      return (
                        <label
                          key={studentId}
                          className="mb-1 flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-2 text-sm text-gray-200 hover:bg-white/5"
                        >
                          <span className="truncate">
                            {student.name}
                            {student.rollNumber ? ` (${student.rollNumber})` : ''}
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
                            className="h-4 w-4 rounded border-gray-600 bg-[#111] text-[#ffa116] focus:ring-[#ffa116]"
                          />
                        </label>
                      );
                    })
                  ) : (
                    <p className="px-2 py-3 text-sm text-gray-400">No enrolled students in this course</p>
                  )}
                </div>
              </div>
            )}

            <p className="text-[11px] text-gray-400">
              {sendToAllStudents
                ? `This notification will be sent to all ${courseStudents.length} students in this course.`
                : 'Select one or more students using the checkboxes.'}
            </p>
          </div>
        )}

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">Title (optional)</label>
          <input
            className={inputClass}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Announcement title"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">Message *</label>
          <textarea
            className={`${inputClass} min-h-[140px] resize-none`}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Write the notification message students should see..."
          />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3 text-sm text-gray-300">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ffa116]/10 text-[#fbbf24]">
              <Megaphone size={18} />
            </div>
            <div>
              <p className="font-medium text-white">Broadcast to course students</p>
              <p className="text-xs text-gray-400">Students receive this instantly on their dashboard for up to 45 seconds.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSend}
            disabled={
              isSending ||
              !selectedCourseId ||
              !message.trim() ||
              (!sendToAllStudents && selectedStudentIds.length === 0)
            }
            className="inline-flex items-center gap-2 rounded-lg bg-[#ffa116] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#ffb33d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSending ? <LoaderCircle size={16} className="animate-spin" /> : <Bell size={16} />}
            {isSending ? 'Sending...' : 'Send Notification'}
          </button>
        </div>
      </div>
    </section>
  );
}

export default NotificationsTab;
