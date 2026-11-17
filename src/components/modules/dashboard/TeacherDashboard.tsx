import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../db/storage';
import { PageHeader } from '../../layout/PageHeader';
import { StatCard } from '../../common/StatCard';
import { Card } from '../../common/Card';
import { EmptyState } from '../../common/EmptyState';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import {
  BookOpen,
  Users,
  CalendarCheck2,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
  Edit3,
  Sparkles,
  ClipboardList,
  AlertCircle,
} from 'lucide-react';
import { NavigationTab } from '../../layout/Sidebar';
import { Class, Assessment, Attendance } from '../../../types';

interface TeacherDashboardProps {
  onNavigate: (tab: NavigationTab) => void;
  onSelectClass: (classId: string) => void;
  onSelectAssessment: (assessmentId: string) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  onNavigate,
  onSelectClass,
  onSelectAssessment,
}) => {
  const { staff, user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Brief loading simulation for smooth transition
    const timer = setTimeout(() => setIsLoading(false), 200);
    return () => clearTimeout(timer);
  }, []);

  const teacherStaffId = staff?.id || user?.staff_id || '';

  const assignedClasses: Class[] = db.getClassesForTeacher(teacherStaffId);
  const classIds = assignedClasses.map((c) => c.id);

  // Total students in teacher's assigned classes (strictly scoped)
  const allStudents = db.getStudents();
  const assignedStudents = allStudents.filter((s) => classIds.includes(s.current_class_id));

  // Today's attendance status for teacher's classes
  const todayStr = new Date().toISOString().split('T')[0];
  const allAttendance = db.getAttendance();
  const todayAttendance = allAttendance.filter(
    (a) => classIds.includes(a.class_id) && a.attendance_date === todayStr
  );
  const classesWithAttendanceMarked = new Set(todayAttendance.map((a) => a.class_id));
  const isAllAttendanceMarked =
    assignedClasses.length > 0 && assignedClasses.every((c) => classesWithAttendanceMarked.has(c.id));

  // Recent attendance activity for this teacher's classes
  const teacherAttendanceRecords = allAttendance.filter((a) => classIds.includes(a.class_id));
  const attendanceGroupsMap = new Map<string, Attendance[]>();
  teacherAttendanceRecords.forEach((att) => {
    const key = `${att.class_id}_${att.attendance_date}`;
    if (!attendanceGroupsMap.has(key)) {
      attendanceGroupsMap.set(key, []);
    }
    attendanceGroupsMap.get(key)!.push(att);
  });

  const recentAttendanceActivity: Array<{
    id: string;
    classId: string;
    className: string;
    date: string;
    total: number;
    present: number;
    absent: number;
    late: number;
  }> = [];

  Array.from(attendanceGroupsMap.entries())
    .slice(-5)
    .reverse()
    .forEach(([key, records]) => {
      const first = records[0];
      const cls = db.getClassById(first.class_id);
      recentAttendanceActivity.push({
        id: key,
        classId: first.class_id,
        className: cls?.name || 'Assigned Class',
        date: first.attendance_date,
        total: records.length,
        present: records.filter((r) => r.status === 'present').length,
        absent: records.filter((r) => r.status === 'absent').length,
        late: records.filter((r) => r.status === 'late').length,
      });
    });

  // Assessments created by or relevant to this teacher's classes
  const teacherAssessments: Assessment[] = db
    .getAssessments()
    .filter((a) => a.created_by === teacherStaffId || classIds.includes(a.class_id));

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading teacher classroom metrics and schedule..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${staff?.first_name || user?.full_name || 'Teacher'}`}
        subtitle="Manage your assigned classes, take student attendance, and record assessment scores."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('assessments')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4 text-gray-500" />
              <span>New Assessment</span>
            </button>
            <button
              onClick={() => onNavigate('attendance')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors shadow-xs"
            >
              <CalendarCheck2 className="w-4 h-4" />
              <span>Mark Attendance</span>
            </button>
          </div>
        }
      />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Assigned Classes"
          value={assignedClasses.length}
          subtitle="Classes in your teaching schedule"
          icon={BookOpen}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
          onClick={() => onNavigate('my_classes')}
        />
        <StatCard
          title="Number of Students"
          value={assignedStudents.length}
          subtitle="Total enrolled in your classes"
          icon={Users}
          iconBgColor="bg-indigo-50"
          iconColor="text-indigo-600"
          onClick={() => onNavigate('students')}
        />
        <StatCard
          title="Today's Attendance"
          value={isAllAttendanceMarked ? '100% Completed' : `${classesWithAttendanceMarked.size}/${assignedClasses.length} Classes`}
          subtitle={isAllAttendanceMarked ? 'All class registers submitted' : 'Pending class submissions'}
          icon={CalendarCheck2}
          iconBgColor={isAllAttendanceMarked ? 'bg-emerald-50' : 'bg-amber-50'}
          iconColor={isAllAttendanceMarked ? 'text-emerald-700' : 'text-amber-700'}
          trend={isAllAttendanceMarked ? { value: 'Complete', isPositive: true } : { value: 'Action Required', isPositive: false }}
          onClick={() => onNavigate('attendance')}
        />
        <StatCard
          title="Recent Assessments"
          value={teacherAssessments.length}
          subtitle="Tests & assignments managed"
          icon={FileSpreadsheet}
          iconBgColor="bg-purple-50"
          iconColor="text-purple-600"
          onClick={() => onNavigate('assessments')}
        />
      </div>

      {/* Quick Action Shortcuts Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-200" />
              <h3 className="text-base font-bold">Classroom Quick Actions</h3>
            </div>
            <p className="text-xs text-blue-100 mt-1 max-w-xl">
              Quickly record daily roll call, enter term marks, or inspect student rosters for your assigned classes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('attendance')}
              className="px-4 py-2 bg-white text-blue-700 hover:bg-blue-50 text-xs font-bold rounded-lg transition shadow-xs flex items-center gap-2"
            >
              <CalendarCheck2 className="w-4 h-4" />
              <span>Mark Roll Call</span>
            </button>
            <button
              onClick={() => onNavigate('assessments')}
              className="px-4 py-2 bg-blue-500/40 hover:bg-blue-500/60 text-white border border-blue-400/40 text-xs font-bold rounded-lg transition flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              <span>Record Scores</span>
            </button>
            <button
              onClick={() => onNavigate('my_classes')}
              className="px-4 py-2 bg-blue-500/40 hover:bg-blue-500/60 text-white border border-blue-400/40 text-xs font-bold rounded-lg transition flex items-center gap-2"
            >
              <ClipboardList className="w-4 h-4" />
              <span>View Class Rosters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Assigned Classes Cards with Today's Attendance Status */}
      <Card
        title={
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Assigned Classes & Today&apos;s Status</h3>
              <p className="text-xs text-gray-500 font-normal mt-0.5">
                Classrooms under your supervision and real-time attendance status
              </p>
            </div>
          </div>
        }
        actions={
          <button
            onClick={() => onNavigate('my_classes')}
            className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
          >
            <span>View All Assigned Classes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        }
      >
        {assignedClasses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No Classes Assigned"
            description="You do not have any teaching classes assigned for the current academic session. Contact an administrator for assignment."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignedClasses.map((cls) => {
              const classStudents = db.getStudentsByClass(cls.id);
              const isMarkedToday = classesWithAttendanceMarked.has(cls.id);
              const classSubjects = db.getClassSubjects(cls.id);
              const isClassTeacher = cls.class_teacher_id === teacherStaffId;

              return (
                <div
                  key={cls.id}
                  className="p-5 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{cls.name}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">{cls.level} • Arm {cls.section}</p>
                      </div>
                      {isClassTeacher && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 rounded border border-blue-100 uppercase tracking-wider">
                          Class Teacher
                        </span>
                      )}
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <span><strong>{classStudents.length}</strong> enrolled students (Cap: {cls.capacity})</span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                        <span>{classSubjects.length} subject courses</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs">
                      {isMarkedToday ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Marked Today
                        </span>
                      ) : (
                        <span className="text-amber-700 font-semibold flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded">
                          <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Roll Call
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        onSelectClass(cls.id);
                        onNavigate('attendance');
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold rounded-md transition-colors"
                    >
                      <span>Mark</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Two Column Layout: Recent Attendance Activity & Recent Assessments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Attendance Activity for Teacher's Classes */}
        <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-100 flex flex-col min-h-[300px]">
          <div className="flex items-center justify-between pb-4 border-b border-gray-50">
            <div>
              <h3 className="text-base font-bold text-gray-800">Recent Attendance Activity</h3>
              <p className="text-xs text-gray-500 mt-0.5">Attendance logs for your assigned classrooms</p>
            </div>
            <button
              onClick={() => onNavigate('attendance')}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Open Register
            </button>
          </div>

          {recentAttendanceActivity.length === 0 ? (
            <EmptyState
              icon={CalendarCheck2}
              title="No Attendance Logged Yet"
              description="Daily roll call submissions for your assigned classes will be listed here."
              actionLabel="Mark Attendance Now"
              onAction={() => onNavigate('attendance')}
            />
          ) : (
            <div className="divide-y divide-gray-50 mt-2 flex-1">
              {recentAttendanceActivity.map((group) => (
                <div
                  key={group.id}
                  onClick={() => {
                    onSelectClass(group.classId);
                    onNavigate('attendance');
                  }}
                  className="py-3 flex items-center justify-between hover:bg-gray-50/80 px-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                      <CalendarCheck2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{group.className}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{group.date}</div>
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

        {/* Recent Assessments & Quick Score Entry */}
        <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-100 flex flex-col min-h-[300px]">
          <div className="flex items-center justify-between pb-4 border-b border-gray-50">
            <div>
              <h3 className="text-base font-bold text-gray-800">Recent Assessments</h3>
              <p className="text-xs text-gray-500 mt-0.5">Evaluations and score records for your students</p>
            </div>
            <button
              onClick={() => onNavigate('assessments')}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View All ({teacherAssessments.length})
            </button>
          </div>

          {teacherAssessments.length === 0 ? (
            <EmptyState
              icon={FileSpreadsheet}
              title="No Assessments Created"
              description="Create tests, quizzes, and exams to start entering student grade scores."
              actionLabel="Create Assessment"
              onAction={() => onNavigate('assessments')}
            />
          ) : (
            <div className="divide-y divide-gray-50 mt-2 flex-1">
              {teacherAssessments.map((asm) => {
                const cls = db.getClassById(asm.class_id);
                const sub = db.getSubjectById(asm.subject_id);
                const scores = db.getScoresForAssessment(asm.id);
                const totalInClass = db.getStudentsByClass(asm.class_id).length;
                const avg =
                  scores.length > 0
                    ? (scores.reduce((acc, s) => acc + s.score, 0) / scores.length).toFixed(1)
                    : '0.0';

                return (
                  <div
                    key={asm.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/80 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-50 text-purple-700">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{asm.title}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-semibold text-gray-700">{sub?.name}</span>
                          <span>•</span>
                          <span>{cls?.name}</span>
                          <span>•</span>
                          <span className="capitalize text-blue-600">{asm.assessment_type.replace(/_/g, ' ')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="text-left sm:text-right">
                        <div className="text-xs font-semibold text-gray-800">
                          Avg: <span className="text-blue-700 font-bold">{avg}</span> / {asm.maximum_score}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {scores.length} / {totalInClass} submitted
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          onSelectAssessment(asm.id);
                          onNavigate('assessments');
                        }}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-md transition-colors"
                      >
                        Record
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
