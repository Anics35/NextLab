function AppLayout({ sidebar, children }) {
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="flex min-h-screen">
        <aside className="w-[240px] bg-[#0a0a0a] border-r border-gray-800 p-4">{sidebar}</aside>
        <main className="flex-1 bg-[#050505] px-6 py-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
