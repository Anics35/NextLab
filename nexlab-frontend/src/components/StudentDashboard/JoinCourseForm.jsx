import { LoaderCircle, ArrowRight } from 'lucide-react';

function JoinCourseForm({ inviteCode, setInviteCode, onSubmit, isLoading }) {
  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(inviteCode);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <div className="relative flex-1">
        <input
          type="text"
          value={inviteCode}
          onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
          placeholder="Enter invite code (e.g. ABC123)"
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-all duration-200 focus:border-amber-500/40 focus:bg-white/[0.05] focus:ring-1 focus:ring-amber-500/20"
        />
        {inviteCode && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">
            {inviteCode.length} chars
          </span>
        )}
      </div>
      <button
        type="submit"
        disabled={isLoading || !inviteCode.trim()}
        className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-bold text-black shadow-lg shadow-amber-500/20 transition-all duration-200 hover:shadow-amber-500/30 hover:brightness-110 disabled:opacity-40 disabled:shadow-none disabled:hover:brightness-100"
      >
        {isLoading ? (
          <>
            <LoaderCircle size={16} className="animate-spin" />
            Joining...
          </>
        ) : (
          <>
            Join
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </button>
    </form>
  );
}

export default JoinCourseForm;
