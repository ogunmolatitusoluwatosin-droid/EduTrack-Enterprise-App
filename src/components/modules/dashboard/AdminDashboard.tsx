import React, { useState, useEffect } from 'react';
import { db } from '../../../db/storage';
import { PageHeader } from '../../layout/PageHeader';
import { StatCard } from '../../common/StatCard';
import { Card } from '../../common/Card';
import { StatusBadge } from '../../common/Badge';
import { EmptyState } from '../../common/EmptyState';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import {
  GraduationCap,
  Users,
  Building2,
  CalendarCheck2,
  Plus,
  ArrowRight,
  Clock,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  BookOpen,
  Calendar,
} from 'lucide-react';
import { NavigationTab } from '../../layout/Sidebar';
import { Student, Assessment, Attendance } from '../../../types';

interface AdminDashboardProps {
  onNavigate: (tab: NavigationTab) => void;
  onSelectStudent: (studentId: string) => void;
  onSelectStaff: (staffId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigate,
  onSelectStudent,
  onSelectStaff,
}) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Brief loading simulation for smooth transition
    const timer = setTimeout(() => setIsLoading(false), 200);
    return () => clearTimeout(timer);
  }, []);

  const students = db.getStudents();
  const staff = db.getStaff();
  const classes = db.getClasses();
  const assessments = db.getAssessments();
  const allAttendance = db.getAttendance();

  const totalStudentsCount = students.length;
  const activeStudents = students.filter((s) => s.student_status === 'active');
  const totalStaffCount = staff.length;
  const activeStaff = staff.filter((s) => s.employment_status === 'active');
  const teachers = staff.filter(
    (s) =>
      s.job_title.toLowerCase().includes('teacher') ||
      s.department.toLowerCase().includes('primary') ||
      s.department.toLowerCase().includes('science') ||
      s.department.toLowerCase().includes('humanities') ||
      s.department.toLowerCase().includes('mathematics') ||
      s.department.toLowerCase().includes('language')
  );
  const totalClassesCount = classes.length;

  // Today's attendance calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = allAttendance.filter((a) => a.attendance_date === todayStr);
  const presentCount = todayAttendance.filter((a) => a.status === 'present').length;
  const lateCount = todayAttendance.filter((a) => a.status === 'late').length;
  const absentCount = todayAttendance.filter((a) => a.status === 'absent').length;
  const excusedCount = todayAttendance.filter((a) => a.status === 'excused').length;
  const totalMarkedToday = todayAttendance.length;
  const attendanceRate =
    totalMarkedToday > 0
      ? Math.round(((presentCount + lateCount) / totalMarkedToday) * 100)
      : 0;

  // Recent student registrations (last 5)
  const recentStudents: Student[] = [...students].slice(-5).reverse();

  // Recent assessment activity (last 5)
  const recentAssessments: Assessment[] = [...assessments].slice(0, 5);

  // Group recent attendance activity by date & class
  const recentAttendanceGroups: Array<{
    id: string;
    classId: string;
    className: string;
    date: string;
    total: number;
    present: number;
    absent: number;
    late: number;
    markedBy?: string;
  }> = [];

  const groupedMap = new Map<string, Attendance[]>();
  allAttendance.forEach((att) => {
    const key = `${att.class_id}_${att.attendance_date}`;
    if (!groupedMap.has(key)) {
      groupedMap.set(key, []);
    }
    groupedMap.get(key)!.push(att);
  });

  Array.from(groupedMap.entries())
    .slice(-6)
    .reverse()
    .forEach(([key, records]) => {
      const first = records[0];
      const cls = db.getClassById(first.class_id);
      const markerUser = first.marked_by ? db.getUserById(first.marked_by) : undefined;
      const markerStaff = markerUser?.staff_id ? db.getStaffById(markerUser.staff_id) : undefined;

      recentAttendanceGroups.push({
        id: key,
        classId: first.class_id,
        className: cls?.name || 'Class Record',
        date: first.attendance_date,
        total: records.length,
        present: records.filter((r) => r.status === 'present').length,
        absent: records.filter((r) => r.status === 'absent').length,
        late: records.filter((r) => r.status === 'late').length,
        markedBy: markerStaff ? `${markerStaff.first_name} ${markerStaff.last_name}` : markerUser?.full_name || 'Class Teacher',
      });
    });

  const auditLogs = db.getAuditLogs().slice(0, 5);

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading administrator metrics and records..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administrator Dashboard"
        subtitle="Comprehensive institutional metrics, real-time attendance, and academic activity."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('attendance')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors shadow-xs"
            >
              <CalendarCheck2 className="w-4 h-4 text-blue-600" />
              <span>Mark Attendance</span>
            </button>
            <button
              onClick={() => onNavigate('students')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>New Student</span>
            </button>
          </div>
        }
      />

      {/* 5 Core Required KPI Cards + Attendance Rate */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
        <StatCard
          title="Total Students"
          value={totalStudentsCount}
          subtitle={`${activeStudents.length} active enrollments`}
          icon={GraduationCap}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
          onClick={() => onNavigate('students')}
        />
        <StatCard
          title="Active Students"
          value={activeStudents.length}
          subtitle={`${Math.round((activeStudents.length / (totalStudentsCount || 1)) * 100)}% of total cohort`}
          icon={UserCheck}
          iconBgColor="bg-indigo-50"
          iconColor="text-indigo-600"
          trend={{ value: 'Active', isPositive: true }}
          onClick={() => onNavigate('students')}
        />
        <StatCard
          title="Total Staff"
          value={totalStaffCount}
          subtitle={`${activeStaff.length} active employees`}
          icon={Users}
          iconBgColor="bg-slate-50"
          iconColor="text-slate-700"
          onClick={() => onNavigate('staff')}
        />
        <StatCard
          title="Total Teachers"
          value={teachers.length}
          subtitle={`${totalClassesCount} classes covered`}
          icon={BookOpen}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
          onClick={() => onNavigate('staff')}
        />
        <StatCard
          title="Total Classes"
          value={totalClassesCount}
          subtitle="Configured arms & sections"
          icon={Building2}
          iconBgColor="bg-purple-50"
          iconColor="text-purple-600"
          onClick={() => onNavigate('classes')}
        />
      </div>

      {/* Today's Attendance Summary Card */}
      <Card
        title={
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Today&apos;s Attendance Summary</h3>
              <p className="text-xs text-gray-500 font-normal mt-0.5">
                Real-time student check-in summary across all classes for {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
        }
        actions={
          <button
            onClick={() => onNavigate('attendance')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5"
          >
            <span>Launch Attendance Register</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-100 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Overall Rate</span>
              <span className="p-1.5 rounded-md bg-blue-100/60 text-blue-700 text-[10px] font-bold">
                {attendanceRate}%
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl sm:text-3xl font-extrabold text-blue-700">{attendanceRate}%</div>
              <p className="text-xs text-gray-500 mt-0.5">{totalMarkedToday} students logged</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Present</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2">
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700">{presentCount}</div>
              <p className="text-xs text-emerald-700 mt-0.5 font-medium">On-time in class</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">Late Arrival</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2">
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-700">{lateCount}</div>
              <p className="text-xs text-amber-700 mt-0.5 font-medium">Arrived after bell</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-100 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-800">Absent</span>
              <AlertCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="mt-2">
              <div className="text-2xl sm:text-3xl font-extrabold text-rose-700">{absentCount}</div>
              <p className="text-xs text-rose-700 mt-0.5 font-medium">Unexcused missed</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-sky-50/50 border border-sky-100 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-800">Excused</span>
              <UserCheck className="w-4 h-4 text-sky-600" />
            </div>
            <div className="mt-2">
              <div className="text-2xl sm:text-3xl font-extrabold text-sky-700">{excusedCount}</div>
              <p className="text-xs text-sky-700 mt-0.5 font-medium">Authorized leave</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Two Column Layout: Recent Student Registrations & Recent Attendance Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Student Registrations */}
        <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-100 flex flex-col min-h-[320px]">
          <div className="flex items-center justify-between pb-4 border-b border-gray-50">
            <div>
              <h3 className="text-base font-bold text-gray-800">Recent Student Registrations</h3>
              <p className="text-xs text-gray-500 mt-0.5">Newly enrolled learners and admission status</p>
            </div>
            <button
              onClick={() => onNavigate('students')}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View Directory ({students.length})
            </button>
          </div>

          {recentStudents.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No Student Registrations Yet"
              description="New student admissions will appear here once registered into an active class."
              actionLabel="Add First Student"
              onAction={() => onNavigate('students')}
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
                      {std.profile_photo_url ? (
                        <img
                          src={std.profile_photo_url}
                          alt={std.first_name}
                          referrerPolicy="no-referrer"
                          className="w-9 h-9 rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-100">
                          {std.first_name[0]}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {std.first_name} {std.last_name}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono">{std.admission_number}</span>
                          <span>•</span>
                          <span className="font-medium text-gray-700">{cls?.name || 'Class Unassigned'}</span>
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

        {/* Recent Attendance Activity */}
        <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-100 flex flex-col min-h-[320px]">
          <div className="flex items-center justify-between pb-4 border-b border-gray-50">
            <div>
              <h3 className="text-base font-bold text-gray-800">Recent Attendance Activity</h3>
              <p className="text-xs text-gray-500 mt-0.5">Recently recorded class attendance sessions</p>
            </div>
            <button
              onClick={() => onNavigate('attendance')}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View Full Register
            </button>
          </div>

          {recentAttendanceGroups.length === 0 ? (
            <EmptyState
              icon={CalendarCheck2}
              title="No Attendance Activity Logged"
              description="Attendance marks submitted by teachers or staff will appear in this feed."
              actionLabel="Mark Attendance"
              onAction={() => onNavigate('attendance')}
            />
          ) : (
            <div className="divide-y divide-gray-50 mt-2 flex-1">
              {recentAttendanceGroups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => onNavigate('attendance')}
                  className="py-3 flex items-center justify-between hover:bg-gray-50/80 px-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                      <CalendarCheck2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{group.className}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <span>{group.date}</span>
                        <span>•</span>
                        <span className="text-gray-600">{group.markedBy}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <div className="text-xs">
                      <span className="text-emerald-700 font-bold">{group.present} Present</span>
                      {group.absent > 0 && <span className="text-rose-700 font-semibold ml-2">{group.absent} Absent</span>}
                      {group.late > 0 && <span className="text-amber-700 font-semibold ml-2">{group.late} Late</span>}
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Assessment Activity */}
      <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-100">
        <div className="flex items-center justify-between pb-4 border-b border-gray-50">
          <div>
            <h3 className="text-base font-bold text-gray-800">Recent Assessment Activity</h3>
            <p className="text-xs text-gray-500 mt-0.5">Latest evaluations, tests, examinations, and gradebook entries</p>
          </div>
          <button
            onClick={() => onNavigate('assessments')}
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            View All Assessments ({assessments.length})
          </button>
        </div>

        {recentAssessments.length === 0 ? (
          <EmptyState
            icon={FileSpreadsheet}
            title="No Assessments Created"
            description="Create assessments and tests to begin recording student grade performance."
            actionLabel="Create Assessment"
            onAction={() => onNavigate('assessments')}
          />
        ) : (
          <div className="divide-y divide-gray-50 mt-2">
            {recentAssessments.map((asm) => {
              const cls = db.getClassById(asm.class_id);
              const sub = db.getSubjectById(asm.subject_id);
              const scores = db.getScoresForAssessment(asm.id);
              const avgScore =
                scores.length > 0
                  ? (scores.reduce((sum, s) => sum + s.score, 0) / scores.length).toFixed(1)
                  : 'N/A';

              return (
                <div
                  key={asm.id}
                  onClick={() => onNavigate('assessments')}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/80 px-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{asm.title}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <span className="font-semibold text-gray-700">{sub?.name}</span>
                        <span>•</span>
                        <span>{cls?.name}</span>
                        <span>•</span>
                        <span className="capitalize px-1.5 py-0.2 bg-gray-100 text-gray-700 rounded text-[10px]">
                          {asm.assessment_type.replace(/_/g, ' ')}
                        </span>
                        <span>•</span>
                        <span>Max: {asm.maximum_score} pts</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 text-right">
                    <div>
                      <div className="text-xs font-semibold text-gray-800">
                        Class Avg: <span className="text-blue-700 font-bold">{avgScore}</span> / {asm.maximum_score}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        {scores.length} scores entered
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* System Audit Activity Log */}
      <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-100">
        <div className="flex items-center justify-between pb-3 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-bold text-gray-800">Recent Institutional Audit Trail</h3>
          </div>
          <span className="text-xs text-gray-400 font-mono">Realtime Security Log</span>
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">No system actions recorded yet.</p>
        ) : (
          <div className="space-y-2 mt-3">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-gray-50/70 rounded-lg text-xs flex items-start justify-between gap-4 border border-gray-100"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{log.user_name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-white border border-gray-200 text-gray-600 rounded">
                      {log.action}
                    </span>
                    <span className="text-gray-400">• {log.module}</span>
                  </div>
                  <div className="text-gray-600 mt-1">{log.details}</div>
                </div>
                <span className="text-[10px] text-gray-400 font-mono whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
