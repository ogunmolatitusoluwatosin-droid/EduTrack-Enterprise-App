import React, { useState, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { db } from '../../../db/storage';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Staff, Gender, EmploymentStatus, EmploymentType } from '../../../types';
import { PhotoUpload } from '../../common/PhotoUpload';
import {
  User,
  Briefcase,
  GraduationCap,
  Calendar,
  Building2,
  Phone,
  Mail,
  MapPin,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  BookOpen,
} from 'lucide-react';

interface StaffFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  staffToEdit?: Staff | null;
}

const DEPARTMENTS = [
  'Administration',
  'Management',
  'Science & Technology',
  'Humanities & Languages',
  'Primary Section',
  'Bursary & Accounts',
  'Registry & Admissions',
  'Information Technology',
  'Sports & Extracurricular',
];

export const StaffFormModal: React.FC<StaffFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  staffToEdit,
}) => {
  const { user, isSchoolAdmin, isSuperAdmin } = useAuth();
  const toast = useToast();
  const classes = db.getClasses();
  const subjects = db.getSubjects();
  const activeSession = db.getActiveSession();

  // Personal Information
  const [staffCode, setStaffCode] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<Gender>('female');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  // Employment Information
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('Administration');
  const [customDepartment, setCustomDepartment] = useState('');
  const [isCustomDept, setIsCustomDept] = useState(false);
  const [employmentType, setEmploymentType] = useState<EmploymentType>('full_time');
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>('active');
  const [dateEmployed, setDateEmployed] = useState(new Date().toISOString().split('T')[0]);
  const [qualification, setQualification] = useState('');
  const [assignedClassId, setAssignedClassId] = useState('');

  // Validation Error State
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (staffToEdit) {
      setStaffCode(staffToEdit.staff_code);
      setEmployeeNumber(staffToEdit.employee_number || staffToEdit.staff_code);
      setFirstName(staffToEdit.first_name);
      setMiddleName(staffToEdit.middle_name || '');
      setLastName(staffToEdit.last_name);
      setGender(staffToEdit.gender);
      setDob(staffToEdit.date_of_birth || '');
      setPhone(staffToEdit.phone || '');
      setEmail(staffToEdit.email);
      setAddress(staffToEdit.address || '');
      setPhotoUrl(staffToEdit.profile_photo_url || '');
      setJobTitle(staffToEdit.job_title);

      if (DEPARTMENTS.includes(staffToEdit.department)) {
        setDepartment(staffToEdit.department);
        setIsCustomDept(false);
      } else {
        setDepartment('Other');
        setCustomDepartment(staffToEdit.department);
        setIsCustomDept(true);
      }

      setEmploymentType(staffToEdit.employment_type);
      setEmploymentStatus(staffToEdit.employment_status);
      setDateEmployed(staffToEdit.date_employed);
      setQualification(staffToEdit.qualification || '');
      setAssignedClassId(staffToEdit.assigned_class_id || '');
      setErrors({});
    } else {
      setStaffCode('');
      setEmployeeNumber('');
      setFirstName('');
      setMiddleName('');
      setLastName('');
      setGender('female');
      setDob('');
      setPhone('');
      setEmail('');
      setAddress('');
      setPhotoUrl('');
      setJobTitle('');
      setDepartment('Administration');
      setCustomDepartment('');
      setIsCustomDept(false);
      setEmploymentType('full_time');
      setEmploymentStatus('active');
      setDateEmployed(new Date().toISOString().split('T')[0]);
      setQualification('');
      setAssignedClassId('');
      setErrors({});
    }
  }, [staffToEdit, isOpen]);

  if (!isSchoolAdmin && !isSuperAdmin) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Access Restricted" maxWidth="md">
        <div className="p-4 text-center text-xs text-rose-600 space-y-2">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
          <p className="font-bold">Unauthorized Action</p>
          <p className="text-slate-600">Only authorized school administrators can add or edit staff members.</p>
        </div>
      </Modal>
    );
  }

  const validate = () => {
    const errs: { [key: string]: string } = {};

    if (!staffCode.trim()) {
      errs.staffCode = 'Staff ID / Code is required.';
    } else if (db.isStaffCodeTaken(staffCode.trim(), staffToEdit?.id)) {
      errs.staffCode = 'This Staff ID is already assigned to another staff member.';
    }

    if (employeeNumber.trim() && db.isEmployeeNumberTaken(employeeNumber.trim(), staffToEdit?.id)) {
      errs.employeeNumber = 'This Employee Number is already assigned.';
    }

    if (!firstName.trim()) errs.firstName = 'First name is required.';
    if (!lastName.trim()) errs.lastName = 'Last name is required.';

    if (!email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address.';
    } else if (db.isStaffEmailTaken(email.trim(), staffToEdit?.id)) {
      errs.email = 'This email address is already in use by another staff record.';
    }

    if (!jobTitle.trim()) errs.jobTitle = 'Job title / Designation is required.';
    if (!dateEmployed) errs.dateEmployed = 'Date of employment is required.';

    const effectiveDept = isCustomDept ? customDepartment.trim() : department.trim();
    if (!effectiveDept) {
      errs.department = 'Department is required.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Validation Error', 'Please correct the highlighted fields.');
      return;
    }

    const effectiveDept = isCustomDept ? customDepartment.trim() : department.trim();

    try {
      const actor = user ? { id: user.id, name: user.full_name } : undefined;

      const staffPayload = {
        staff_code: staffCode.trim(),
        employee_number: employeeNumber.trim() || staffCode.trim(),
        first_name: firstName.trim(),
        middle_name: middleName.trim() || undefined,
        last_name: lastName.trim(),
        gender,
        date_of_birth: dob,
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        address: address.trim(),
        profile_photo_url: photoUrl.trim() || undefined,
        job_title: jobTitle.trim(),
        department: effectiveDept,
        employment_type: employmentType,
        employment_status: employmentStatus,
        date_employed: dateEmployed,
        qualification: qualification.trim(),
        assigned_class_id: assignedClassId || undefined,
      };

      if (staffToEdit) {
        db.updateStaff(staffToEdit.id, staffPayload, actor);

        // If assigned class changed and active session exists, update class teacher assignment
        if (assignedClassId && activeSession) {
          db.assignTeacherToClass(staffToEdit.id, assignedClassId, activeSession.id, true, actor);
        }

        toast.success('Staff Record Updated', `${firstName} ${lastName}'s profile has been updated.`);
      } else {
        const newStaff = db.createStaff(staffPayload, actor);

        if (assignedClassId && activeSession) {
          db.assignTeacherToClass(newStaff.id, assignedClassId, activeSession.id, true, actor);
        }

        toast.success('Staff Added Successfully', `${firstName} ${lastName} has been added to the school roster.`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Operation Failed', err.message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={staffToEdit ? 'Edit Staff Profile' : 'Register New Staff Member'}
      subtitle="Complete personal, academic, and employment credentials for staff roster"
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Identification & Personal Information */}
        <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-4">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
            <User className="w-4 h-4 text-blue-600" />
            <span>Personal & Contact Information</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className={`w-full px-3 py-2 text-xs sm:text-sm bg-white border ${
                  errors.firstName ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-blue-500'
                } rounded-xl outline-none transition`}
              />
              {errors.firstName && <p className="text-[11px] text-rose-600 mt-0.5">{errors.firstName}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Middle Name</label>
              <input
                type="text"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                placeholder="Middle name (optional)"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:border-blue-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className={`w-full px-3 py-2 text-xs sm:text-sm bg-white border ${
                  errors.lastName ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-blue-500'
                } rounded-xl outline-none transition`}
              />
              {errors.lastName && <p className="text-[11px] text-rose-600 mt-0.5">{errors.lastName}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Staff ID *</label>
              <input
                type="text"
                required
                value={staffCode}
                onChange={(e) => setStaffCode(e.target.value)}
                placeholder="Enter Staff ID"
                className={`w-full px-3 py-2 text-xs sm:text-sm bg-white border ${
                  errors.staffCode ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-blue-500'
                } rounded-xl outline-none font-mono font-bold transition`}
              />
              {errors.staffCode && <p className="text-[10px] text-rose-600 mt-0.5">{errors.staffCode}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Employee Number</label>
              <input
                type="text"
                value={employeeNumber}
                onChange={(e) => setEmployeeNumber(e.target.value)}
                placeholder="Optional employee no."
                className={`w-full px-3 py-2 text-xs sm:text-sm bg-white border ${
                  errors.employeeNumber ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-blue-500'
                } rounded-xl outline-none font-mono transition`}
              />
              {errors.employeeNumber && <p className="text-[10px] text-rose-600 mt-0.5">{errors.employeeNumber}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Gender *</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:border-blue-500 outline-none capitalize"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@institution.edu"
                  className={`w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border ${
                    errors.email ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-blue-500'
                  } rounded-xl outline-none transition`}
                />
              </div>
              {errors.email && <p className="text-[11px] text-rose-600 mt-0.5">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contact phone number"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:border-blue-500 outline-none transition"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address</label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address, city, region"
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:border-blue-500 outline-none transition"
              />
            </div>
          </div>

          {/* Profile Photo Selection */}
          <div>
            <PhotoUpload
              value={photoUrl}
              onChange={setPhotoUrl}
              folder="staff"
              label="Profile Photograph"
            />
          </div>
        </div>

        {/* Section 2: Employment & Academic Assignment */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-4 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
            <Briefcase className="w-4 h-4 text-emerald-600" />
            <span>Job Title, Department & Employment Details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Job Title / Role *</label>
              <input
                type="text"
                required
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Mathematics Teacher"
                className={`w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border ${
                  errors.jobTitle ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-blue-500'
                } rounded-xl focus:bg-white outline-none transition`}
              />
              {errors.jobTitle && <p className="text-[11px] text-rose-600 mt-0.5">{errors.jobTitle}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department *</label>
              {!isCustomDept ? (
                <div className="flex gap-2">
                  <select
                    value={department}
                    onChange={(e) => {
                      if (e.target.value === 'Other') {
                        setIsCustomDept(true);
                      } else {
                        setDepartment(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                    <option value="Other">+ Custom Department...</option>
                  </select>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={customDepartment}
                    onChange={(e) => setCustomDepartment(e.target.value)}
                    placeholder="Enter custom department name"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomDept(false);
                      setDepartment(DEPARTMENTS[0]);
                    }}
                    className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 bg-slate-100 rounded-xl border border-slate-200 shrink-0"
                  >
                    Select Existing
                  </button>
                </div>
              )}
              {errors.department && <p className="text-[11px] text-rose-600 mt-0.5">{errors.department}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Employment Type *</label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none capitalize"
              >
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Employment Status *</label>
              <select
                value={employmentStatus}
                onChange={(e) => setEmploymentStatus(e.target.value as EmploymentStatus)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none capitalize font-medium"
              >
                <option value="active">Active</option>
                <option value="on_leave">On Leave</option>
                <option value="suspended">Suspended</option>
                <option value="resigned">Resigned</option>
                <option value="retired">Retired</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date Employed *</label>
              <input
                type="date"
                required
                value={dateEmployed}
                onChange={(e) => setDateEmployed(e.target.value)}
                className={`w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border ${
                  errors.dateEmployed ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:border-blue-500'
                } rounded-xl focus:bg-white outline-none`}
              />
              {errors.dateEmployed && <p className="text-[11px] text-rose-600 mt-0.5">{errors.dateEmployed}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Highest Qualification</label>
              <input
                type="text"
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                placeholder="e.g. M.Ed. Educational Mgt., B.Sc. Math"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Class Teacher Assignment (Optional)
              </label>
              <select
                value={assignedClassId}
                onChange={(e) => setAssignedClassId(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
              >
                <option value="">None / Subject Teacher / Administrative</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.level})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Assigns this teacher as the primary class tutor for attendance & reports.
              </p>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
          >
            {staffToEdit ? 'Save Staff Updates' : 'Register Staff Member'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
