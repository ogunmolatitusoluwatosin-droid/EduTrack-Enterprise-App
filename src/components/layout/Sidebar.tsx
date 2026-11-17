import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../db/storage';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  Building2,
  CalendarDays,
  CalendarCheck2,
  FileSpreadsheet,
  BarChart3,
  ShieldAlert,
  Settings,
  BookOpen,
  UserCheck,
  LogOut,
  X,
  Sparkles,
} from 'lucide-react';

export type NavigationTab =
  | 'dashboard'
  | 'students'
  | 'staff'
  | 'classes'
  | 'academic_sessions'
  | 'attendance'
  | 'assessments'
  | 'reports'
  | 'users'
  | 'settings'
  | 'my_classes'
  | 'profile';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { role, isSuperAdmin, isSchoolAdmin, isTeacher, isStaff, logout, user } = useAuth();
  const settings = db.getSettings();
  const schoolName = settings.school_name || 'EduTrack';
  const schoolInitial = schoolName.charAt(0).toUpperCase();
  const schoolSubtitle = settings.tagline || 'School Management';

  interface NavItem {
    id: NavigationTab;
    label: string;
    icon: React.ElementType;
    badge?: string;
  }

  const getNavItems = (): NavItem[] => {
    if (isTeacher) {
      return [
        { id: 'dashboard', label: 'Teacher Dashboard', icon: LayoutDashboard },
        { id: 'my_classes', label: 'My Assigned Classes', icon: BookOpen },
        { id: 'students', label: 'My Students', icon: GraduationCap },
        { id: 'attendance', label: 'Mark Attendance', icon: CalendarCheck2 },
        { id: 'assessments', label: 'Assessments & Scores', icon: FileSpreadsheet },
        { id: 'profile', label: 'Profile & Security', icon: UserCheck },
      ];
    }

    if (isStaff) {
      return [
        { id: 'dashboard', label: 'Staff Dashboard', icon: LayoutDashboard },
        { id: 'students', label: 'Student Records', icon: GraduationCap },
        { id: 'staff', label: 'Staff Directory', icon: Users },
        { id: 'classes', label: 'Class Rosters', icon: Building2 },
        { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
        { id: 'profile', label: 'My Profile & Security', icon: UserCheck },
      ];
    }

    // Super Administrator and School Administrator
    const items: NavItem[] = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'students', label: 'Student Management', icon: GraduationCap },
      { id: 'staff', label: 'Staff Management', icon: Users },
      { id: 'classes', label: 'Class Management', icon: Building2 },
      { id: 'academic_sessions', label: 'Academic Structure', icon: CalendarDays },
      { id: 'attendance', label: 'Attendance Records', icon: CalendarCheck2 },
      { id: 'assessments', label: 'Assessments & Grades', icon: FileSpreadsheet },
      { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    ];

    if (isSuperAdmin || isSchoolAdmin) {
      items.push({ id: 'users', label: 'User Management', icon: ShieldAlert });
    }

    if (isSuperAdmin) {
      items.push({ id: 'settings', label: 'System Settings', icon: Settings });
    }

    items.push({ id: 'profile', label: 'Profile & Security', icon: UserCheck });

    return items;
  };

  const navItems = getNavItems();

  const handleNavClick = (tabId: NavigationTab) => {
    onSelectTab(tabId);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white text-gray-700 flex flex-col border-r border-gray-200 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Logo Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-lg shadow-xs shrink-0">
              {schoolInitial}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-base tracking-tight text-gray-900 leading-tight truncate">{schoolName}</span>
              <span className="text-[10px] text-gray-400 font-medium truncate">{schoolSubtitle}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Role Indicator Pill */}
        <div className="px-4 pt-3 pb-1">
          <div className="px-3 py-2 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-between">
            <div className="text-left min-w-0">
              <div className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">
                Current Role
              </div>
              <div className="text-xs font-semibold text-gray-900 capitalize truncate">
                {role?.label || 'Authorized User'}
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
          </div>
        </div>

        {/* Main Navigation Links */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      isActive ? 'text-blue-700' : 'text-gray-500 group-hover:text-gray-900'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Card & Logout Bottom */}
        <div className="p-4 border-t border-gray-100 bg-white">
          <div className="flex items-center justify-between gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 bg-gray-200 text-gray-700 rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.full_name}</p>
                <p className="text-xs text-gray-500 truncate">{role?.label || 'Staff'}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
