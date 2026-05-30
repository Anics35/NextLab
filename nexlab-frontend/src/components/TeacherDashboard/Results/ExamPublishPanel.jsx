import { useState, useEffect, useCallback } from 'react';
import { getEnrolledStudents, updateExamVisibility } from '../../../services/api';
import toast from 'react-hot-toast';
import { Check, LoaderCircle, Users, X } from 'lucide-react';

function ExamPublishPanel({ examId, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [visibleToStudents, setVisibleToStudents] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getEnrolledStudents(examId);
        setEnrolledStudents(data.enrolledStudents || []);
        setVisibleToStudents(data.visibleToStudents || []);
        if (data.visibleToStudents?.length === data.enrolledStudents?.length) {
          setSelectAll(true);
        }
      } catch (error) {
        toast.error(error.message || 'Unable to load students.');
      } finally {
        setLoading(false);
      }
    };
    if (examId) {
      void load();
    }
  }, [examId]);

  const handleToggleStudent = useCallback((studentId) => {
    setVisibleToStudents((prev) => {
      const exists = prev.some((sid) => String(sid) === String(studentId));
      if (exists) {
        return prev.filter((sid) => String(sid) !== String(studentId));
      }
      return [...prev, studentId];
    });
    setSelectAll(false);
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectAll) {
      setVisibleToStudents([]);
      setSelectAll(false);
    } else {
      setVisibleToStudents(enrolledStudents.map((s) => s._id));
      setSelectAll(true);
    }
  }, [selectAll, enrolledStudents]);

  const handlePublish = async () => {
    if (visibleToStudents.length === 0) {
      toast.error('Select at least one student.');
      return;
    }

    setLoading(true);
    try {
      await updateExamVisibility(examId, visibleToStudents);
      toast.success('Exam visibility updated.');
      onSuccess?.();
      onClose?.();
    } catch (error) {
      toast.error(error.message || 'Unable to update exam visibility.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="flex max-h-[500px] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111113] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Publish to Students</h2>
              <p className="text-xs text-white/40">Select which students can access this exam</p>
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
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            </div>
          )}

          {!loading && enrolledStudents.length === 0 && (
            <p className="py-12 text-center text-sm text-white/30">No students enrolled in this course.</p>
          )}

          {!loading && enrolledStudents.length > 0 && (
            <div className="space-y-2">
              {/* Select All */}
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04]">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/30"
                />
                <span className="text-sm font-medium text-white">Select All Students</span>
                <span className="ml-auto text-xs text-white/30">{enrolledStudents.length} total</span>
              </label>

              {/* Student List */}
              {enrolledStudents.map((student) => {
                const isSelected = visibleToStudents.some((sid) => String(sid) === String(student._id));
                return (
                  <label
                    key={student._id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all ${
                      isSelected
                        ? 'border-amber-500/20 bg-amber-500/5'
                        : 'border-white/[0.04] bg-white/[0.01] hover:border-white/[0.08] hover:bg-white/[0.03]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleStudent(student._id)}
                      className="h-4 w-4 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/30"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">{student.name}</p>
                      <p className="text-[11px] text-white/35">
                        {student.rollNumber} · Sem {student.semester}
                      </p>
                    </div>
                    {isSelected && <Check size={14} className="shrink-0 text-amber-400" />}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/[0.06] px-6 py-4">
          <p className="text-xs text-white/30">
            Selected: <span className="font-semibold text-amber-400">{visibleToStudents.length}</span> of {enrolledStudents.length}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white/60 transition-colors hover:bg-white/[0.06] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={loading || visibleToStudents.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2 text-sm font-bold text-black shadow-lg shadow-amber-500/20 transition-all hover:brightness-110 disabled:opacity-40 disabled:shadow-none"
            >
              {loading ? <LoaderCircle size={14} className="animate-spin" /> : <Users size={14} />}
              {loading ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExamPublishPanel;
