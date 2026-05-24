import Topbar from './Topbar';

function AppLayout({ sidebar, children, user, onLogout }) {
  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      <Topbar user={user} onLogout={onLogout} />
      <div className="flex flex-1">
        <aside className="w-[240px] bg-[#0a0a0a] border-r border-gray-800 p-4 overflow-y-auto">{sidebar}</aside>
        <main className="flex-1 bg-[#050505] px-6 py-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
