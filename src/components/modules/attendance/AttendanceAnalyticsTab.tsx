import React, { useMemo, useState } from 'react';
import { db } from '../../../db/storage';
import { SchoolClass, Student, AttendanceStatus } from '../../../types';
import {
  BarChart3,
  TrendingUp,
  Award,
  AlertTriangle,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
} from 'lucide-react';
import { StudentAttendanceModal } from './StudentAttendanceModal';

interface AttendanceAnalyticsTabProps {
  availableClasses: SchoolClass[];
}

export const AttendanceAnalyticsTab: React.FC<AttendanceAnalyticsTabProps> = ({
  availableClasses,
}) => {
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<Student | null>(null);

  const students = db.getStudents();
  const allAttendance = db.getAllAttendance();

  // Allowed class IDs based on teacher / admin permissions
  const allowedClassIds = useMemo(() => {
    return new Set(availableClasses.map((c) => c.id));
  }, [availableClasses]);

  // Filtered attendance records based on allowed classes & selected class filter
  const targetAttendance = useMemo(() => {
    return allAttendance.filter((a) => {
      if (!allowedClassIds.has(a.class_id)) return false;
      if (selectedClassFilter !== 'all' && a.class_id !== selectedClassFilter) return false;
      return true;
    });
  }, [allAttendance, allowedClassIds, selectedClassFilter]);

  // Overall Statistics
  const overallStats = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    let excused = 0;

    targetAttendance.forEach((r) => {
      if (r.status === 'present') present++;
      else if (r.status === 'late') late++;
      else if (r.status === 'absent') absent++;
      else if (r.status === 'excused') excused++;
    });

    const total = targetAttendance.length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;

    // Unique dates recorded
    const uniqueDates = new Set(targetAttendance.map((r) => `${r.class_id}_${r.attendance_date}`));

    return {
      totalRecords: total,
      totalSessions: uniqueDates.size,
      present,
      late,
      absent,
      excused,
      rate,
    };
  }, [targetAttendance]);

  // Per-student attendance calculation
  const studentMetrics = useMemo(() => {
    const map = new Map<
      string,
      {
        student: Student;
        total: number;
        present: number;
        late: number;
        absent: number;
        excused: number;
        rate: number;
      }
    >();

    // Initialize map for students in available classes
    students.forEach((s) => {
      if (!s.current_class_id || !allowedClassIds.has(s.current_class_id)) return;
      if (selectedClassFilter !== 'all' && s.current_class_id !== selectedClassFilter) return;

      map.set(s.id, {
        student: s,
        total: 0,
        present: 0,
        late: 0,
        absent: 0,
        excused: 0,
        rate: 100,
      });
    });

    // Accumulate records
    targetAttendance.forEach((r) => {
      if (!map.has(r.student_id)) return;
      const st = map.get(r.student_id)!;
      st.total++;
      if (r.status === 'present') st.present++;
      else if (r.status === 'late') st.late++;
      else if (r.status === 'absent') st.absent++;
      else if (r.status === 'excused') st.excused++;
    });

    // Compute rate for each
    const list = Array.from(map.values()).map((st) => {
      const rate = st.total > 0 ? Math.round(((st.present + st.late) / st.total) * 100) : 100;
      return { ...st, rate };
    });

    // Filter students with at least 1 session
    const activeWithRecords = list.filter((st) => st.total > 0);

    const perfectAttendance = activeWithRecords
      .filter((st) => st.rate === 100 && st.absent === 0)
      .sort((a, b) => b.total - a.total);

    const needsAttention = activeWithRecords
      .filter((st) => st.rate < 85 || st.absent >= 2)
      .sort((a, b) => a.rate - b.rate);

    return {
      all: activeWithRecords,
      perfectAttendance,
      needsAttention,
    };
  }, [students, allowedClassIds, selectedClassFilter, targetAttendance]);

  // Class by class comparison
  const classComparison = useMemo(() => {
    return availableClasses.map((cls) => {
      const clsRecords = allAttendance.filter((a) => a.class_id === cls.id);
      const present = clsRecords.filter((r) => r.status === 'present').length;
      const late = clsRecords.filter((r) => r.status === 'late').length;
      const absent = clsRecords.filter((r) => r.status === 'absent').length;
      const total = clsRecords.length;
      const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;
      const sessions = new Set(clsRecords.map((r) => r.attendance_date)).size;

      return {
        id: cls.id,
        name: cls.name,
        level: cls.level,
        totalStudents: db.getStudentsByClass(cls.id).length,
        totalRecords: total,
        sessions,
        rate,
        present,
        late,
        absent,
      };
    });
  }, [availableClasses, allAttendance]);

  return (
    <div className="space-y-6">
      {/* Top Header & Filter */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span>Attendance Statistics & Performance Trends</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor attendance rates, punctuality metrics, and identify students requiring support.
          </p>
        </div>

        <div className="w-full sm:w-64">
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none font-semibold text-slate-800"
          >
            <option value="all">All Accessible Classes</option>
            {availableClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.level})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Average Attendance</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{overallStats.rate}%</div>
          <div className="text-[11px] text-slate-400 font-medium">
            Across {overallStats.totalSessions} recorded days
          </div>
        </div>

        <div className="p-5 bg-emerald-50/70 rounded-2xl border border-emerald-100 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-xs font-semibold">Present Records</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-900">{overallStats.present}</div>
          <div className="text-[11px] text-emerald-700 font-medium">
            {overallStats.totalRecords > 0
              ? Math.round((overallStats.present / overallStats.totalRecords) * 100)
              : 0}
            % of all marks
          </div>
        </div>

        <div className="p-5 bg-amber-50/70 rounded-2xl border border-amber-100 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-xs font-semibold">Late Arrivals</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-amber-900">{overallStats.late}</div>
          <div className="text-[11px] text-amber-700 font-medium">
            {overallStats.totalRecords > 0
              ? Math.round((overallStats.late / overallStats.totalRecords) * 100)
              : 0}
            % tardiness rate
          </div>
        </div>

        <div className="p-5 bg-rose-50/70 rounded-2xl border border-rose-100 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-rose-800">
            <span className="text-xs font-semibold">Total Absences</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-rose-900">{overallStats.absent}</div>
          <div className="text-[11px] text-rose-700 font-medium">
            {overallStats.excused} excused leaves logged
          </div>
        </div>
      </div>

      {/* Dual Column: Perfect Attendance Honor Roll vs Needs Attention Watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Perfect Attendance Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 bg-emerald-50/60 border-b border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-900">
              <Award className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider">
                Perfect Attendance Honor Roll ({studentMetrics.perfectAttendance.length})
              </h4>
            </div>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
              100% Rate
            </span>
          </div>

          <div className="p-4 divide-y divide-slate-100 overflow-y-auto max-h-[320px] flex-1">
            {studentMetrics.perfectAttendance.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No students with 100% attendance on record.
              </div>
            ) : (
              studentMetrics.perfectAttendance.map(({ student, total, present }) => {
                const cls = student.current_class_id ? db.getClassById(student.current_class_id) : undefined;
                return (
                  <div key={student.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                        {student.first_name[0]}
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => setSelectedStudentForModal(student)}
                          className="text-xs font-bold text-slate-900 hover:text-blue-600 transition text-left"
                        >
                          {student.first_name} {student.last_name}
                        </button>
                        <div className="text-[10px] text-slate-400">
                          {cls?.name || 'Class'} • {student.admission_number}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {present}/{total} Days
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedStudentForModal(student)}
                        className="p-1 text-slate-400 hover:text-blue-600 rounded-md"
                        title="View profile"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chronic Absenteeism Watchlist */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 bg-rose-50/60 border-b border-rose-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider">
                Attendance Watchlist ({studentMetrics.needsAttention.length})
              </h4>
            </div>
            <span className="text-[11px] font-bold text-rose-800 bg-rose-100/80 px-2 py-0.5 rounded-md">
              &lt;85% or &gt;2 Absences
            </span>
          </div>

          <div className="p-4 divide-y divide-slate-100 overflow-y-auto max-h-[320px] flex-1">
            {studentMetrics.needsAttention.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No students currently in attendance watchlist.
              </div>
            ) : (
              studentMetrics.needsAttention.map(({ student, rate, absent, late, total }) => {
                const cls = student.current_class_id ? db.getClassById(student.current_class_id) : undefined;
                return (
                  <div key={student.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-800 font-bold text-xs flex items-center justify-center">
                        {student.first_name[0]}
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => setSelectedStudentForModal(student)}
                          className="text-xs font-bold text-slate-900 hover:text-blue-600 transition text-left"
                        >
                          {student.first_name} {student.last_name}
                        </button>
                        <div className="text-[10px] text-slate-400">
                          {cls?.name || 'Class'} • {absent} Absences • {late} Late
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                        {rate}% Rate
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedStudentForModal(student)}
                        className="p-1 text-slate-400 hover:text-blue-600 rounded-md"
                        title="View profile"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Class by Class Attendance Comparison Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Class Attendance Performance Comparison
            </h4>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Grade Level</th>
                <th className="px-4 py-3 text-center">Enrolled</th>
                <th className="px-4 py-3 text-center">Sessions</th>
                <th className="px-4 py-3 text-center">Present</th>
                <th className="px-4 py-3 text-center">Late</th>
                <th className="px-4 py-3 text-center">Absent</th>
                <th className="px-4 py-3 text-right">Attendance Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classComparison.map((cls) => (
                <tr key={cls.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-4 py-3 font-bold text-slate-900">{cls.name}</td>
                  <td className="px-4 py-3 text-slate-600">{cls.level}</td>
                  <td className="px-4 py-3 text-center text-slate-700">{cls.totalStudents}</td>
                  <td className="px-4 py-3 text-center text-slate-700">{cls.sessions}</td>
                  <td className="px-4 py-3 text-center font-semibold text-emerald-700">{cls.present}</td>
                  <td className="px-4 py-3 text-center font-semibold text-amber-700">{cls.late}</td>
                  <td className="px-4 py-3 text-center font-semibold text-rose-700">{cls.absent}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-16 bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            cls.rate >= 90
                              ? 'bg-emerald-500'
                              : cls.rate >= 80
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${cls.rate}%` }}
                        />
                      </div>
                      <span className="font-bold text-slate-900 w-9 text-right">{cls.rate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Attendance Modal Drilldown */}
      <StudentAttendanceModal
        student={selectedStudentForModal}
        onClose={() => setSelectedStudentForModal(null)}
      />
    </div>
  );
};
