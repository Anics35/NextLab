import { useState } from 'react';
import { ChevronDown, LogOut, Settings, User } from 'lucide-react';
import UserProfileModal from './UserProfileModal';

function Topbar({ user, onLogout }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);

  const userName = currentUser?.name || 'User';
  const userEmail = currentUser?.email || 'No email';
  const userRole = currentUser?.role || 'Unknown';

  const handleSettingsClick = () => {
    setIsDropdownOpen(false);
    setShowProfileModal(true);
  };

  const handleProfileUpdate = (updatedUser) => {
    setCurrentUser(updatedUser);
  };

  return (
    <>
      <div className="sticky top-0 z-40 border-b border-gray-800 bg-[#0a0a0a]">
        <div className="h-16 px-6 flex items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#ffa116] flex items-center justify-center text-black font-bold text-sm">
              NL
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-white">NextLab</p>
              <p className="text-xs text-gray-400">Proctor Platform</p>
            </div>
          </div>

          {/* Right: User Info & Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-800 bg-[#111] hover:bg-[#1a1a1a] transition-colors group"
            >
              <div className="flex-col hidden sm:flex text-right">
                <p className="text-sm font-medium text-white">{userName}</p>
                <p className="text-xs text-gray-400">{userRole}</p>
              </div>
              <div className="flex-col text-right flex sm:hidden">
                <p className="text-xs text-gray-400">{userRole}</p>
              </div>
              <ChevronDown
                size={16}
                className={`text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-800 bg-[#0a0a0a] shadow-lg overflow-hidden">
                {/* User Info Section */}
                <div className="px-4 py-3 border-b border-gray-800 bg-[#111]">
                  <p className="text-sm font-semibold text-white">{userName}</p>
                  <p className="text-xs text-gray-400 mt-1 break-words">{userEmail}</p>
                  <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 rounded-md bg-[#ffa116]/10 border border-[#ffa116]/20">
                    <User size={12} className="text-[#ffa116]" />
                    <span className="text-xs font-medium text-[#ffa116]">{userRole.charAt(0).toUpperCase() + userRole.slice(1)}</span>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  <button
                    type="button"
                    className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-[#111] flex items-center gap-3 group"
                    onClick={handleSettingsClick}
                  >
                    <Settings size={16} className="text-gray-400 group-hover:text-gray-300" />
                    Settings
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onLogout?.();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3 group border-t border-gray-800"
                  >
                    <LogOut size={16} className="text-red-400 group-hover:text-red-300" />
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
