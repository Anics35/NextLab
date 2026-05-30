import { useState } from 'react';
import { Eye, EyeOff, LoaderCircle, LogIn, UserPlus } from 'lucide-react';
import { login, register as registerApi } from '../services/authService';

function AuthForm({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'student', rollNumber: '', semester: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const data = isLogin
        ? await login(formData.email, formData.password)
        : await registerApi(formData);
      onAuthSuccess(data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = 'w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-all duration-200 focus:border-amber-500/40 focus:bg-white/[0.05] focus:ring-1 focus:ring-amber-500/20';

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] px-4">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-amber-500/5 blur-[100px]" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-indigo-500/5 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-lg font-bold text-black shadow-xl shadow-amber-500/20">
            NL
          </div>
          <h1 className="text-2xl font-bold text-white">NextLab</h1>
          <p className="mt-1 text-sm text-white/40">Secure Proctored Exam Platform</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#111113] p-8 shadow-2xl shadow-black/40">
          {/* Tab Toggle */}
          <div className="mb-6 flex rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
                isLogin
                  ? 'bg-amber-500/15 text-amber-400 shadow-sm'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
                !isLogin
                  ? 'bg-amber-500/15 text-amber-400 shadow-sm'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              Register
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/30">Full Name</label>
                  <input
                    className={inputClass}
                    type="text"
                    placeholder="Enter your full name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/30">Role</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: 'student' })}
                      className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                        formData.role === 'student'
                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                          : 'border-white/[0.06] bg-white/[0.02] text-white/50 hover:border-white/[0.1]'
                      }`}
                    >
                      Student
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: 'teacher' })}
                      className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                        formData.role === 'teacher'
                          ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400'
                          : 'border-white/[0.06] bg-white/[0.02] text-white/50 hover:border-white/[0.1]'
                      }`}
                    >
                      Teacher
                    </button>
                  </div>
                </div>

                {formData.role === 'student' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/30">Roll Number</label>
                      <input
                        className={inputClass}
                        type="text"
                        placeholder="e.g. 2201"
                        required
                        value={formData.rollNumber}
                        onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/30">Semester</label>
                      <input
                        className={inputClass}
                        type="text"
                        placeholder="e.g. 4"
                        required
                        value={formData.semester}
                        onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/30">Email</label>
              <input
                className={inputClass}
                type="email"
                placeholder="you@example.com"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/30">Password</label>
              <div className="relative">
                <input
                  className={`${inputClass} pr-10`}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-sm font-bold text-black shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/30 hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100"
            >
              {isLoading ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : isLogin ? (
                <LogIn size={18} />
              ) : (
                <UserPlus size={18} />
              )}
              {isLoading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-white/30">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="font-medium text-amber-400 hover:text-amber-300 transition-colors"
            >
              {isLogin ? 'Register' : 'Sign In'}
            </button>
          </p>
        </div>

        {/* Bottom text */}
        <p className="mt-6 text-center text-[11px] text-white/20">
          Secure proctored environment · End-to-end encrypted
        </p>
      </div>
    </div>
  );
}

export default AuthForm;
