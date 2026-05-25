import { useEffect, useState } from 'react';
import { ChevronDown, LogOut, Settings } from 'lucide-react';
import UserProfileModal from './UserProfileModal';

function Topbar({ user, onLogout }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);

  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  const userName = currentUser?.name || 'User';
  const userEmail = currentUser?.email || 'No email';
  const userRole = currentUser?.role || 'Unknown';
  const rollNumber = currentUser?.role === 'student' ? currentUser?.rollNumber : '';
  const displayRole = userRole.charAt(0).toUpperCase() + userRole.slice(1);
  const userInitial = userName.trim().charAt(0).toUpperCase() || 'U';

  const handleSettingsClick = () => {
    setIsDropdownOpen(false);
    setShowProfileModal(true);
  };

  const handleProfileUpdate = (updatedUser) => {
    setCurrentUser(updatedUser);
  };

  return (
    <>
      <div className="sticky top-0 z-40 border-b border-white/10 bg-[#070707]/95 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.18)]">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6">
          {/* Left: Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#f97316] text-sm font-bold text-black shadow-[0_10px_25px_rgba(245,158,11,0.24)]">
              NL
            </div>
            <div className="hidden sm:block leading-tight">
              <p className="text-sm font-semibold tracking-wide text-white">NextLab</p>
              <p className="text-[11px] text-white/45">Proctor Platform</p>
            </div>
          </div>

          {/* Right: User Info & Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="group flex min-w-[170px] items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-white/5"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-white/12 to-white/5 text-sm font-semibold text-white ring-1 ring-white/10">
                {userInitial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="hidden sm:block truncate text-sm font-semibold leading-tight text-white">{userName}</div>
                <div className="hidden sm:block truncate text-xs text-white/55">{displayRole}{rollNumber ? ` • Roll ${rollNumber}` : ''}</div>
                <div className="sm:hidden truncate text-xs text-white/55">{displayRole}{rollNumber ? ` • Roll ${rollNumber}` : ''}</div>
              </div>
              <ChevronDown
                size={16}
                className={`shrink-0 text-white/40 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-3 w-72 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0b]/95 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                {/* User Info Section */}
                <div className="border-b border-white/10 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f59e0b] to-[#f97316] text-sm font-bold text-black shadow-[0_12px_24px_rgba(245,158,11,0.18)]">
                      {userInitial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{userName}</p>
                      <p className="truncate text-xs text-white/45">{userEmail}</p>
                      <p className="mt-1 truncate text-xs text-white/60">{displayRole}{rollNumber ? ` • Roll ${rollNumber}` : ''}</p>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-white/80 transition-colors hover:bg-white/5 hover:text-white"
                    onClick={handleSettingsClick}
                  >
                    <Settings size={16} className="text-white/35" />
                    Settings
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onLogout?.();
                    }}
                    className="flex w-full items-center gap-3 border-t border-white/10 px-4 py-3 text-left text-sm text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200"
                  >
                    <LogOut size={16} className="text-red-300" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Profile Modal */}
      {showProfileModal && (
        <UserProfileModal 
          user={currentUser} 
          onClose={() => setShowProfileModal(false)}
          onProfileUpdate={handleProfileUpdate}
        />
      )}
    </>
  );
}

export default Topbar;
