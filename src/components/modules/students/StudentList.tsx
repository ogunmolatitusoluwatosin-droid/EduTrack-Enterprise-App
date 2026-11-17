import React, { useState, useMemo } from 'react';
import { db } from '../../../db/storage';
import { useAuth } from '../../../context/AuthContext';
import { Student } from '../../../types';
import { PageHeader } from '../../layout/PageHeader';
import { StatusBadge } from '../../common/Badge';
import { StudentFormModal } from './StudentFormModal';
import { StudentProfileModal } from './StudentProfileModal';
import {
  Search,
  Plus,
  Filter,
  Eye,
  Edit,
  GraduationCap,
  Download,
  Users,
  CheckCircle2,
} from 'lucide-react';

interface StudentListProps {
  initialSelectedStudentId?: string | null;
  onClearInitialStudent?: () => void;
}

export const StudentList: React.FC<StudentListProps> = ({
  initialSelectedStudentId,
  onClearInitialStudent,
}) => {
  const { isSchoolAdmin, isSuperAdmin, isTeacher, staff } = useAuth();
  
  const availableClasses = useMemo(() => {
    if (isTeacher && staff) {
      return db.getClassesForTeacher(staff.id);
    }
    return db.getClasses();
  }, [isTeacher, staff]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [selectedGender, setSelectedGender] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [profileStudentId, setProfileStudentId] = useState<string | null>(initialSelectedStudentId || null);

  const [refreshKey, setRefreshKey] = useState(0);
  const reloadData = () => setRefreshKey((prev) => prev + 1);

  // If teacher, optionally constrain to their assigned classes unless admin
  const teacherAssignedClassIds = useMemo(() => {
    if (isTeacher && staff) {
      return db.getClassesForTeacher(staff.id).map((c) => c.id);
    }
    return null;
  }, [isTeacher, staff]);

  const allStudents = useMemo(() => {
    let list = db.getStudents();
    if (teacherAssignedClassIds && !isSchoolAdmin && !isSuperAdmin) {
      list = list.filter((s) => teacherAssignedClassIds.includes(s.current_class_id));
    }
    return list;
  }, [refreshKey, teacherAssignedClassIds, isSchoolAdmin, isSuperAdmin]);

  const filteredStudents = useMemo(() => {
    return allStudents.filter((s) => {
      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullName = `${s.first_name} ${s.middle_name || ''} ${s.last_name}`.toLowerCase();
        const code = (s.student_code || '').toLowerCase();
        const adm = (s.admission_number || '').toLowerCase();
        if (!fullName.includes(q) && !code.includes(q) && !adm.includes(q)) {
          return false;
        }
      }

      // Class filter
      if (selectedClassId !== 'ALL' && s.current_class_id !== selectedClassId) {
        return false;
      }

      // Gender filter
      if (selectedGender !== 'ALL' && s.gender !== selectedGender) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'ALL' && s.student_status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [allStudents, searchQuery, selectedClassId, selectedGender, selectedStatus]);

  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage]);

  const handleExportCSV = () => {
    const headers = ['Student ID', 'Admission No', 'First Name', 'Last Name', 'Gender', 'Class', 'Status', 'Admission Date'];
    const rows = filteredStudents.map((s) => {
      const cls = db.getClassById(s.current_class_id);
      return [
        s.student_code,
        s.admission_number,
        s.first_name,
        s.last_name,
        s.gender,
        cls?.name || 'N/A',
        s.student_status,
        s.admission_date,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EduTrack_Students_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isTeacher ? 'My Class Students' : 'Student Management'}
        subtitle={`Total of ${filteredStudents.length} student records found.`}
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
                  setStudentToEdit(null);
                  setIsFormOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Student</span>
              </button>
            )}
          </div>
        }
      />

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search name, student ID, admission no..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
            />
          </div>

          {/* Class Filter */}
          <div>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
            >
              <option value="ALL">All Classes ({availableClasses.length})</option>
              {availableClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Gender Filter */}
          <div>
            <select
              value={selectedGender}
              onChange={(e) => {
                setSelectedGender(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
            >
              <option value="ALL">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
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
              <option value="graduated">Graduated</option>
              <option value="transferred">Transferred</option>
              <option value="suspended">Suspended</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>
        </div>

        {/* Active Filters & Results Summary */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <span>
              Showing <strong className="text-slate-800">{filteredStudents.length}</strong> of{' '}
              <strong className="text-slate-800">{allStudents.length}</strong> students
            </span>
          </div>

          {(searchQuery.trim() || selectedClassId !== 'ALL' || selectedGender !== 'ALL' || selectedStatus !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedClassId('ALL');
                setSelectedGender('ALL');
                setSelectedStatus('ALL');
                setCurrentPage(1);
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Student Info</th>
                <th className="px-4 py-3">Admission No</th>
                <th className="px-4 py-3">Student ID</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Gender</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <GraduationCap className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No student records matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((std) => {
                  const cls = db.getClassById(std.current_class_id);
                  return (
                    <tr
                      key={std.id}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                      onClick={() => setProfileStudentId(std.id)}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          {std.profile_photo_url ? (
                            <img
                              src={std.profile_photo_url}
                              alt={std.first_name}
                              referrerPolicy="no-referrer"
                              className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-xs">
                              {std.first_name[0]}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900">
                              {std.first_name} {std.middle_name} {std.last_name}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Adm Date: {new Date(std.admission_date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-700 font-medium">
                        {std.admission_number}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-500">
                        {std.student_code}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800">
                        {cls?.name || <span className="text-slate-400">Unassigned</span>}
                      </td>
                      <td className="px-4 py-3.5 capitalize text-slate-600">
                        {std.gender}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={std.student_status} />
                      </td>
                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setProfileStudentId(std.id)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="View Full Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {(isSchoolAdmin || isSuperAdmin) && (
                            <button
                              type="button"
                              onClick={() => {
                                setStudentToEdit(std);
                                setIsFormOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                              title="Edit Record"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
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
        <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-800">{paginatedStudents.length}</span> of{' '}
            <span className="font-semibold text-slate-800">{filteredStudents.length}</span> students
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
            >
              Previous
            </button>
            <span className="px-2 font-medium text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {profileStudentId && (
        <StudentProfileModal
          studentId={profileStudentId}
          isOpen={!!profileStudentId}
          onClose={() => {
            setProfileStudentId(null);
            onClearInitialStudent?.();
          }}
          onEditStudent={(std) => {
            setStudentToEdit(std);
            setIsFormOpen(true);
          }}
          onRefresh={reloadData}
        />
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <StudentFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          studentToEdit={studentToEdit}
          onSuccess={reloadData}
        />
      )}
    </div>
  );
};
