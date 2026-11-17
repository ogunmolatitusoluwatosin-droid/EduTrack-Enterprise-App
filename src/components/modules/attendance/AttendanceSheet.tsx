import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../../db/storage';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { AttendanceStatus, Student, SchoolClass } from '../../../types';
import {
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Save,
  CheckCheck,
  Download,
  Search,
  RotateCcw,
  Sparkles,
  Calendar,
  Eye,
  Check,
  AlertTriangle,
  History,
} from 'lucide-react';
import { StudentAttendanceModal } from './StudentAttendanceModal';

interface AttendanceSheetProps {
  selectedClassId: string;
  selectedDate: string;
  onClassChange: (classId: string) => void;
  onDateChange: (date: string) => void;
  availableClasses: SchoolClass[];
  onViewHistory: () => void;
}

export const AttendanceSheet: React.FC<AttendanceSheetProps> = ({
  selectedClassId,
  selectedDate,
  onClassChange,
  onDateChange,
  availableClasses,
  onViewHistory,
}) => {
  const { user, staff, isTeacher, isSchoolAdmin, isSuperAdmin } = useAuth();
  const toast = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AttendanceStatus>('all');
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<Student | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Local attendance state: Map studentId -> { status, notes }
  const [attendanceState, setAttendanceState] = useState<
    Record<string, { status: AttendanceStatus; notes: string }>
  >({});
  const [existingRecordsInfo, setExistingRecordsInfo] = useState<{
    hasExisting: boolean;
    markedByName?: string;
    updatedAt?: string;
    createdAt?: string;
  }>({ hasExisting: false });

  const activeClass = useMemo(() => {
    return availableClasses.find((c) => c.id === selectedClassId) || db.getClassById(selectedClassId);
  }, [availableClasses, selectedClassId]);

  // Active students in class
  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return db.getStudentsByClass(selectedClassId).filter((s) => s.student_status === 'active');
  }, [selectedClassId]);

  // Filtered students based on search and status filter
  const filteredStudents = useMemo(() => {
    return classStudents.filter((std) => {
      const currentStatus = attendanceState[std.id]?.status || 'present';
      if (statusFilter !== 'all' && currentStatus !== statusFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const fullName = `${std.first_name} ${std.middle_name || ''} ${std.last_name}`.toLowerCase();
      return (
        fullName.includes(q) ||
        std.admission_number.toLowerCase().includes(q) ||
        std.student_code.toLowerCase().includes(q)
      );
    });
  }, [classStudents, attendanceState, statusFilter, searchQuery]);

  // Load existing records on class or date change
  useEffect(() => {
    if (!selectedClassId || !selectedDate) return;

    const existing = db.getAttendance(selectedClassId, selectedDate);
    const stateMap: Record<string, { status: AttendanceStatus; notes: string }> = {};

    if (existing.length > 0) {
      // Find marked by info
      const firstRec = existing[0];
      let markedByName = 'Authorized Staff';
      if (firstRec.marked_by) {
        const st = db.getStaffById(firstRec.marked_by);
        if (st) {
          markedByName = `${st.first_name} ${st.last_name}`;
        } else {
          const u = db.getUserById(firstRec.marked_by);
          if (u) markedByName = u.full_name;
        }
      }

      setExistingRecordsInfo({
        hasExisting: true,
        markedByName,
        updatedAt: firstRec.updated_at || firstRec.created_at,
        createdAt: firstRec.created_at,
      });

      existing.forEach((r) => {
        stateMap[r.student_id] = {
          status: r.status,
          notes: r.notes || '',
        };
      });
    } else {
      setExistingRecordsInfo({ hasExisting: false });
      // Default to 'present' for fast 1-click marking
      classStudents.forEach((s) => {
        stateMap[s.id] = {
          status: 'present',
          notes: '',
        };
      });
    }

    // Fill in any student not already in stateMap
    classStudents.forEach((s) => {
      if (!stateMap[s.id]) {
        stateMap[s.id] = {
          status: 'present',
          notes: '',
        };
      }
    });

    setAttendanceState(stateMap);
    setIsDirty(false);
  }, [selectedClassId, selectedDate, classStudents.length]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
    setIsDirty(true);
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        notes,
      },
    }));
    setIsDirty(true);
  };

  const handleQuickNote = (studentId: string, reason: string) => {
    setAttendanceState((prev) => {
      const current = prev[studentId]?.notes || '';
      const newNote = current ? `${current} - ${reason}` : reason;
      return {
        ...prev,
        [studentId]: {
          ...prev[studentId],
          notes: newNote,
        },
      };
    });
    setIsDirty(true);
  };

  // Bulk actions
  const handleBulkSetStatus = (status: AttendanceStatus) => {
    setAttendanceState((prev) => {
      const next = { ...prev };
      classStudents.forEach((s) => {
        next[s.id] = {
          ...next[s.id],
          status,
        };
      });
      return next;
    });
    setIsDirty(true);
    toast.info('Bulk Update', `All students marked as ${status.toUpperCase()}.`);
  };

  const handleReset = () => {
    const stateMap: Record<string, { status: AttendanceStatus; notes: string }> = {};
    classStudents.forEach((s) => {
      stateMap[s.id] = {
        status: 'present',
        notes: '',
      };
    });
    setAttendanceState(stateMap);
    setIsDirty(true);
    toast.info('Sheet Reset', 'All students reset to Present with blank notes.');
  };

  const handleSaveAttendance = () => {
    if (!selectedClassId || !selectedDate) return;
    if (classStudents.length === 0) {
      toast.warning('No Students', 'No active students to record attendance for.');
      return;
    }

    setIsSaving(true);
    try {
      const recordsToSave = classStudents.map((s) => {
        const entry = attendanceState[s.id] || { status: 'present' as AttendanceStatus, notes: '' };
        return {
          student_id: s.id,
          class_id: selectedClassId,
          attendance_date: selectedDate,
          status: entry.status,
          notes: entry.notes.trim() || undefined,
        };
      });

      const actor = user
        ? { id: staff?.id || user.id, name: user.full_name }
        : { id: 'admin', name: 'School Admin' };

      const res = db.saveAttendanceBatch(recordsToSave, actor);

      setExistingRecordsInfo({
        hasExisting: true,
        markedByName: actor.name,
        updatedAt: new Date().toISOString(),
        createdAt: existingRecordsInfo.createdAt || new Date().toISOString(),
      });
      setIsDirty(false);

      toast.success(
        'Attendance Recorded',
        `Successfully saved attendance for ${classStudents.length} students (${res.savedCount} new, ${res.updatedCount} updated).`
      );
    } catch (err: any) {
      toast.error('Save Failed', err.message || 'Could not save attendance records.');
    } finally {
      setIsSaving(false);
    }
  };

  const stats = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    let excused = 0;

    classStudents.forEach((s) => {
      const status = attendanceState[s.id]?.status || 'present';
      if (status === 'present') present++;
      else if (status === 'late') late++;
      else if (status === 'absent') absent++;
      else if (status === 'excused') excused++;
    });

    const total = classStudents.length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;

    return { present, late, absent, excused, total, rate };
  }, [classStudents, attendanceState]);

  const handleExportCSV = () => {
    const headers = ['Student ID', 'Admission No', 'Full Name', 'Gender', 'Date', 'Class', 'Status', 'Notes'];
    const rows = classStudents.map((s) => {
      const entry = attendanceState[s.id] || { status: 'present', notes: '' };
      return [
        s.student_code,
        s.admission_number,
        `"${s.first_name} ${s.last_name}"`,
        s.gender.toUpperCase(),
        selectedDate,
        activeClass?.name || 'Class',
        entry.status.toUpperCase(),
        `"${entry.notes || ''}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_${activeClass?.name || 'Class'}_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick Date Helpers
  const setQuickDate = (type: 'today' | 'yesterday') => {
    const d = new Date();
    if (type === 'yesterday') {
      d.setDate(d.getDate() - 1);
    }
    const isoDate = d.toISOString().split('T')[0];
    onDateChange(isoDate);
  };

  const todayIso = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Control Bar: Class, Date & Session Status */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* Class Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Assigned Class</span>
              <span className="text-[11px] font-normal text-slate-500">
                {availableClasses.length} {availableClasses.length === 1 ? 'class' : 'classes'} available
              </span>
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => onClassChange(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none font-semibold text-slate-800"
            >
              {availableClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.level} - Arm {c.section || 'General'})
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker + Quick Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">Attendance Date</label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setQuickDate('today')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition ${
                    selectedDate === todayIso
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate('yesterday')}
                  className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                >
                  Yesterday
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none font-semibold text-slate-800"
              />
            </div>
          </div>

          {/* Session Status Banner */}
          <div>
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2.5 border ${
                existingRecordsInfo.hasExisting
                  ? 'bg-emerald-50/80 text-emerald-900 border-emerald-200'
                  : 'bg-amber-50/80 text-amber-900 border-amber-200'
              }`}
            >
              {existingRecordsInfo.hasExisting ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="font-bold block">Recorded Session Loaded</span>
                    <span className="text-[11px] text-emerald-800 truncate block">
                      Marked by {existingRecordsInfo.markedByName || 'Teacher'} •{' '}
                      {existingRecordsInfo.updatedAt
                        ? new Date(existingRecordsInfo.updatedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Recorded'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="font-bold block">Unrecorded Session</span>
                    <span className="text-[11px] text-amber-800 block">
                      No attendance saved yet for this date. Default set to Present.
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Live Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500">Total Enrolled</div>
          <div className="text-xl font-extrabold text-slate-900 mt-1 flex items-baseline gap-1.5">
            {stats.total}
            <span className="text-[11px] font-normal text-slate-400">students</span>
          </div>
        </div>
        <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 shadow-2xs">
          <div className="text-[11px] font-semibold text-emerald-800">Present</div>
          <div className="text-xl font-extrabold text-emerald-900 mt-1 flex items-baseline gap-1.5">
            {stats.present}
            <span className="text-[11px] font-semibold text-emerald-600">
              ({stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0}%)
            </span>
          </div>
        </div>
        <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-100 shadow-2xs">
          <div className="text-[11px] font-semibold text-amber-800">Late / Tardy</div>
          <div className="text-xl font-extrabold text-amber-900 mt-1 flex items-baseline gap-1.5">
            {stats.late}
            <span className="text-[11px] font-semibold text-amber-600">
              ({stats.total > 0 ? Math.round((stats.late / stats.total) * 100) : 0}%)
            </span>
          </div>
        </div>
        <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-100 shadow-2xs">
          <div className="text-[11px] font-semibold text-rose-800">Absent</div>
          <div className="text-xl font-extrabold text-rose-900 mt-1 flex items-baseline gap-1.5">
            {stats.absent}
            <span className="text-[11px] font-semibold text-rose-600">
              ({stats.total > 0 ? Math.round((stats.absent / stats.total) * 100) : 0}%)
            </span>
          </div>
        </div>
        <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-100 shadow-2xs col-span-2 sm:col-span-1">
          <div className="text-[11px] font-semibold text-sky-800">Attendance Rate</div>
          <div className="text-xl font-extrabold text-sky-900 mt-1 flex items-baseline gap-1.5">
            {stats.rate}%
            <span className="text-[11px] font-semibold text-sky-600">({stats.excused} exc)</span>
          </div>
        </div>
      </div>

      {/* Main Attendance Roster Sheet */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Roster Controls: Search, Status Filter & Bulk Shortcuts */}
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search student or admission no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-blue-500 outline-none"
              />
            </div>

            {/* Status Filter Chips */}
            <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                  statusFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({classStudents.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('present')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                  statusFilter === 'present'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                Present ({stats.present})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('late')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                  statusFilter === 'late'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-amber-700 hover:bg-amber-100'
                }`}
              >
                Late ({stats.late})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('absent')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                  statusFilter === 'absent'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-rose-700 hover:bg-rose-100'
                }`}
              >
                Absent ({stats.absent})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('excused')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                  statusFilter === 'excused'
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'text-sky-700 hover:bg-sky-100'
                }`}
              >
                Excused ({stats.excused})
              </button>
            </div>
          </div>

          {/* Bulk Action Buttons & Export */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleBulkSetStatus('present')}
              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs"
              title="Mark all students present"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark All Present</span>
            </button>

            <button
              type="button"
              onClick={() => handleBulkSetStatus('absent')}
              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs"
              title="Mark all students absent"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Mark All Absent</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-xl transition"
              title="Reset Sheet"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-xl transition"
              title="Export Sheet to CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table Roster */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 text-[10px]">
              <tr>
                <th className="px-4 py-3 w-12 text-center">#</th>
                <th className="px-4 py-3 min-w-[200px]">Student Details</th>
                <th className="px-4 py-3 min-w-[110px]">Admission No</th>
                <th className="px-4 py-3 min-w-[320px] text-center">Attendance Status</th>
                <th className="px-4 py-3 min-w-[260px]">Remarks / Quick Reason</th>
                <th className="px-4 py-3 w-12 text-center">History</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    {searchQuery
                      ? `No students matching "${searchQuery}" found in this class.`
                      : 'No active students enrolled in this class.'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((std, idx) => {
                  const currentStatus = attendanceState[std.id]?.status || 'present';
                  const currentNotes = attendanceState[std.id]?.notes || '';

                  return (
                    <tr key={std.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 text-slate-400 font-mono text-center">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {std.profile_photo_url ? (
                            <img
                              src={std.profile_photo_url}
                              alt={std.first_name}
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0">
                              {std.first_name[0]}
                              {std.last_name[0]}
                            </div>
                          )}
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => setSelectedStudentForModal(std)}
                              className="font-bold text-slate-900 hover:text-blue-600 text-left transition truncate block"
                            >
                              {std.first_name} {std.middle_name ? `${std.middle_name} ` : ''}{std.last_name}
                            </button>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {std.student_code} • {std.gender.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono text-slate-600">{std.admission_number}</td>

                      {/* Status Toggle Buttons */}
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex p-1 bg-slate-100 rounded-xl gap-1 border border-slate-200/60 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(std.id, 'present')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                              currentStatus === 'present'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Present</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(std.id, 'late')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                              currentStatus === 'late'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Late</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(std.id, 'absent')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                              currentStatus === 'absent'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Absent</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(std.id, 'excused')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                              currentStatus === 'excused'
                                ? 'bg-sky-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50'
                            }`}
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Excused</span>
                          </button>
                        </div>
                      </td>

                      {/* Remarks & Quick Presets */}
                      <td className="px-4 py-3">
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={currentNotes}
                            onChange={(e) => handleNotesChange(std.id, e.target.value)}
                            placeholder="Reason for absence / tardiness..."
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition"
                          />
                          {(currentStatus === 'late' || currentStatus === 'absent' || currentStatus === 'excused') && (
                            <div className="flex items-center gap-1 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleQuickNote(std.id, 'Medical')}
                                className="px-1.5 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition"
                              >
                                Medical
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickNote(std.id, 'Family Emergency')}
                                className="px-1.5 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition"
                              >
                                Family
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickNote(std.id, 'Transport Delay')}
                                className="px-1.5 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition"
                              >
                                Transport
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickNote(std.id, 'School Duty')}
                                className="px-1.5 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition"
                              >
                                School Duty
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Drilldown Student Attendance History */}
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedStudentForModal(std)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="View student attendance log"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Sticky Action Bottom Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            {isDirty ? (
              <span className="inline-flex items-center gap-1.5 text-amber-700 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5" />
                Unsaved changes on attendance sheet
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Attendance records up to date for {selectedDate}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onViewHistory}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              <History className="w-4 h-4 text-purple-600" />
              <span>View Past Logs</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAttendance}
              disabled={isSaving || classStudents.length === 0}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSaving
                  ? 'Saving Records...'
                  : existingRecordsInfo.hasExisting
                  ? 'Update Attendance Sheet'
                  : 'Submit & Save Attendance'}
              </span>
            </button>
          </div>
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
