import React, { useState, useMemo } from 'react';
import { db } from '../../../db/storage';
import { useAuth } from '../../../context/AuthContext';
import { StudentStatus, Gender } from '../../../types';
import { StatCard } from '../../common/StatCard';
import { StatusBadge } from '../../common/Badge';
import {
  GraduationCap,
  Users,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Layers,
  ArrowUpDown,
  Download,
  Building,
  UserCheck,
} from 'lucide-react';

export const StudentReportsTab: React.FC = () => {
  const { isTeacher, staff, isSchoolAdmin, isSuperAdmin } = useAuth();
  
  const classes = useMemo(() => {
    if (isTeacher && staff && !isSchoolAdmin && !isSuperAdmin) {
      return db.getClassesForTeacher(staff.id);
    }
    return db.getClasses();
  }, [isTeacher, staff, isSchoolAdmin, isSuperAdmin]);

  const students = useMemo(() => {
    let list = db.getStudents();
    if (isTeacher && staff && !isSchoolAdmin && !isSuperAdmin) {
      const teacherClassIds = classes.map((c) => c.id);
      list = list.filter((s) => teacherClassIds.includes(s.current_class_id));
    }
    return list;
  }, [classes, isTeacher, staff, isSchoolAdmin, isSuperAdmin]);

  // Filters State
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedGender, setSelectedGender] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Class Map for quick lookup
  const classMap = useMemo(() => {
    const map = new Map<string, string>();
    classes.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [classes]);

  // Status Distribution Calculation
  const statusStats = useMemo(() => {
    const total = students.length;
    const active = students.filter((s) => s.student_status === 'active').length;
    const graduated = students.filter((s) => s.student_status === 'graduated').length;
    const transferred = students.filter((s) => s.student_status === 'transferred').length;
    const suspended = students.filter((s) => s.student_status === 'suspended').length;
    const withdrawn = students.filter((s) => s.student_status === 'withdrawn').length;

    const male = students.filter((s) => s.gender === 'male').length;
    const female = students.filter((s) => s.gender === 'female').length;

    return {
      total,
      active,
      activePct: total > 0 ? Math.round((active / total) * 100) : 0,
      graduated,
      transferred,
      suspended,
      withdrawn,
      male,
      female,
    };
  }, [students]);

  // Students by Class Calculation
  const studentsByClass = useMemo(() => {
    return classes.map((cls) => {
      const classStudents = students.filter((s) => s.current_class_id === cls.id);
      const activeCount = classStudents.filter((s) => s.student_status === 'active').length;
      const maleCount = classStudents.filter((s) => s.gender === 'male').length;
      const femaleCount = classStudents.filter((s) => s.gender === 'female').length;
      const utilization = cls.capacity > 0 ? Math.round((classStudents.length / cls.capacity) * 100) : 0;

      // Status breakdown within class
      const graduatedCount = classStudents.filter((s) => s.student_status === 'graduated').length;
      const transferredCount = classStudents.filter((s) => s.student_status === 'transferred').length;
      const suspendedCount = classStudents.filter((s) => s.student_status === 'suspended').length;
      const withdrawnCount = classStudents.filter((s) => s.student_status === 'withdrawn').length;

      return {
        ...cls,
        totalStudents: classStudents.length,
        activeCount,
        maleCount,
        femaleCount,
        graduatedCount,
        transferredCount,
        suspendedCount,
        withdrawnCount,
        utilization,
      };
    });
  }, [classes, students]);

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullName = `${s.first_name} ${s.middle_name || ''} ${s.last_name}`.toLowerCase();
        const adm = (s.admission_number || '').toLowerCase();
        const code = (s.student_code || '').toLowerCase();
        if (!fullName.includes(q) && !adm.includes(q) && !code.includes(q)) {
          return false;
        }
      }

      // Class Filter
      if (selectedClassId !== 'ALL' && s.current_class_id !== selectedClassId) {
        return false;
      }

      // Status Filter
      if (selectedStatus !== 'ALL' && s.student_status !== selectedStatus) {
        return false;
      }

      // Gender Filter
      if (selectedGender !== 'ALL' && s.gender !== selectedGender) {
        return false;
      }

      return true;
    });
  }, [students, searchQuery, selectedClassId, selectedStatus, selectedGender]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedClassId !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    selectedGender !== 'ALL';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedClassId('ALL');
    setSelectedStatus('ALL');
    setSelectedGender('ALL');
  };

  const handleExportCSV = () => {
    const headers = ['Student ID', 'Admission No', 'First Name', 'Last Name', 'Class', 'Gender', 'Status', 'Admission Date'];
    const rows = filteredStudents.map((s) => [
      s.student_code,
      s.admission_number,
      s.first_name,
      s.last_name,
      classMap.get(s.current_class_id) || 'Unassigned',
      s.gender,
      s.student_status,
      s.admission_date,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `student_reports_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. Core Student Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={statusStats.total}
          subtitle="All-time registered enrollments"
          icon={GraduationCap}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Active Students"
          value={statusStats.active}
          subtitle={`${statusStats.activePct}% of total enrollment`}
          icon={CheckCircle2}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Gender Breakdown"
          value={`${statusStats.male} Boys / ${statusStats.female} Girls`}
          subtitle="Active learner gender balance"
          icon={Users}
          iconBgColor="bg-indigo-50"
          iconColor="text-indigo-600"
        />
        <StatCard
          title="Other Statuses"
          value={statusStats.graduated + statusStats.transferred + statusStats.suspended + statusStats.withdrawn}
          subtitle={`${statusStats.graduated} Grad, ${statusStats.transferred} Trans, ${statusStats.suspended} Susp, ${statusStats.withdrawn} Withd`}
          icon={AlertCircle}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
      </div>

      {/* 2. Students By Status Breakdown Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Students by Status</h3>
            <p className="text-xs text-slate-500 mt-0.5">Distribution of student lifecycle & academic statuses</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
            {statusStats.total} Total Registered
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Active', count: statusStats.active, color: 'bg-emerald-500', textColor: 'text-emerald-700', bgLight: 'bg-emerald-50' },
            { label: 'Graduated', count: statusStats.graduated, color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-50' },
            { label: 'Transferred', count: statusStats.transferred, color: 'bg-amber-500', textColor: 'text-amber-700', bgLight: 'bg-amber-50' },
            { label: 'Suspended', count: statusStats.suspended, color: 'bg-rose-500', textColor: 'text-rose-700', bgLight: 'bg-rose-50' },
            { label: 'Withdrawn', count: statusStats.withdrawn, color: 'bg-slate-500', textColor: 'text-slate-700', bgLight: 'bg-slate-50' },
          ].map((st) => {
            const pct = statusStats.total > 0 ? Math.round((st.count / statusStats.total) * 100) : 0;
            return (
              <div key={st.label} className={`p-3.5 rounded-xl border border-slate-200 ${st.bgLight}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">{st.label}</span>
                  <span className={`text-xs font-bold ${st.textColor}`}>{pct}%</span>
                </div>
                <div className="text-xl font-extrabold text-slate-900 mt-1">{st.count}</div>
                <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden mt-2">
                  <div className={`h-full ${st.color} rounded-full`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Students by Class Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Students by Class</h3>
            <p className="text-xs text-slate-500 mt-0.5">Headcount, gender distribution, and classroom capacity utilization</p>
          </div>
          <span className="text-xs font-medium text-slate-500">{classes.length} Classes Configured</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Class Name</th>
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3 text-center">Total Students</th>
                <th className="px-4 py-3 text-center">Active</th>
                <th className="px-4 py-3 text-center">Boys</th>
                <th className="px-4 py-3 text-center">Girls</th>
                <th className="px-4 py-3 text-center">Capacity</th>
                <th className="px-4 py-3">Capacity Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {studentsByClass.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                    <Building className="w-4 h-4 text-blue-500" />
                    {c.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600 uppercase font-semibold">{c.level}</td>
                  <td className="px-4 py-3 text-center font-bold text-blue-600">{c.totalStudents}</td>
                  <td className="px-4 py-3 text-center font-semibold text-emerald-700">{c.activeCount}</td>
                  <td className="px-4 py-3 text-center text-slate-700">{c.maleCount}</td>
                  <td className="px-4 py-3 text-center text-slate-700">{c.femaleCount}</td>
                  <td className="px-4 py-3 text-center text-slate-500">{c.capacity}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            c.utilization > 100 ? 'bg-rose-500' : c.utilization >= 80 ? 'bg-emerald-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(100, c.utilization)}%` }}
                        />
                      </div>
                      <span className="font-bold text-slate-800">{c.utilization}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Filtered Student Directory / Report Roster */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Filters Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/60 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Student Directory Report</h3>
              <p className="text-xs text-slate-500">Query and filter student records across classes and statuses</p>
            </div>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl shadow-2xs transition"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/70">
            {/* Search */}
            <div className="relative min-w-[220px] flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, student ID, adm no..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-blue-500 outline-none"
              />
            </div>

            {/* Class Filter */}
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="ALL">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none capitalize"
            >
              <option value="ALL">All Statuses</option>
              <option value="active">Active</option>
              <option value="graduated">Graduated</option>
              <option value="transferred">Transferred</option>
              <option value="suspended">Suspended</option>
              <option value="withdrawn">Withdrawn</option>
            </select>

            {/* Gender Filter */}
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none capitalize"
            >
              <option value="ALL">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
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
            Showing <strong className="text-slate-800">{filteredStudents.length}</strong> of{' '}
            <strong className="text-slate-800">{students.length}</strong> students
          </div>
        </div>

        {/* Student Records Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3">Student ID</th>
                <th className="px-4 py-3">Admission No</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Gender</th>
                <th className="px-4 py-3">Admission Date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No students match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {s.first_name} {s.middle_name ? `${s.middle_name} ` : ''}{s.last_name}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">{s.student_code}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-blue-600">{s.admission_number}</td>
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      {classMap.get(s.current_class_id) || 'Unassigned'}
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-600">{s.gender}</td>
                    <td className="px-4 py-3 text-slate-500">{s.admission_date}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.student_status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
