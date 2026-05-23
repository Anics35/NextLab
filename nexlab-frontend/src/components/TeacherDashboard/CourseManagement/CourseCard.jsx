function CourseCard({ course, onSelect }) {
  return (
    <article className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-4">
      <p className="text-white font-semibold mb-4">{course.title}</p>
      <p className="text-sm text-gray-400">Invite code</p>
      <p className="text-[#ffa116] mb-4">{course.inviteCode || '-'}</p>
      <p className="text-sm text-gray-400 mb-4">Students: {course.students?.length || 0}</p>
      <button
        type="button"
        className="bg-[#ffa116] text-black px-4 py-2 rounded-md hover:bg-orange-500"
        onClick={() => onSelect?.(course._id)}
      >
        Select
      </button>
    </article>
  );
}

export default CourseCard;
