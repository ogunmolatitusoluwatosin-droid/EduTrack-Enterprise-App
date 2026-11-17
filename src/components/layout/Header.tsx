import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../db/storage';
import {
  Search,
  Menu,
  Bell,
  Calendar,
  LogOut,
  ChevronDown,
  ShieldCheck,
  User as UserIcon,
  KeyRound,
} from 'lucide-react';
import { StatusBadge } from '../common/Badge';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onOpenSearch: () => void;
  onNavigateProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  onOpenSearch,
  onNavigateProfile,
}) => {
  const { user, role, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isChangePassModalOpen, setIsChangePassModalOpen] = useState(false);

  const activeSession = db.getActiveSession();
  const activeTerm = db.getActiveTerm();

  return (
    <header className="h-16 sticky top-0 z-30 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-8">
      <div className="flex items-center gap-4 flex-1">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search Bar Input / Trigger */}
        <div className="relative w-full max-w-sm sm:max-w-md">
          <button
            type="button"
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between pl-3 pr-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500 hover:bg-gray-100/70 hover:border-gray-300 text-sm transition-colors"
          >
            <span className="flex items-center gap-2.5">
              <Search className="w-4 h-4 text-gray-400" />
              <span className="truncate text-xs sm:text-sm">Search records...</span>
            </span>
            <span className="hidden sm:inline-flex items-center text-[10px] font-mono font-medium px-1.5 py-0.5 bg-white border border-gray-200 text-gray-400 rounded">
              ⌘K
            </span>
          </button>
        </div>
      </div>

      {/* Right Controls: Academic Session Context, Role Badge & User Avatar */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="hidden lg:flex items-center text-sm text-gray-500 gap-1.5">
          <span>Academic Session:</span>
          <span className="font-semibold text-gray-900">{activeSession?.name || 'No Active Session'}</span>
          <span className="text-gray-300">•</span>
          <span className="text-gray-700 font-medium">{activeTerm?.name || 'No Term Set'}</span>
        </div>

        <div className="hidden lg:block h-6 w-px bg-gray-200" />

        {/* Current Role Indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-md border border-gray-200 text-xs font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden sm:inline">Role:</span>
          <span className="capitalize font-semibold text-gray-900">
            {role?.label || (role?.name || user?.role || 'User').replace(/_/g, ' ')}
          </span>
        </div>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded-md transition"
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center font-semibold text-xs">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
          </button>

          {showProfileMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
              <div className="absolute right-0 mt-2 w-60 bg-white rounded-lg shadow-lg border border-gray-200 py-1.5 z-50">
                <div className="px-4 py-2.5 border-b border-gray-100">
                  <div className="font-semibold text-sm text-gray-900 truncate">{user?.full_name}</div>
                  <div className="text-xs text-gray-500 truncate">{user?.email}</div>
                  <div className="mt-1.5">
                    <StatusBadge status={role?.name || 'user'} />
                  </div>
                </div>

                {onNavigateProfile && (
                  <button
                    onClick={() => {
                      onNavigateProfile();
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                  >
                    <UserIcon className="w-4 h-4 text-gray-400" />
                    <span>My Profile & Account</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsChangePassModalOpen(true);
                    setShowProfileMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-medium text-amber-700 hover:bg-amber-50 flex items-center gap-2 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  <span>Change Password</span>
                </button>

                <button
                  onClick={() => {
                    logout();
                    setShowProfileMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-gray-100 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Global Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePassModalOpen}
        onClose={() => setIsChangePassModalOpen(false)}
      />
    </header>
  );
};
