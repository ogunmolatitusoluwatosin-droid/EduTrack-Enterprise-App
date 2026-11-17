import React, { useState, useMemo } from 'react';
import { db } from '../../../db/storage';
import { EmploymentStatus, EmploymentType } from '../../../types';
import { StatCard } from '../../common/StatCard';
import { StatusBadge } from '../../common/Badge';
import {
  Users,
  CheckCircle2,
  Briefcase,
  Building2,
  Search,
  Filter,
  Download,
  AlertCircle,
  Clock,
  UserX,
} from 'lucide-react';

export const StaffReportsTab: React.FC = () => {
  const staff = db.getStaff();

  // Filters State
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedEmploymentType, setSelectedEmploymentType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract unique departments
  const departments = useMemo(() => {
    const set = new Set<string>();
    staff.forEach((s) => {
      if (s.department) set.add(s.department);
    });
    return Array.from(set).sort();
  }, [staff]);

  // Overall Staff Stats
  const staffStats = useMemo(() => {
    const total = staff.length;
    const active = staff.filter((s) => s.employment_status === 'active').length;
    const onLeave = staff.filter((s) => s.employment_status === 'on_leave').length;
    const suspended = staff.filter((s) => s.employment_status === 'suspended').length;
    const resigned = staff.filter((s) => s.employment_status === 'resigned').length;
    const retired = staff.filter((s) => s.employment_status === 'retired').length;

    const fullTime = staff.filter((s) => s.employment_type === 'full_time').length;
    const partTime = staff.filter((s) => s.employment_type === 'part_time').length;
    const contract = staff.filter((s) => s.employment_type === 'contract').length;

    const activePct = total > 0 ? Math.round((active / total) * 100) : 0;

    return {
      total,
      active,
      activePct,
      onLeave,
      suspended,
      resigned,
      retired,
      fullTime,
      partTime,
      contract,
      departmentCount: departments.length,
    };
  }, [staff, departments]);

  // Staff by Department Breakdown
  const staffByDepartment = useMemo(() => {
    return departments.map((dept) => {
      const deptStaff = staff.filter((s) => s.department === dept);
      const activeCount = deptStaff.filter((s) => s.employment_status === 'active').length;
      const onLeaveCount = deptStaff.filter((s) => s.employment_status === 'on_leave').length;
      const fullTimeCount = deptStaff.filter((s) => s.employment_type === 'full_time').length;
      const otherStatusCount = deptStaff.length - activeCount - onLeaveCount;
      const pctOfTotal = staff.length > 0 ? Math.round((deptStaff.length / staff.length) * 100) : 0;

      return {
        department: dept,
        totalStaff: deptStaff.length,
        activeCount,
        onLeaveCount,
        fullTimeCount,
        otherStatusCount,
        pctOfTotal,
      };
    });
  }, [departments, staff]);

  // Filtered Staff
  const filteredStaff = useMemo(() => {
    return staff.filter((s) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullName = `${s.first_name} ${s.middle_name || ''} ${s.last_name}`.toLowerCase();
        const code = (s.staff_code || '').toLowerCase();
        const empNo = (s.employee_number || '').toLowerCase();
        const title = (s.job_title || '').toLowerCase();
        const email = (s.email || '').toLowerCase();
        if (!fullName.includes(q) && !code.includes(q) && !empNo.includes(q) && !title.includes(q) && !email.includes(q)) {
          return false;
        }
      }

      // Department Filter
      if (selectedDepartment !== 'ALL' && s.department !== selectedDepartment) {
        return false;
      }

      // Employment Status Filter
      if (selectedStatus !== 'ALL' && s.employment_status !== selectedStatus) {
        return false;
      }

      // Employment Type Filter
      if (selectedEmploymentType !== 'ALL' && s.employment_type !== selectedEmploymentType) {
        return false;
      }

      return true;
    });
  }, [staff, searchQuery, selectedDepartment, selectedStatus, selectedEmploymentType]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedDepartment !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    selectedEmploymentType !== 'ALL';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDepartment('ALL');
    setSelectedStatus('ALL');
    setSelectedEmploymentType('ALL');
  };

  const handleExportCSV = () => {
    const headers = ['Staff ID', 'Employee No', 'Full Name', 'Department', 'Job Title', 'Type', 'Status', 'Date Employed', 'Email', 'Phone'];
    const rows = filteredStaff.map((s) => [
      s.staff_code,
      s.employee_number || '',
      `${s.first_name} ${s.last_name}`,
      s.department,
      s.job_title,
      s.employment_type,
      s.employment_status,
      s.date_employed,
      s.email,
      s.phone,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `staff_reports_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. Core Staff Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Staff"
          value={staffStats.total}
          subtitle="All recorded personnel"
          icon={Users}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Active Staff"
          value={staffStats.active}
          subtitle={`${staffStats.activePct}% operational workforce`}
          icon={CheckCircle2}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Departments"
          value={staffStats.departmentCount}
          subtitle="Operational school units"
          icon={Building2}
          iconBgColor="bg-purple-50"
          iconColor="text-purple-600"
        />
        <StatCard
          title="Leave & Inactive"
          value={staffStats.onLeave + staffStats.suspended + staffStats.resigned + staffStats.retired}
          subtitle={`${staffStats.onLeave} On Leave, ${staffStats.resigned + staffStats.retired} Exited`}
          icon={AlertCircle}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
      </div>

      {/* 2. Staff by Employment Status */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Staff by Employment Status</h3>
            <p className="text-xs text-slate-500 mt-0.5">Workforce availability and employment lifecycle distribution</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
            {staffStats.total} Total Staff
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Active', count: staffStats.active, color: 'bg-emerald-500', textColor: 'text-emerald-700', bgLight: 'bg-emerald-50' },
            { label: 'On Leave', count: staffStats.onLeave, color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-50' },
            { label: 'Suspended', count: staffStats.suspended, color: 'bg-rose-500', textColor: 'text-rose-700', bgLight: 'bg-rose-50' },
            { label: 'Resigned', count: staffStats.resigned, color: 'bg-amber-500', textColor: 'text-amber-700', bgLight: 'bg-amber-50' },
            { label: 'Retired', count: staffStats.retired, color: 'bg-slate-500', textColor: 'text-slate-700', bgLight: 'bg-slate-50' },
          ].map((st) => {
            const pct = staffStats.total > 0 ? Math.round((st.count / staffStats.total) * 100) : 0;
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

      {/* 3. Staff by Department Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Staff by Department</h3>
            <p className="text-xs text-slate-500 mt-0.5">Headcount distribution, active staff, and full-time proportion per department</p>
          </div>
          <span className="text-xs font-medium text-slate-500">{departments.length} Departments</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Department Name</th>
                <th className="px-4 py-3 text-center">Total Staff</th>
                <th className="px-4 py-3 text-center">Active Staff</th>
                <th className="px-4 py-3 text-center">On Leave</th>
                <th className="px-4 py-3 text-center">Full-Time</th>
                <th className="px-4 py-3 text-center">Other Statuses</th>
                <th className="px-4 py-3">Share of Total Staff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffByDepartment.map((dept) => (
                <tr key={dept.department} className="hover:bg-slate-50/60 transition">
                  <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-purple-500" />
                    {dept.department}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-blue-600">{dept.totalStaff}</td>
                  <td className="px-4 py-3 text-center font-semibold text-emerald-700">{dept.activeCount}</td>
                  <td className="px-4 py-3 text-center text-slate-700">{dept.onLeaveCount}</td>
                  <td className="px-4 py-3 text-center text-slate-700">{dept.fullTimeCount}</td>
                  <td className="px-4 py-3 text-center text-slate-500">{dept.otherStatusCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-600 rounded-full"
                          style={{ width: `${Math.min(100, dept.pctOfTotal)}%` }}
                        />
                      </div>
                      <span className="font-bold text-slate-800">{dept.pctOfTotal}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Filtered Staff Roster / Directory Report */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Filter toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/60 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Staff Personnel Directory Report</h3>
              <p className="text-xs text-slate-500">Filter, search, and audit institutional staff records</p>
            </div>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl shadow-2xs transition"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/70">
            {/* Search */}
            <div className="relative min-w-[220px] flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, staff ID, title, email..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-blue-500 outline-none"
              />
            </div>

            {/* Department Filter */}
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
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
              <option value="on_leave">On Leave</option>
              <option value="suspended">Suspended</option>
              <option value="resigned">Resigned</option>
              <option value="retired">Retired</option>
            </select>

            {/* Employment Type */}
            <select
              value={selectedEmploymentType}
              onChange={(e) => setSelectedEmploymentType(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none capitalize"
            >
              <option value="ALL">All Contract Types</option>
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="contract">Contract</option>
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
            Showing <strong className="text-slate-800">{filteredStaff.length}</strong> of{' '}
            <strong className="text-slate-800">{staff.length}</strong> staff members
          </div>
        </div>

        {/* Staff Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Staff Name</th>
                <th className="px-4 py-3">Staff ID</th>
                <th className="px-4 py-3">Employee No</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Job Title</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Date Employed</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No staff records match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {s.first_name} {s.middle_name ? `${s.middle_name} ` : ''}{s.last_name}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-blue-600">{s.staff_code}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{s.employee_number || '—'}</td>
                    <td className="px-4 py-3 text-slate-800 font-medium">{s.department}</td>
                    <td className="px-4 py-3 text-slate-700">{s.job_title}</td>
                    <td className="px-4 py-3 capitalize text-slate-600">{s.employment_type.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-slate-500">{s.date_employed}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.employment_status} />
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
