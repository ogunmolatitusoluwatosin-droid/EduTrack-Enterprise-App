import React, { useState, useMemo } from 'react';
import { db } from '../../../db/storage';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Staff, EmploymentStatus } from '../../../types';
import { PageHeader } from '../../layout/PageHeader';
import { StatusBadge } from '../../common/Badge';
import { StaffFormModal } from './StaffFormModal';
import { StaffProfileModal } from './StaffProfileModal';
import {
  Search,
  Plus,
  Filter,
  Eye,
  Edit,
  Users,
  Download,
  Building2,
  Mail,
  Phone,
  GraduationCap,
  Briefcase,
  CheckCircle2,
  Power,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';

interface StaffListProps {
  initialSelectedStaffId?: string | null;
  onClearInitialStaff?: () => void;
}

export const StaffList: React.FC<StaffListProps> = ({
  initialSelectedStaffId,
  onClearInitialStaff,
}) => {
  const { isSchoolAdmin, isSuperAdmin, user } = useAuth();
  const toast = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'TEACHERS' | 'ADMINS'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState<Staff | null>(null);
  const [profileStaffId, setProfileStaffId] = useState<string | null>(initialSelectedStaffId || null);

  const [refreshKey, setRefreshKey] = useState(0);
  const reloadData = () => setRefreshKey((prev) => prev + 1);

  const allStaff = useMemo(() => db.getStaff(), [refreshKey]);
  const classes = useMemo(() => db.getClasses(), [refreshKey]);
  const classSubjects = useMemo(() => db.getClassSubjects(), [refreshKey]);

  // Distinct departments
  const departments = useMemo(() => {
    const set = new Set(allStaff.map((s) => s.department).filter(Boolean));
    return Array.from(set).sort();
  }, [allStaff]);

  // Distinct job titles
  const jobTitles = useMemo(() => {
    const set = new Set(allStaff.map((s) => s.job_title).filter(Boolean));
    return Array.from(set).sort();
  }, [allStaff]);

  // Metrics summary
  const metrics = useMemo(() => {
    const total = allStaff.length;
    const active = allStaff.filter((s) => s.employment_status === 'active').length;
    const teachers = allStaff.filter(
      (s) =>
        s.job_title.toLowerCase().includes('teacher') ||
        s.job_title.toLowerCase().includes('instructor') ||
        s.assigned_class_id ||
        classes.some((c) => c.class_teacher_id === s.id) ||
        classSubjects.some((cs) => cs.teacher_id === s.id)
    ).length;
    const onLeaveOrInactive = allStaff.filter((s) => s.employment_status !== 'active').length;

    return { total, active, teachers, onLeaveOrInactive };
  }, [allStaff, classes, classSubjects]);

  // Filtered staff records
  const filteredStaff = useMemo(() => {
    return allStaff.filter((s) => {
      // Search filter by staff name or employee number or staff code or email or job title
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullName = `${s.first_name} ${s.middle_name || ''} ${s.last_name}`.toLowerCase();
        const code = (s.staff_code || '').toLowerCase();
        const empNo = (s.employee_number || '').toLowerCase();
        const title = (s.job_title || '').toLowerCase();
        const email = (s.email || '').toLowerCase();
        const phone = (s.phone || '').toLowerCase();

        if (
          !fullName.includes(q) &&
          !code.includes(q) &&
          !empNo.includes(q) &&
          !title.includes(q) &&
          !email.includes(q) &&
          !phone.includes(q)
        ) {
          return false;
        }
      }

      // Department filter
      if (selectedDept !== 'ALL' && s.department !== selectedDept) {
        return false;
      }

      // Job Title filter
      if (selectedJobTitle !== 'ALL' && s.job_title !== selectedJobTitle) {
        return false;
      }

      // Employment Status filter
      if (selectedStatus !== 'ALL' && s.employment_status !== selectedStatus) {
        return false;
      }

      // Employment Type filter
      if (selectedType !== 'ALL' && s.employment_type !== selectedType) {
        return false;
      }

      // Role filter tab
      if (roleFilter === 'TEACHERS') {
        const isTeacher =
          s.job_title.toLowerCase().includes('teacher') ||
          s.job_title.toLowerCase().includes('instructor') ||
          s.assigned_class_id ||
          classes.some((c) => c.class_teacher_id === s.id) ||
          classSubjects.some((cs) => cs.teacher_id === s.id);
        if (!isTeacher) return false;
      } else if (roleFilter === 'ADMINS') {
        const isAdmin =
          s.department.toLowerCase().includes('admin') ||
          s.department.toLowerCase().includes('management') ||
          s.job_title.toLowerCase().includes('principal') ||
          s.job_title.toLowerCase().includes('administrator') ||
          s.job_title.toLowerCase().includes('bursar');
        if (!isAdmin) return false;
      }

      return true;
    });
  }, [allStaff, searchQuery, selectedDept, selectedJobTitle, selectedStatus, selectedType, roleFilter, classes, classSubjects]);

  const totalPages = Math.ceil(filteredStaff.length / pageSize) || 1;
  const paginatedStaff = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStaff.slice(start, start + pageSize);
  }, [filteredStaff, currentPage]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedDept('ALL');
    setSelectedJobTitle('ALL');
    setSelectedStatus('ALL');
    setSelectedType('ALL');
    setRoleFilter('ALL');
    setCurrentPage(1);
  };

  const handleToggleStatusQuick = (staff: Staff, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSchoolAdmin && !isSuperAdmin) {
      toast.error('Unauthorized', 'Only school administrators can modify staff status.');
      return;
    }

    const nextStatus: EmploymentStatus = staff.employment_status === 'active' ? 'on_leave' : 'active';
    try {
      const actor = user ? { id: user.id, name: user.full_name } : undefined;
      db.toggleStaffStatus(staff.id, nextStatus, actor);
      toast.success(
        'Status Updated',
        `${staff.first_name} ${staff.last_name} set to ${nextStatus.toUpperCase()}`
      );
      reloadData();
    } catch (err: any) {
      toast.error('Error updating status', err.message);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Staff ID',
      'Employee Number',
      'First Name',
      'Middle Name',
      'Last Name',
      'Gender',
      'Date of Birth',
      'Email',
      'Phone',
      'Address',
      'Job Title',
      'Department',
      'Employment Type',
      'Employment Status',
      'Date Employed',
      'Qualification',
    ];

    const rows = filteredStaff.map((s) => [
      `"${s.staff_code}"`,
      `"${s.employee_number || s.staff_code}"`,
      `"${s.first_name}"`,
      `"${s.middle_name || ''}"`,
      `"${s.last_name}"`,
      `"${s.gender}"`,
      `"${s.date_of_birth}"`,
      `"${s.email}"`,
      `"${s.phone}"`,
      `"${(s.address || '').replace(/"/g, '""')}"`,
      `"${(s.job_title || '').replace(/"/g, '""')}"`,
      `"${(s.department || '').replace(/"/g, '""')}"`,
      `"${s.employment_type}"`,
      `"${s.employment_status}"`,
      `"${s.date_employed}"`,
      `"${(s.qualification || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EduTrack_Staff_Roster_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isTeacher = (s: Staff) => {
    return (
      s.job_title.toLowerCase().includes('teacher') ||
      s.job_title.toLowerCase().includes('instructor') ||
      s.assigned_class_id ||
      classes.some((c) => c.class_teacher_id === s.id) ||
      classSubjects.some((cs) => cs.teacher_id === s.id)
    );
  };

  const getClassTeacherRole = (s: Staff) => {
    const headOf = classes.find((c) => c.class_teacher_id === s.id || c.id === s.assigned_class_id);
    return headOf ? headOf.name : null;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff & Teacher Management"
        subtitle={`Directory of academic and administrative personnel (${filteredStaff.length} records)`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-2xs transition"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
            {(isSchoolAdmin || isSuperAdmin) && (
              <button
                onClick={() => {
                  setStaffToEdit(null);
                  setIsFormOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Staff Member</span>
              </button>
            )}
          </div>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-medium">
            <span>Total Staff Roster</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">{metrics.total}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Across all departments</div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600 text-xs mb-1 font-medium">
            <span>Active Staff</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">{metrics.active}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
            {metrics.total > 0 ? Math.round((metrics.active / metrics.total) * 100) : 0}% on active duty
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-indigo-600 text-xs mb-1 font-medium">
            <span>Teaching Faculty</span>
            <GraduationCap className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">{metrics.teachers}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Instructors & class teachers</div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-amber-600 text-xs mb-1 font-medium">
            <span>Leave & Off-duty</span>
            <Building2 className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">{metrics.onLeaveOrInactive}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">On leave or inactive</div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        {/* Role Quick Filter Tabs */}
        <div className="flex items-center gap-1.5 border-b border-slate-100 pb-3 overflow-x-auto">
          {[
            { id: 'ALL', label: `All Staff (${allStaff.length})` },
            { id: 'TEACHERS', label: `Teaching Faculty (${metrics.teachers})` },
            { id: 'ADMINS', label: `Administration & Support (${metrics.total - metrics.teachers})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setRoleFilter(tab.id as any);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition whitespace-nowrap ${
                roleFilter === tab.id
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by staff name, employee no, code, role..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
            />
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
            >
              <option value="ALL">All Departments ({departments.length})</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Job Title Filter */}
          <div>
            <select
              value={selectedJobTitle}
              onChange={(e) => {
                setSelectedJobTitle(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
            >
              <option value="ALL">All Job Titles</option>
              {jobTitles.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none capitalize"
            >
              <option value="ALL">All Statuses</option>
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="suspended">Suspended</option>
              <option value="resigned">Resigned</option>
              <option value="retired">Retired</option>
            </select>
          </div>
        </div>

        {/* Filter Badges & Reset */}
        {(searchQuery || selectedDept !== 'ALL' || selectedJobTitle !== 'ALL' || selectedStatus !== 'ALL' || selectedType !== 'ALL' || roleFilter !== 'ALL') && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">
              Showing <strong>{filteredStaff.length}</strong> of {allStaff.length} staff records
            </span>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset all filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3.5">Staff Details</th>
                <th className="px-4 py-3.5">Staff / Employee ID</th>
                <th className="px-4 py-3.5">Designation & Role</th>
                <th className="px-4 py-3.5">Department</th>
                <th className="px-4 py-3.5">Employment</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No staff members match the selected criteria</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your search terms or clearing active filters.</p>
                    <button
                      onClick={resetFilters}
                      className="mt-3 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition"
                    >
                      Clear Filters
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedStaff.map((stf) => {
                  const teacherFlag = isTeacher(stf);
                  const classTeacherOf = getClassTeacherRole(stf);

                  return (
                    <tr
                      key={stf.id}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                      onClick={() => setProfileStaffId(stf.id)}
                    >
                      {/* Name & Avatar */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          {stf.profile_photo_url ? (
                            <img
                              src={stf.profile_photo_url}
                              alt={stf.first_name}
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white font-bold flex items-center justify-center shrink-0 shadow-2xs text-xs">
                              {stf.first_name[0]}
                              {stf.last_name[0]}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>
                                {stf.first_name} {stf.middle_name ? `${stf.middle_name} ` : ''}{stf.last_name}
                              </span>
                              {teacherFlag && (
                                <span className="p-0.5 text-blue-600" title="Teaching Staff">
                                  <GraduationCap className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2">
                              <span>{stf.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Staff Code & Employee Number */}
                      <td className="px-4 py-3.5">
                        <div className="font-mono font-bold text-slate-800 text-xs">{stf.staff_code}</div>
                        {stf.employee_number && stf.employee_number !== stf.staff_code && (
                          <div className="font-mono text-[10px] text-slate-400">
                            Emp: {stf.employee_number}
                          </div>
                        )}
                      </td>

                      {/* Job Title & Class Teacher Assignment */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-800">{stf.job_title}</div>
                        {classTeacherOf ? (
                          <div className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 mt-0.5 font-medium">
                            <GraduationCap className="w-3 h-3" />
                            <span>Class Teacher: {classTeacherOf}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 capitalize">{stf.qualification || 'Staff'}</div>
                        )}
                      </td>

                      {/* Department */}
                      <td className="px-4 py-3.5">
                        <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700 font-medium text-[11px]">
                          {stf.department}
                        </span>
                      </td>

                      {/* Employment Type */}
                      <td className="px-4 py-3.5">
                        <span className="capitalize text-slate-600 font-medium">
                          {stf.employment_type ? stf.employment_type.replace(/_/g, ' ') : 'Full Time'}
                        </span>
                        <div className="text-[10px] text-slate-400">
                          Since {new Date(stf.date_employed).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <StatusBadge status={stf.employment_status} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setProfileStaffId(stf.id)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="View Full Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {(isSchoolAdmin || isSuperAdmin) && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setStaffToEdit(stf);
                                  setIsFormOpen(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                title="Edit Staff Record"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handleToggleStatusQuick(stf, e)}
                                className={`p-1.5 rounded-lg transition ${
                                  stf.employment_status === 'active'
                                    ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                    : 'text-emerald-600 hover:bg-emerald-50'
                                }`}
                                title={stf.employment_status === 'active' ? 'Set On Leave / Deactivate' : 'Activate Staff'}
                              >
                                <Power className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({filteredStaff.length} total staff)
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-semibold"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-semibold"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Staff Form Modal (Add / Edit) */}
      <StaffFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setStaffToEdit(null);
        }}
        onSuccess={reloadData}
        staffToEdit={staffToEdit}
      />

      {/* Staff Profile Modal */}
      <StaffProfileModal
        staffId={profileStaffId}
        isOpen={!!profileStaffId}
        onClose={() => {
          setProfileStaffId(null);
          onClearInitialStaff?.();
        }}
        onEditStaff={(stf) => {
          setStaffToEdit(stf);
          setIsFormOpen(true);
        }}
        onRefresh={reloadData}
      />
    </div>
  );
};
