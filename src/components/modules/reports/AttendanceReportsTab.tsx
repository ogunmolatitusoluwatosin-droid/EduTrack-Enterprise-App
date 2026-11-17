import React, { useState, useMemo } from 'react';
import { db } from '../../../db/storage';
import { useAuth } from '../../../context/AuthContext';
import { AttendanceStatus } from '../../../types';
import { StatCard } from '../../common/StatCard';
import { StatusBadge } from '../../common/Badge';
import {
  CalendarCheck2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Percent,
  Search,
  Filter,
  Download,
  Calendar,
  Building,
  User,
  ChevronRight,
} from 'lucide-react';

export const AttendanceReportsTab: React.FC = () => {
  const { isTeacher, staff, isSchoolAdmin, isSuperAdmin } = useAuth();

  const classes = useMemo(() => {
    if (isTeacher && staff && !isSchoolAdmin && !isSuperAdmin) {
      return db.getClassesForTeacher(staff.id);
    }
    return db.getClasses();
  }, [isTeacher, staff, isSchoolAdmin, isSuperAdmin]);

  const teacherClassIds = useMemo(() => classes.map((c) => c.id), [classes]);

  const students = useMemo(() => {
    let list = db.getStudents();
    if (isTeacher && staff && !isSchoolAdmin && !isSuperAdmin) {
      list = list.filter((s) => teacherClassIds.includes(s.current_class_id));
    }
    return list;
  }, [teacherClassIds, isTeacher, staff, isSchoolAdmin, isSuperAdmin]);

  const attendance = useMemo(() => {
    let list = db.getAllAttendance();
    if (isTeacher && staff && !isSchoolAdmin && !isSuperAdmin) {
      list = list.filter((a) => teacherClassIds.includes(a.class_id));
    }
    return list;
  }, [teacherClassIds, isTeacher, staff, isSchoolAdmin, isSuperAdmin]);

  // Sub-view mode for Attendance tab
  const [subView, setSubView] = useState<'by_class' | 'daily' | 'by_student'>('by_class');

  // Filters State
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [dateFilterPreset, setDateFilterPreset] = useState<'ALL' | 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'CUSTOM'>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchStudentQuery, setSearchStudentQuery] = useState<string>('');
  const [selectedStudentDetailId, setSelectedStudentDetailId] = useState<string | null>(null);

  // Lookups
  const classMap = useMemo(() => {
    const map = new Map<string, string>();
    classes.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [classes]);

  const studentMap = useMemo(() => {
    const map = new Map<string, { name: string; admissionNo: string; classId: string }>();
    students.forEach((s) => {
      map.set(s.id, {
        name: `${s.first_name} ${s.last_name}`,
        admissionNo: s.admission_number,
        classId: s.current_class_id,
      });
    });
    return map;
  }, [students]);

  // Date Filtering Logic
  const filteredAttendance = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    const sevenDaysStr = sevenDaysAgo.toISOString().slice(0, 10);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const thirtyDaysStr = thirtyDaysAgo.toISOString().slice(0, 10);

    return attendance.filter((item) => {
      // Class Filter
      if (selectedClassId !== 'ALL' && item.class_id !== selectedClassId) {
        return false;
      }

      // Status Filter
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) {
        return false;
      }

      // Date Presets
      if (dateFilterPreset === 'TODAY') {
        if (item.attendance_date !== todayStr) return false;
      } else if (dateFilterPreset === 'LAST_7_DAYS') {
        if (item.attendance_date < sevenDaysStr) return false;
      } else if (dateFilterPreset === 'LAST_30_DAYS') {
        if (item.attendance_date < thirtyDaysStr) return false;
      } else if (dateFilterPreset === 'CUSTOM') {
        if (startDate && item.attendance_date < startDate) return false;
        if (endDate && item.attendance_date > endDate) return false;
      }

      // Student Search Filter
      if (searchStudentQuery.trim()) {
        const q = searchStudentQuery.toLowerCase().trim();
        const stud = studentMap.get(item.student_id);
        if (!stud) return false;
        if (!stud.name.toLowerCase().includes(q) && !stud.admissionNo.toLowerCase().includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [attendance, selectedClassId, selectedStatus, dateFilterPreset, startDate, endDate, searchStudentQuery, studentMap]);

  // Core Metrics computed from filtered attendance
  const overallMetrics = useMemo(() => {
    const total = filteredAttendance.length;
    const present = filteredAttendance.filter((r) => r.status === 'present').length;
    const late = filteredAttendance.filter((r) => r.status === 'late').length;
    const absent = filteredAttendance.filter((r) => r.status === 'absent').length;
    const excused = filteredAttendance.filter((r) => r.status === 'excused').length;

    // Attendance percentage considers Present + Late as attended
    const attendedCount = present + late;
    const percentage = total > 0 ? Math.round((attendedCount / total) * 100) : 0;
    const purePresentPercentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return {
      total,
      present,
      late,
      absent,
      excused,
      percentage,
      purePresentPercentage,
    };
  }, [filteredAttendance]);

  // 1. Attendance by Class Data
  const attendanceByClass = useMemo(() => {
    return classes.map((cls) => {
      const classRecords = filteredAttendance.filter((r) => r.class_id === cls.id);
      const total = classRecords.length;
      const present = classRecords.filter((r) => r.status === 'present').length;
      const late = classRecords.filter((r) => r.status === 'late').length;
      const absent = classRecords.filter((r) => r.status === 'absent').length;
      const excused = classRecords.filter((r) => r.status === 'excused').length;
      const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
      const enrolledStudents = students.filter((s) => s.current_class_id === cls.id).length;

      return {
        id: cls.id,
        name: cls.name,
        level: cls.level,
        enrolledStudents,
        total,
        present,
        late,
        absent,
        excused,
        rate,
      };
    });
  }, [classes, filteredAttendance, students]);

  // 2. Daily Attendance Data (Grouped by Date)
  const dailyAttendance = useMemo(() => {
    const grouped = new Map<string, { date: string; present: number; late: number; absent: number; excused: number; total: number }>();

    filteredAttendance.forEach((rec) => {
      const existing = grouped.get(rec.attendance_date) || {
        date: rec.attendance_date,
        present: 0,
        late: 0,
        absent: 0,
        excused: 0,
        total: 0,
      };
      if (rec.status === 'present') existing.present++;
      else if (rec.status === 'late') existing.late++;
      else if (rec.status === 'absent') existing.absent++;
      else if (rec.status === 'excused') existing.excused++;
      existing.total++;
      grouped.set(rec.attendance_date, existing);
    });

    return Array.from(grouped.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [filteredAttendance]);

  // 3. Attendance by Student Data
  const attendanceByStudent = useMemo(() => {
    const relevantStudents = selectedClassId === 'ALL'
      ? students
      : students.filter((s) => s.current_class_id === selectedClassId);

    return relevantStudents
      .map((st) => {
        const studentLogs = filteredAttendance.filter((r) => r.student_id === st.id);
        const total = studentLogs.length;
        const present = studentLogs.filter((r) => r.status === 'present').length;
        const late = studentLogs.filter((r) => r.status === 'late').length;
        const absent = studentLogs.filter((r) => r.status === 'absent').length;
        const excused = studentLogs.filter((r) => r.status === 'excused').length;
        const rate = total > 0 ? Math.round(((present + late) / total) * 100) : (studentLogs.length === 0 ? 100 : 0);

        return {
          student: st,
          className: classMap.get(st.current_class_id) || 'Unassigned',
          total,
          present,
          late,
          absent,
          excused,
          rate,
          logs: studentLogs,
        };
      })
      .filter((item) => {
        if (!searchStudentQuery.trim()) return true;
        const q = searchStudentQuery.toLowerCase().trim();
        const fullName = `${item.student.first_name} ${item.student.last_name}`.toLowerCase();
        const adm = item.student.admission_number.toLowerCase();
        return fullName.includes(q) || adm.includes(q);
      });
  }, [students, selectedClassId, filteredAttendance, classMap, searchStudentQuery]);

  // Selected Student Detailed Logs
  const activeStudentDetail = useMemo(() => {
    if (!selectedStudentDetailId) return null;
    return attendanceByStudent.find((item) => item.student.id === selectedStudentDetailId) || null;
  }, [selectedStudentDetailId, attendanceByStudent]);

  const hasActiveFilters =
    selectedClassId !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    dateFilterPreset !== 'ALL' ||
    searchStudentQuery.trim().length > 0 ||
    startDate !== '' ||
    endDate !== '';

  const handleResetFilters = () => {
    setSelectedClassId('ALL');
    setSelectedStatus('ALL');
    setDateFilterPreset('ALL');
    setStartDate('');
    setEndDate('');
    setSearchStudentQuery('');
  };

  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];

    if (subView === 'by_class') {
      headers = ['Class Name', 'Level', 'Enrolled Students', 'Total Logs', 'Present', 'Late', 'Absent', 'Excused', 'Attendance Rate (%)'];
      rows = attendanceByClass.map((c) => [
        c.name,
        c.level,
        String(c.enrolledStudents),
        String(c.total),
        String(c.present),
        String(c.late),
        String(c.absent),
        String(c.excused),
        `${c.rate}%`,
      ]);
    } else if (subView === 'daily') {
      headers = ['Date', 'Total Recorded', 'Present', 'Late', 'Absent', 'Excused', 'Attendance Rate (%)'];
      rows = dailyAttendance.map((d) => {
        const rate = d.total > 0 ? Math.round(((d.present + d.late) / d.total) * 100) : 0;
        return [
          d.date,
          String(d.total),
          String(d.present),
          String(d.late),
          String(d.absent),
          String(d.excused),
          `${rate}%`,
        ];
      });
    } else {
      headers = ['Student ID', 'Admission No', 'Student Name', 'Class', 'Total Days', 'Present', 'Late', 'Absent', 'Excused', 'Attendance Rate (%)'];
      rows = attendanceByStudent.map((s) => [
        s.student.student_code,
        s.student.admission_number,
        `${s.student.first_name} ${s.student.last_name}`,
        s.className,
        String(s.total),
        String(s.present),
        String(s.late),
        String(s.absent),
        String(s.excused),
        `${s.rate}%`,
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `attendance_report_${subView}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. Core Attendance Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Attendance Percentage"
          value={`${overallMetrics.percentage}%`}
          subtitle="Present + Punctual arrivals"
          icon={Percent}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Present Count"
          value={overallMetrics.present}
          subtitle={`${overallMetrics.total > 0 ? Math.round((overallMetrics.present / overallMetrics.total) * 100) : 0}% on-time arrivals`}
          icon={CheckCircle2}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Late Count"
          value={overallMetrics.late}
          subtitle={`${overallMetrics.total > 0 ? Math.round((overallMetrics.late / overallMetrics.total) * 100) : 0}% tardy check-ins`}
          icon={Clock}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          title="Absent Count"
          value={overallMetrics.absent}
          subtitle={`${overallMetrics.total > 0 ? Math.round((overallMetrics.absent / overallMetrics.total) * 100) : 0}% unexcused absences`}
          icon={XCircle}
          iconBgColor="bg-rose-50"
          iconColor="text-rose-600"
        />
        <StatCard
          title="Excused Count"
          value={overallMetrics.excused}
          subtitle="Authorized absences"
          icon={AlertCircle}
          iconBgColor="bg-sky-50"
          iconColor="text-sky-600"
        />
      </div>

      {/* 2. Sub-View Switcher & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Navigation Sub-Tabs */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl">
            <button
              onClick={() => {
                setSubView('by_class');
                setSelectedStudentDetailId(null);
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                subView === 'by_class'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Attendance by Class
            </button>
            <button
              onClick={() => {
                setSubView('daily');
                setSelectedStudentDetailId(null);
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                subView === 'daily'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daily Attendance Logs
            </button>
            <button
              onClick={() => setSubView('by_student')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                subView === 'by_student'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Attendance by Student
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl shadow-2xs transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Global Attendance Filter Toolbar */}
        <div className="p-4 border-b border-slate-200 space-y-3 bg-white">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Student (when in by_student or general) */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchStudentQuery}
                onChange={(e) => setSearchStudentQuery(e.target.value)}
                placeholder="Search student or adm no..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none"
              />
            </div>

            {/* Class Filter */}
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="ALL">All Classes ({classes.length})</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Date Preset */}
            <select
              value={dateFilterPreset}
              onChange={(e) => setDateFilterPreset(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="LAST_7_DAYS">Last 7 Days</option>
              <option value="LAST_30_DAYS">Last 30 Days</option>
              <option value="CUSTOM">Custom Date Range</option>
            </select>

            {/* Custom Dates if selected */}
            {dateFilterPreset === 'CUSTOM' && (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none"
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none"
                />
              </div>
            )}

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none capitalize"
            >
              <option value="ALL">All Statuses</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
              <option value="excused">Excused</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-500">
            Total Matching Attendance Logs:{' '}
            <strong className="text-slate-800">{filteredAttendance.length}</strong> records
          </div>
        </div>

        {/* View 1: Attendance By Class */}
        {subView === 'by_class' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Class Name</th>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3 text-center">Enrolled</th>
                  <th className="px-4 py-3 text-center">Total Logs</th>
                  <th className="px-4 py-3 text-center">Present</th>
                  <th className="px-4 py-3 text-center">Late</th>
                  <th className="px-4 py-3 text-center">Absent</th>
                  <th className="px-4 py-3 text-center">Excused</th>
                  <th className="px-4 py-3">Attendance Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendanceByClass.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                      <Building className="w-4 h-4 text-blue-500" />
                      {c.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 uppercase font-semibold">{c.level}</td>
                    <td className="px-4 py-3 text-center text-slate-700">{c.enrolledStudents}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-900">{c.total}</td>
                    <td className="px-4 py-3 text-center font-semibold text-emerald-700">{c.present}</td>
                    <td className="px-4 py-3 text-center font-semibold text-amber-700">{c.late}</td>
                    <td className="px-4 py-3 text-center font-semibold text-rose-700">{c.absent}</td>
                    <td className="px-4 py-3 text-center text-sky-700">{c.excused}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              c.rate >= 90 ? 'bg-emerald-500' : c.rate >= 75 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${c.rate}%` }}
                          />
                        </div>
                        <span
                          className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                            c.rate >= 90
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.rate >= 75
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {c.rate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* View 2: Daily Attendance Logs */}
        {subView === 'daily' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Attendance Date</th>
                  <th className="px-4 py-3 text-center">Total Recorded</th>
                  <th className="px-4 py-3 text-center">Present Count</th>
                  <th className="px-4 py-3 text-center">Late Count</th>
                  <th className="px-4 py-3 text-center">Absent Count</th>
                  <th className="px-4 py-3 text-center">Excused Count</th>
                  <th className="px-4 py-3">Daily Attendance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No attendance sessions recorded for the selected filter dates.
                    </td>
                  </tr>
                ) : (
                  dailyAttendance.map((d) => {
                    const rate = d.total > 0 ? Math.round(((d.present + d.late) / d.total) * 100) : 0;
                    return (
                      <tr key={d.date} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-500" />
                          {d.date}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-900">{d.total}</td>
                        <td className="px-4 py-3 text-center font-semibold text-emerald-700">{d.present}</td>
                        <td className="px-4 py-3 text-center font-semibold text-amber-700">{d.late}</td>
                        <td className="px-4 py-3 text-center font-semibold text-rose-700">{d.absent}</td>
                        <td className="px-4 py-3 text-center text-sky-700">{d.excused}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  rate >= 90 ? 'bg-emerald-500' : rate >= 75 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                            <span
                              className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                                rate >= 90
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : rate >= 75
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {rate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* View 3: Attendance by Student */}
        {subView === 'by_student' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            {/* Student Attendance List */}
            <div className="lg:col-span-2 overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Admission No</th>
                    <th className="px-4 py-3">Class</th>
                    <th className="px-4 py-3 text-center">Present</th>
                    <th className="px-4 py-3 text-center">Late</th>
                    <th className="px-4 py-3 text-center">Absent</th>
                    <th className="px-4 py-3">Attendance %</th>
                    <th className="px-4 py-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendanceByStudent.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No students match the search/filter criteria.
                      </td>
                    </tr>
                  ) : (
                    attendanceByStudent.map((item) => {
                      const isSelected = selectedStudentDetailId === item.student.id;
                      return (
                        <tr
                          key={item.student.id}
                          onClick={() => setSelectedStudentDetailId(item.student.id)}
                          className={`cursor-pointer transition ${
                            isSelected ? 'bg-blue-50/80 font-semibold' : 'hover:bg-slate-50/60'
                          }`}
                        >
                          <td className="px-4 py-3 font-bold text-slate-900">
                            {item.student.first_name} {item.student.last_name}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600">{item.student.admission_number}</td>
                          <td className="px-4 py-3 text-slate-700">{item.className}</td>
                          <td className="px-4 py-3 text-center text-emerald-700 font-semibold">{item.present}</td>
                          <td className="px-4 py-3 text-center text-amber-700 font-semibold">{item.late}</td>
                          <td className="px-4 py-3 text-center text-rose-700 font-semibold">{item.absent}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                                item.rate >= 90
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.rate >= 75
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {item.rate}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Student Individual Attendance Log Sidebar */}
            <div className="p-4 bg-slate-50/40">
              {activeStudentDetail ? (
                <div className="space-y-4">
                  <div className="border-b border-slate-200 pb-3">
                    <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Student Profile Log</div>
                    <div className="text-base font-extrabold text-slate-900 mt-0.5">
                      {activeStudentDetail.student.first_name} {activeStudentDetail.student.last_name}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Adm: <span className="font-mono font-semibold">{activeStudentDetail.student.admission_number}</span> • {activeStudentDetail.className}
                    </div>
                  </div>

                  {/* Summary counts */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                      <div className="text-slate-500">Attendance Rate</div>
                      <div className="text-base font-extrabold text-blue-600 mt-0.5">{activeStudentDetail.rate}%</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                      <div className="text-slate-500">Total Recorded</div>
                      <div className="text-base font-extrabold text-slate-900 mt-0.5">{activeStudentDetail.total} Days</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
                      <div className="font-medium">Present: {activeStudentDetail.present}</div>
                      <div className="text-[11px] text-emerald-600 mt-0.5">Late: {activeStudentDetail.late}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
                      <div className="font-medium">Absent: {activeStudentDetail.absent}</div>
                      <div className="text-[11px] text-rose-600 mt-0.5">Excused: {activeStudentDetail.excused}</div>
                    </div>
                  </div>

                  {/* Logs list */}
                  <div>
                    <div className="text-xs font-bold text-slate-700 mb-2">History Records ({activeStudentDetail.logs.length})</div>
                    <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                      {activeStudentDetail.logs.length === 0 ? (
                        <div className="text-xs text-slate-400 italic py-4 text-center">No attendance logs on file.</div>
                      ) : (
                        activeStudentDetail.logs.map((log) => (
                          <div key={log.id} className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs">
                            <div>
                              <div className="font-semibold text-slate-800">{log.attendance_date}</div>
                              {log.notes && <div className="text-[11px] text-slate-500 italic mt-0.5">{log.notes}</div>}
                            </div>
                            <StatusBadge status={log.status} />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <User className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-xs font-medium">Select a student from the list to view their individual attendance history logs.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
