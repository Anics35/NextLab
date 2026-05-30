export const TABS = ['courses', 'question-bank', 'exams', 'notifications', 'results'];

export const DEFAULT_COURSE_FORM = {
  title: '',
  description: '',
  courseCode: '',
  year: new Date().getFullYear(),
  semester: 1
};

export const DEFAULT_EXAM_FORM = {
  title: '',
  courseId: '',
  instructions: '',
  duration: 60,
  timerType: 'global'
};

export const DEFAULT_PROBLEM_FORM = {
  title: '',
  description: '',
  difficulty: 'easy',
  problemType: 'testcase',
  publicTestCases: [{ input: '', output: '' }],
  hiddenTestCases: [{ input: '', output: '' }]
};

export const inputClass = 'w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-all duration-200 focus:border-amber-500/40 focus:bg-white/[0.05] focus:ring-1 focus:ring-amber-500/20';

export const cardClass = 'rounded-2xl border border-white/[0.06] bg-[#111113] p-6 shadow-sm';

export const difficultyBadgeClass = (difficulty) => {
  const level = String(difficulty || '').toLowerCase();
  if (level === 'easy') return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
  if (level === 'medium') return 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
  if (level === 'hard') return 'bg-red-500/15 text-red-300 border border-red-500/30';
  return 'bg-white/5 text-white/50 border border-white/10';
};
