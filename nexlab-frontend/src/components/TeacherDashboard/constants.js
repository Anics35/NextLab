export const TABS = ['courses', 'question-bank', 'exams', 'results'];

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
  publicTestCases: [{ input: '', output: '' }],
  hiddenTestCases: [{ input: '', output: '' }]
};

export const inputClass = 'w-full bg-[#0a0a0a] border border-gray-700 rounded-md px-3 py-2 focus:ring-2 focus:ring-[#ffa116] outline-none text-white';
export const cardClass = 'bg-[#111] border border-gray-800 rounded-xl p-5 shadow-sm';

export const difficultyBadgeClass = (difficulty) => {
  const level = String(difficulty || '').toLowerCase();
  if (level === 'easy') return 'bg-green-500/20 text-green-300 border border-green-500/40';
  if (level === 'medium') return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40';
  if (level === 'hard') return 'bg-red-500/20 text-red-300 border border-red-500/40';
  return 'bg-gray-500/20 text-gray-300 border border-gray-500/40';
};
