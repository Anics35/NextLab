import Topbar from './Topbar';

function AppLayout({ sidebar, children, user, onLogout }) {
  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      <Topbar user={user} onLogout={onLogout} />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[260px] shrink-0 border-r border-white/[0.06] bg-[#0a0a0a] overflow-y-auto">
          {sidebar}
        </aside>
        <main className="flex-1 overflow-y-auto bg-[#050505] px-6 py-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
