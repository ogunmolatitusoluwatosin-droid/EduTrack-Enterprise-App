import React, { useState, useEffect } from 'react';
import { db } from '../../../db/storage';
import { useAuth } from '../../../context/AuthContext';
import { PageHeader } from '../../layout/PageHeader';
import { StatCard } from '../../common/StatCard';
import { StatusBadge } from '../../common/Badge';
import { EmptyState } from '../../common/EmptyState';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import {
  GraduationCap,
  Users,
  Building2,
  CalendarCheck2,
  ArrowRight,
  BarChart3,
  ShieldCheck,
} from 'lucide-react';
import { NavigationTab } from '../../layout/Sidebar';

interface StaffDashboardProps {
  onNavigate: (tab: NavigationTab) => void;
  onSelectStudent: (studentId: string) => void;
  onSelectStaff: (staffId: string) => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({
  onNavigate,
  onSelectStudent,
  onSelectStaff,
}) => {
  const { user, staff } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 200);
    return () => clearTimeout(timer);
  }, []);

  const students = db.getStudents();
  const staffList = db.getStaff();
  const classes = db.getClasses();
  const activeStudents = students.filter((s) => s.student_status === 'active');
  const activeStaff = staffList.filter((s) => s.employment_status === 'active');

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = db.getAttendance(undefined, todayStr);
  const presentCount = todayAttendance.filter((a) => a.status === 'present').length;
  const lateCount = todayAttendance.filter((a) => a.status === 'late').length;
  const totalMarked = todayAttendance.length;
  const attendanceRate = totalMarked > 0 ? Math.round(((presentCount + lateCount) / totalMarked) * 100) : 0;

  const recentStudents = [...students].slice(-5).reverse();

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading staff operational portal..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${staff?.first_name || user?.full_name || 'Staff'}`}
        subtitle="Staff Operations & Administrative Records Dashboard"
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('reports')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors shadow-xs"
            >
              <BarChart3 className="w-4 h-4 text-gray-500" />
              <span>View Reports</span>
            </button>
            <button
              onClick={() => onNavigate('students')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors shadow-xs"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Student Directory</span>
            </button>
          </div>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Students"
          value={activeStudents.length}
          subtitle="Enrolled student records"
          icon={GraduationCap}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
          onClick={() => onNavigate('students')}
        />
        <StatCard
          title="Staff Directory"
          value={activeStaff.length}
          subtitle="Active academic & admin staff"
          icon={Users}
          iconBgColor="bg-gray-50"
          iconColor="text-gray-700"
          onClick={() => onNavigate('staff')}
        />
        <StatCard
          title="Classes & Rosters"
          value={classes.length}
          subtitle="Active academic classes"
          icon={Building2}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
          onClick={() => onNavigate('classes')}
        />
        <StatCard
          title="Daily Attendance"
          value={`${attendanceRate}%`}
          subtitle={`${totalMarked} records logged`}
          icon={CalendarCheck2}
          iconBgColor="bg-green-50"
          iconColor="text-green-700"
          onClick={() => onNavigate('reports')}
        />
      </div>

      {/* Staff Permissions & Scope Notice */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-5 flex items-start gap-4">
        <div className="p-2 bg-blue-100 rounded-lg text-blue-700 mt-0.5">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-blue-900">Authorized Staff Access</h4>
          <p className="text-xs text-blue-700 mt-1 leading-relaxed">
            You are signed in with the <strong>Staff (Bursar/Operations)</strong> role. You have authorized access to student rosters, staff directories, and academic reports. Modifications to user accounts and system configurations are restricted to administrators.
          </p>
        </div>
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Student Records List */}
        <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-100 flex flex-col min-h-0">
          <div className="flex items-center justify-between pb-4 border-b border-gray-50">
            <div>
              <h3 className="text-base font-bold text-gray-800">Student Directory Overview</h3>
              <p className="text-xs text-gray-500 mt-0.5">Recent student records</p>
            </div>
            <button
              onClick={() => onNavigate('students')}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View All ({students.length})
            </button>
          </div>

          {recentStudents.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No Student Records"
              description="Student directory is currently empty."
            />
          ) : (
            <div className="divide-y divide-gray-50 mt-2 flex-1">
              {recentStudents.map((std) => {
                const cls = db.getClassById(std.current_class_id);
                return (
                  <div
                    key={std.id}
                    onClick={() => onSelectStudent(std.id)}
                    className="py-3 flex items-center justify-between hover:bg-gray-50/80 px-2 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-100">
                        {std.first_name[0]}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {std.first_name} {std.last_name}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono">{std.admission_number}</span>
                          <span>•</span>
                          <span className="font-medium text-gray-700">{cls?.name || 'Class N/A'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={std.student_status} />
                      <ArrowRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Operations Links */}
        <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="pb-4 border-b border-gray-50">
              <h3 className="text-base font-bold text-gray-800">Operational Quick Access</h3>
              <p className="text-xs text-gray-500 mt-0.5">Jump to key operational views</p>
            </div>

            <div className="mt-4 space-y-3">
              <button
                onClick={() => onNavigate('students')}
                className="w-full p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 text-left transition flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Student Directory</h4>
                    <p className="text-xs text-gray-500">Lookup student details, guardian info and admission status</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={() => onNavigate('staff')}
                className="w-full p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 text-left transition flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-gray-50 text-gray-700">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Staff Directory</h4>
                    <p className="text-xs text-gray-500">View departments, job titles and contact information</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={() => onNavigate('reports')}
                className="w-full p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 text-left transition flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-green-50 text-green-700">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Reports & Analytics</h4>
                    <p className="text-xs text-gray-500">Generate attendance summaries and enrollment breakdowns</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-400 text-center">
            Staff Portal • EduTrack Institutional Management
          </div>
        </div>
      </div>
    </div>
  );
};
