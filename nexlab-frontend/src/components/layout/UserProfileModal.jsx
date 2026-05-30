import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { X, Edit2, Save, AlertCircle, LoaderCircle } from 'lucide-react';

function UserProfileModal({ user, onClose, onProfileUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    rollNumber: user?.rollNumber || '',
    semester: user?.semester || ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        rollNumber: user.rollNumber || '',
        semester: user.semester || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Name cannot be empty.');
      return;
    }

    setIsSaving(true);
    try {
      const { updateProfile } = await import('../../services/api');
      await updateProfile({
        name: formData.name.trim(),
        rollNumber: formData.rollNumber.trim(),
        semester: formData.semester.trim()
      });
      
      toast.success('Profile updated successfully.');
      setIsEditing(false);
      
      // Update stored user info
      const updatedUser = { ...user, ...formData };
      const serializedUser = JSON.stringify(updatedUser);
      localStorage.setItem('user', serializedUser);
      sessionStorage.setItem('user', serializedUser);
      
      onProfileUpdate?.(updatedUser);
    } catch (error) {
      toast.error(error.message || 'Unable to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmSave = async () => {
    setShowSaveConfirm(false);
    await handleSave();
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      rollNumber: user?.rollNumber || '',
      semester: user?.semester || ''
    });
    setIsEditing(false);
  };

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-[#111] border border-gray-700 text-white text-sm focus:border-[#ffa116] focus:outline-none transition-colors';
  const labelClass = 'text-xs font-semibold text-gray-300 mb-1 block';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-white/15 bg-[#101010] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-800 bg-[#0a0a0a] px-6 py-4">
          <h3 className="text-lg font-semibold text-white">User Profile</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg hover:bg-white/10 p-1 transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Role Badge */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ffa116]/10 border border-[#ffa116]/20">
              <span className="text-xs font-medium text-[#ffa116]">
                {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
              </span>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className={labelClass}>Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={!isEditing}
                className={`${inputClass} ${!isEditing ? 'bg-gray-900 cursor-not-allowed opacity-70' : ''}`}
                placeholder="Enter full name"
              />
            </div>

            {/* Email (Read-only) */}
            <div>
              <label className={labelClass}>Email Address</label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-400 text-sm cursor-not-allowed opacity-60"
              />
              <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                <AlertCircle size={12} /> Email cannot be changed
              </p>
            </div>

            {/* Roll Number */}
            {user?.role === 'student' && (
              <div>
                <label className={labelClass}>Roll Number</label>
                <input
                  type="text"
                  name="rollNumber"
                  value={formData.rollNumber}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={`${inputClass} ${!isEditing ? 'bg-gray-900 cursor-not-allowed opacity-70' : ''}`}
                  placeholder="Enter roll number"
                />
              </div>
            )}

            {/* Semester */}
            {user?.role === 'student' && (
              <div>
                <label className={labelClass}>Semester</label>
                <input
                  type="text"
                  name="semester"
                  value={formData.semester}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={`${inputClass} ${!isEditing ? 'bg-gray-900 cursor-not-allowed opacity-70' : ''}`}
                  placeholder="Enter semester"
                />
              </div>
            )}

            {/* Phone - REMOVED per user request */}
          </div>

          {/* Info Box */}
          <div className="mt-6 rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
            <p className="text-xs text-blue-300">
              {isEditing 
                ? 'Click Save to update your profile information.'
                : 'Click Edit to modify your profile details.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex gap-3">
            {!isEditing ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex-1 rounded-lg bg-[#ffa116] px-4 py-2 text-sm font-medium text-black hover:bg-orange-500 transition-colors inline-flex items-center justify-center gap-2"
                >
                  <Edit2 size={14} /> Edit
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="flex-1 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setShowSaveConfirm(true)}
                  disabled={isSaving}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {isSaving ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showSaveConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111] shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
            <div className="border-b border-white/10 px-5 py-4">
              <h4 className="text-base font-semibold text-white">Save changes?</h4>
              <p className="mt-1 text-sm text-white/55">Do you want to update your profile information?</p>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4">
              <button
                type="button"
                onClick={() => setShowSaveConfirm(false)}
                disabled={isSaving}
                className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50"
              >
                No
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
              >
                {isSaving ? <LoaderCircle size={14} className="animate-spin" /> : null}
                Yes, Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserProfileModal;
