import React, { useState, useMemo } from 'react';
import { db } from '../../../db/storage';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { AttendanceRecord, SchoolClass, AttendanceStatus, Student } from '../../../types';
import {
  Calendar,
  Filter,
  Search,
  Download,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  User,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { StudentAttendanceModal } from './StudentAttendanceModal';

interface AttendanceHistoryTabProps {
  availableClasses: SchoolClass[];
  selectedClassId: string;
  onSelectSession: (classId: string, date: string) => void;
  onClassChange: (classId: string) => void;
}

export const AttendanceHistoryTab: React.FC<AttendanceHistoryTabProps> = ({
  availableClasses,
  selectedClassId,
  onSelectSession,
  onClassChange,
}) => {
  const { user, staff, isSchoolAdmin, isSuperAdmin } = useAuth();
  const toast = useToast();

  const [dateFilterRange, setDateFilterRange] = useState<
    'all' | 'today' | 'this_week' | 'this_month' | 'custom'
  >('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AttendanceStatus>('all');
  const [expandedSessionKey, setExpandedSessionKey] = useState<string | null>(null);
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<Student | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<{ classId: string; date: string; className: string } | null>(null);

  const staffMap = useMemo(() => {
    const map = new Map<string, string>();
    db.getStaff().forEach((st) => {
      map.set(st.id, `${st.first_name} ${st.last_name}`);
    });
    db.getUsers().forEach((u) => {
      map.set(u.id, u.full_name);
    });
    return map;
  }, []);

  const studentsMap = useMemo(() => {
    const map = new Map<string, Student>();
    db.getStudents().forEach((s) => map.set(s.id, s));
    return map;
  }, []);

  // Fetch all attendance records filtered by selected class (or across all available classes)
  const rawRecords = useMemo(() => {
    if (selectedClassId === 'all') {
      const allowedClassIds = new Set(availableClasses.map((c) => c.id));
      return db.getAllAttendance().filter((a) => allowedClassIds.has(a.class_id));
    }
    return db.getAttendance(selectedClassId);
  }, [selectedClassId, availableClasses]);

  // Filter records by date range, student query, and status
  const filteredRecords = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Compute start of week (Sunday or Monday)
    const currentDay = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - currentDay);
    const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

    // Compute start of month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfMonthStr = startOfMonth.toISOString().split('T')[0];

    return rawRecords.filter((rec) => {
      // Date range filtering
      if (dateFilterRange === 'today' && rec.attendance_date !== todayStr) return false;
      if (dateFilterRange === 'this_week' && rec.attendance_date < startOfWeekStr) return false;
      if (dateFilterRange === 'this_month' && rec.attendance_date < startOfMonthStr) return false;
      if (dateFilterRange === 'custom') {
        if (customStartDate && rec.attendance_date < customStartDate) return false;
        if (customEndDate && rec.attendance_date > customEndDate) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && rec.status !== statusFilter) return false;

      // Student search query filter
      if (searchStudentQuery.trim()) {
        const student = studentsMap.get(rec.student_id);
        if (!student) return false;
        const q = searchStudentQuery.toLowerCase();
        const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
        const adm = (student.admission_number || '').toLowerCase();
        const code = (student.student_code || '').toLowerCase();
        if (!fullName.includes(q) && !adm.includes(q) && !code.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [rawRecords, dateFilterRange, customStartDate, customEndDate, statusFilter, searchStudentQuery, studentsMap]);

  // Group filtered records by (class_id + attendance_date)
  const groupedSessions = useMemo(() => {
    const map = new Map<string, { classId: string; date: string; records: AttendanceRecord[] }>();

    filteredRecords.forEach((rec) => {
      const key = `${rec.class_id}_${rec.attendance_date}`;
      if (!map.has(key)) {
        map.set(key, {
          classId: rec.class_id,
          date: rec.attendance_date,
          records: [],
        });
      }
      map.get(key)!.records.push(rec);
    });

    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredRecords]);

  const handleDeleteSession = () => {
    if (!sessionToDelete) return;
    try {
      const actor = user
        ? { id: staff?.id || user.id, name: user.full_name }
        : { id: 'admin', name: 'School Admin' };

      db.deleteAttendanceForClassAndDate(sessionToDelete.classId, sessionToDelete.date, actor);
      toast.success(
        'Session Deleted',
        `Attendance log for ${sessionToDelete.className} on ${sessionToDelete.date} was removed.`
      );
      setSessionToDelete(null);
    } catch (err: any) {
      toast.error('Deletion Failed', err.message || 'Could not delete attendance session.');
    }
  };

  const handleExportSessionCSV = (session: { classId: string; date: string; records: AttendanceRecord[] }) => {
    const cls = db.getClassById(session.classId);
    const headers = ['Student ID', 'Admission No', 'Full Name', 'Date', 'Class', 'Status', 'Notes', 'Marked By'];
    const rows = session.records.map((r) => {
      const s = studentsMap.get(r.student_id);
      const recorder = r.marked_by ? staffMap.get(r.marked_by) || 'Staff' : 'System';
      return [
        s?.student_code || '',
        s?.admission_number || '',
        `"${s?.first_name || ''} ${s?.last_name || ''}"`,
        r.attendance_date,
        `"${cls?.name || 'Class'}"`,
        r.status.toUpperCase(),
        `"${r.notes || ''}"`,
        `"${recorder}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_Log_${cls?.name || 'Class'}_${session.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusPill = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Present</span>;
      case 'late':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Late</span>;
      case 'absent':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Absent</span>;
      case 'excused':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">Excused</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Filter className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Filter Attendance Logs
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Class Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Select Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => onClassChange(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none font-semibold text-slate-800"
            >
              <option value="all">All Available Classes</option>
              {availableClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.level})
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter Range */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Time Period</label>
            <select
              value={dateFilterRange}
              onChange={(e) => setDateFilterRange(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none font-semibold text-slate-800"
            >
              <option value="all">All Recorded Time</option>
              <option value="today">Today Only</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Student Search */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Student Search</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchStudentQuery}
                onChange={(e) => setSearchStudentQuery(e.target.value)}
                placeholder="Filter by student name..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none font-semibold text-slate-800"
            >
              <option value="all">All Statuses</option>
              <option value="present">Present Only</option>
              <option value="late">Late Only</option>
              <option value="absent">Absent Only</option>
              <option value="excused">Excused Only</option>
            </select>
          </div>
        </div>

        {/* Custom Date Pickers when 'custom' is active */}
        {dateFilterRange === 'custom' && (
          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Grouped Sessions List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Recorded Daily Sessions ({groupedSessions.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Total individual records: <span className="font-bold text-slate-800">{filteredRecords.length}</span>
          </span>
        </div>

        {groupedSessions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No attendance records matched your filter criteria.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {groupedSessions.map((session) => {
              const sessionKey = `${session.classId}_${session.date}`;
              const isExpanded = expandedSessionKey === sessionKey;
              const cls = db.getClassById(session.classId);

              const present = session.records.filter((r) => r.status === 'present').length;
              const late = session.records.filter((r) => r.status === 'late').length;
              const absent = session.records.filter((r) => r.status === 'absent').length;
              const excused = session.records.filter((r) => r.status === 'excused').length;
              const total = session.records.length;
              const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;

              const firstRec = session.records[0];
              const recordedBy = firstRec.marked_by ? staffMap.get(firstRec.marked_by) || 'Teacher' : 'Staff';

              return (
                <div key={sessionKey} className="transition hover:bg-slate-50/40">
                  {/* Session Header Row */}
                  <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5 min-w-[240px]">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 font-bold rounded-lg text-xs border border-purple-200">
                          {cls?.name || 'Class'}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">
                          {new Date(session.date).toLocaleDateString(undefined, {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </h4>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="font-semibold text-emerald-700">{present} Present</span>
                        <span>•</span>
                        <span className="font-semibold text-amber-700">{late} Late</span>
                        <span>•</span>
                        <span className="font-semibold text-rose-700">{absent} Absent</span>
                        <span>•</span>
                        <span className="font-semibold text-sky-700">{excused} Excused</span>
                      </div>

                      <div className="text-[11px] text-slate-400">
                        Marked by <span className="text-slate-600 font-semibold">{recordedBy}</span> • Updated{' '}
                        {firstRec.updated_at
                          ? new Date(firstRec.updated_at).toLocaleDateString()
                          : 'Recorded'}
                      </div>
                    </div>

                    {/* Rate Bar & Action Buttons */}
                    <div className="flex items-center gap-4">
                      {/* Attendance Percentage Badge */}
                      <div className="text-right">
                        <div className="text-base font-extrabold text-slate-900">{rate}%</div>
                        <div className="text-[10px] text-slate-400 font-semibold">Attendance Rate</div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectSession(session.classId, session.date)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center gap-1"
                          title="Open in Attendance Sheet to edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Sheet</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setExpandedSessionKey(isExpanded ? null : sessionKey)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1"
                        >
                          <span>{isExpanded ? 'Hide' : 'Details'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleExportSessionCSV(session)}
                          className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-xl transition"
                          title="Export this session to CSV"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {(isSchoolAdmin || isSuperAdmin) && (
                          <button
                            type="button"
                            onClick={() =>
                              setSessionToDelete({
                                classId: session.classId,
                                date: session.date,
                                className: cls?.name || 'Class',
                              })
                            }
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl transition"
                            title="Delete this attendance session"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Session Students Sub-Table */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 bg-slate-50/50 border-t border-slate-100">
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                            <tr>
                              <th className="px-3.5 py-2">Student</th>
                              <th className="px-3.5 py-2">Admission No</th>
                              <th className="px-3.5 py-2 text-center">Status</th>
                              <th className="px-3.5 py-2">Reason / Note</th>
                              <th className="px-3.5 py-2 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {session.records.map((rec) => {
                              const std = studentsMap.get(rec.student_id);
                              return (
                                <tr key={rec.id} className="hover:bg-slate-50/50 transition">
                                  <td className="px-3.5 py-2 font-medium text-slate-900">
                                    {std ? `${std.first_name} ${std.last_name}` : 'Unknown Student'}
                                  </td>
                                  <td className="px-3.5 py-2 font-mono text-slate-600">
                                    {std?.admission_number || '-'}
                                  </td>
                                  <td className="px-3.5 py-2 text-center">{getStatusPill(rec.status)}</td>
                                  <td className="px-3.5 py-2 text-slate-600">
                                    {rec.notes ? <span className="italic">{rec.notes}</span> : <span className="text-slate-300">—</span>}
                                  </td>
                                  <td className="px-3.5 py-2 text-right">
                                    {std && (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedStudentForModal(std)}
                                        className="text-xs text-blue-600 hover:underline font-semibold"
                                      >
                                        Student Profile
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">Delete Attendance Session</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove the attendance session for{' '}
              <span className="font-bold text-slate-800">{sessionToDelete.className}</span> on{' '}
              <span className="font-bold text-slate-800">{sessionToDelete.date}</span>? This will remove all
              student records logged for that specific date.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSessionToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSession}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Attendance Modal Drilldown */}
      <StudentAttendanceModal
        student={selectedStudentForModal}
        onClose={() => setSelectedStudentForModal(null)}
      />
    </div>
  );
};
