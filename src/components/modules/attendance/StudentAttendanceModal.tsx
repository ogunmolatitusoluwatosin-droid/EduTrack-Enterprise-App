import React, { useMemo } from 'react';
import { db } from '../../../db/storage';
import { Student, AttendanceStatus } from '../../../types';
import {
  X,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Download,
  Award,
  TrendingUp,
  User,
} from 'lucide-react';

interface StudentAttendanceModalProps {
  student: Student | null;
  onClose: () => void;
}

export const StudentAttendanceModal: React.FC<StudentAttendanceModalProps> = ({
  student,
  onClose,
}) => {
  if (!student) return null;

  const schoolClass = student.current_class_id ? db.getClassById(student.current_class_id) : undefined;
  const attendanceRecords = useMemo(() => {
    return db.getAttendanceForStudent(student.id);
  }, [student.id]);

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

  const stats = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    let excused = 0;

    attendanceRecords.forEach((r) => {
      if (r.status === 'present') present++;
      else if (r.status === 'late') late++;
      else if (r.status === 'absent') absent++;
      else if (r.status === 'excused') excused++;
    });

    const total = attendanceRecords.length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;

    let healthStatus = 'Excellent';
    let healthColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (rate < 75) {
      healthStatus = 'Critical Attention';
      healthColor = 'text-rose-700 bg-rose-50 border-rose-200';
    } else if (rate < 85) {
      healthStatus = 'Needs Improvement';
      healthColor = 'text-amber-700 bg-amber-50 border-amber-200';
    } else if (rate < 95) {
      healthStatus = 'Good';
      healthColor = 'text-blue-700 bg-blue-50 border-blue-200';
    }

    return { present, late, absent, excused, total, rate, healthStatus, healthColor };
  }, [attendanceRecords]);

  const handleExportCSV = () => {
    const headers = ['Date', 'Status', 'Class', 'Notes/Reason', 'Recorded By', 'Recorded At'];
    const rows = attendanceRecords.map((r) => {
      const recordedBy = r.marked_by ? staffMap.get(r.marked_by) || 'Staff' : 'System';
      return [
        r.attendance_date,
        r.status.toUpperCase(),
        schoolClass?.name || 'Class',
        `"${r.notes || ''}"`,
        `"${recordedBy}"`,
        r.created_at || '',
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_Log_${student.first_name}_${student.last_name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Present
          </span>
        );
      case 'late':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Late
          </span>
        );
      case 'absent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            Absent
          </span>
        );
      case 'excused':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <AlertCircle className="w-3 h-3 text-sky-600" />
            Excused
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            {student.profile_photo_url ? (
              <img
                src={student.profile_photo_url}
                alt={student.first_name}
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-xl object-cover border border-slate-200 shadow-2xs"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 font-bold text-base flex items-center justify-center shadow-2xs">
                {student.first_name[0]}
                {student.last_name[0]}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {student.first_name} {student.middle_name ? `${student.middle_name} ` : ''}{student.last_name}
                </h3>
                <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md border ${stats.healthColor}`}>
                  {stats.healthStatus} ({stats.rate}%)
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Adm No: <span className="font-mono text-slate-700">{student.admission_number}</span> • Class:{' '}
                <span className="font-semibold text-slate-700">{schoolClass?.name || 'Unassigned'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[11px] text-slate-500 font-semibold block">Total Days</span>
              <span className="text-lg font-bold text-slate-900 mt-0.5 block">{stats.total}</span>
            </div>
            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100">
              <span className="text-[11px] text-emerald-800 font-semibold block">Present</span>
              <span className="text-lg font-bold text-emerald-900 mt-0.5 block">{stats.present}</span>
            </div>
            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-100">
              <span className="text-[11px] text-amber-800 font-semibold block">Late</span>
              <span className="text-lg font-bold text-amber-900 mt-0.5 block">{stats.late}</span>
            </div>
            <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-100">
              <span className="text-[11px] text-rose-800 font-semibold block">Absent</span>
              <span className="text-lg font-bold text-rose-900 mt-0.5 block">{stats.absent}</span>
            </div>
            <div className="p-3 bg-sky-50/70 rounded-xl border border-sky-100 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-sky-800 font-semibold block">Excused</span>
              <span className="text-lg font-bold text-sky-900 mt-0.5 block">{stats.excused}</span>
            </div>
          </div>

          {/* Records Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Recorded Attendance Sessions ({attendanceRecords.length})
                </h4>
              </div>
              {attendanceRecords.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              )}
            </div>

            {attendanceRecords.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                No attendance records logged for this student yet.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="px-3.5 py-2.5">Date</th>
                      <th className="px-3.5 py-2.5">Status</th>
                      <th className="px-3.5 py-2.5">Remarks / Reason</th>
                      <th className="px-3.5 py-2.5">Logged By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendanceRecords.map((r) => {
                      const recorder = r.marked_by ? staffMap.get(r.marked_by) || 'Teaching Staff' : 'System';
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/60 transition">
                          <td className="px-3.5 py-2.5 font-medium text-slate-800 whitespace-nowrap">
                            {new Date(r.attendance_date).toLocaleDateString(undefined, {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap">{getStatusBadge(r.status)}</td>
                          <td className="px-3.5 py-2.5 text-slate-600">
                            {r.notes ? (
                              <span className="italic">{r.notes}</span>
                            ) : (
                              <span className="text-slate-300 font-mono">—</span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-500 text-[11px] whitespace-nowrap">
                            {recorder}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
