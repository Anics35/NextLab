import { useState, useEffect, useMemo, useCallback } from 'react';
import { getEnrolledStudents, updateExamVisibility } from '../../../services/api';
import toast from 'react-hot-toast';
import { X, Check, Users } from 'lucide-react';

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
        // Check if all are already selected
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
      toast.success('Exam visibility updated successfully.');
      onSuccess?.();
      onClose?.();
    } catch (error) {
      toast.error(error.message || 'Unable to update exam visibility.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl w-full max-w-2xl max-h-96 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#ffa116]" />
            <h2 className="text-lg font-semibold">Publish Exam to Students</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && <p className="text-gray-400">Loading students...</p>}

          {!loading && enrolledStudents.length === 0 && (
            <p className="text-gray-400">No students enrolled in this course.</p>
          )}

          {!loading && enrolledStudents.length > 0 && (
            <div className="flex flex-col gap-3">
              {/* Select All Option */}
              <div className="bg-[#111] border border-gray-800 rounded-md p-3 flex items-center gap-3">
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="w-4 h-4 cursor-pointer accent-[#ffa116]"
                  />
                  <span className="font-medium">Select All Students</span>
                </label>
              </div>

              {/* Student List */}
              {enrolledStudents.map((student) => {
                const isSelected = visibleToStudents.some((sid) => String(sid) === String(student._id));
                return (
                  <div
                    key={student._id}
                    className="bg-[#111] border border-gray-800 rounded-md p-3 flex items-center gap-3 hover:border-gray-700 transition-colors"
                  >
                    <label className="flex items-center gap-3 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleStudent(student._id)}
                        className="w-4 h-4 cursor-pointer accent-[#ffa116]"
                      />
                      <div>
                        <p className="font-medium text-white">{student.name}</p>
                        <p className="text-sm text-gray-400">
                          {student.rollNumber} · Semester {student.semester}
                        </p>
                      </div>
                    </label>
                    {isSelected && <Check className="w-4 h-4 text-[#ffa116]" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-800 p-4 flex justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-300 hover:text-white bg-transparent border border-gray-700 rounded-md transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={loading || visibleToStudents.length === 0}
            className="px-4 py-2 bg-[#ffa116] text-black font-semibold rounded-md hover:bg-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? 'Publishing...' : 'Publish Exam'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExamPublishPanel;
