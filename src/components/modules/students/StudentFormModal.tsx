import React, { useState, useEffect } from 'react';
import { Modal } from '../../common/Modal';
import { db } from '../../../db/storage';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Student, Guardian, Gender, StudentStatus } from '../../../types';
import { PhotoUpload } from '../../common/PhotoUpload';
import { AlertCircle } from 'lucide-react';

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  studentToEdit?: Student | null;
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  studentToEdit,
}) => {
  const { user, isSchoolAdmin, isSuperAdmin } = useAuth();
  const toast = useToast();
  const classes = db.getClasses();
  const sessions = db.getSessions();
  const activeSession = db.getActiveSession();

  // Personal Info State
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [dob, setDob] = useState('');
  const [nationality, setNationality] = useState('');
  const [stateOrRegion, setStateOrRegion] = useState('');
  const [address, setAddress] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  // School Info State
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().split('T')[0]);
  const [classId, setClassId] = useState(classes[0]?.id || '');
  const [sessionId, setSessionId] = useState(activeSession?.id || sessions[0]?.id || '');
  const [status, setStatus] = useState<StudentStatus>('active');

  // Guardian Info State (for creation)
  const [guardianFirstName, setGuardianFirstName] = useState('');
  const [guardianLastName, setGuardianLastName] = useState('');
  const [guardianRelationship, setGuardianRelationship] = useState<'father' | 'mother' | 'guardian' | 'uncle' | 'aunt' | 'other'>('father');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [guardianAddress, setGuardianAddress] = useState('');

  // Error validation states
  const [admissionError, setAdmissionError] = useState('');

  useEffect(() => {
    if (studentToEdit) {
      setFirstName(studentToEdit.first_name || '');
      setMiddleName(studentToEdit.middle_name || '');
      setLastName(studentToEdit.last_name || '');
      setGender(studentToEdit.gender || 'male');
      setDob(studentToEdit.date_of_birth || '');
      setNationality(studentToEdit.nationality || '');
      setStateOrRegion(studentToEdit.state_or_region || '');
      setAddress(studentToEdit.address || '');
      setPhotoUrl(studentToEdit.profile_photo_url || '');
      setAdmissionNumber(studentToEdit.admission_number || '');
      setStudentCode(studentToEdit.student_code || '');
      setAdmissionDate(studentToEdit.admission_date || new Date().toISOString().split('T')[0]);
      setClassId(studentToEdit.current_class_id || classes[0]?.id || '');
      setSessionId(studentToEdit.academic_session_id || activeSession?.id || sessions[0]?.id || '');
      setStatus(studentToEdit.student_status || 'active');
      setAdmissionError('');
    } else {
      setFirstName('');
      setMiddleName('');
      setLastName('');
      setGender('male');
      setDob('');
      setNationality('');
      setStateOrRegion('');
      setAddress('');
      setPhotoUrl('');
      setAdmissionNumber('');
      setStudentCode('');
      setAdmissionDate(new Date().toISOString().split('T')[0]);
      setClassId(classes[0]?.id || '');
      setSessionId(activeSession?.id || sessions[0]?.id || '');
      setStatus('active');
      setAdmissionError('');

      setGuardianFirstName('');
      setGuardianLastName('');
      setGuardianRelationship('father');
      setGuardianPhone('');
      setGuardianEmail('');
      setGuardianAddress('');
    }
  }, [studentToEdit, isOpen, classes.length, sessions.length]);

  const handleAdmissionChange = (val: string) => {
    setAdmissionNumber(val);
    if (val.trim() && db.isAdmissionNumberTaken(val.trim(), studentToEdit?.id)) {
      setAdmissionError(`Admission number "${val.trim()}" is already assigned.`);
    } else {
      setAdmissionError('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSchoolAdmin && !isSuperAdmin) {
      toast.error('Permission Denied', 'Only authorized administrators can register or edit student records.');
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Validation Error', 'First name and Last name are required.');
      return;
    }
    if (!admissionNumber.trim()) {
      toast.error('Validation Error', 'Admission number is required.');
      return;
    }
    if (db.isAdmissionNumberTaken(admissionNumber.trim(), studentToEdit?.id)) {
      toast.error('Duplicate Admission Number', `The admission number "${admissionNumber.trim()}" is already in use by another student.`);
      setAdmissionError(`Admission number "${admissionNumber.trim()}" is already assigned.`);
      return;
    }
    if (studentCode.trim() && db.isStudentCodeTaken(studentCode.trim(), studentToEdit?.id)) {
      toast.error('Duplicate Student ID', `The student ID "${studentCode.trim()}" is already in use.`);
      return;
    }
    if (!classId) {
      toast.error('Validation Error', 'Please assign an active school class.');
      return;
    }

    try {
      const actor = user ? { id: user.id, name: user.full_name } : undefined;

      if (studentToEdit) {
        db.updateStudent(
          studentToEdit.id,
          {
            first_name: firstName.trim(),
            middle_name: middleName.trim() || undefined,
            last_name: lastName.trim(),
            gender,
            date_of_birth: dob,
            nationality: nationality.trim(),
            state_or_region: stateOrRegion.trim(),
            address: address.trim(),
            profile_photo_url: photoUrl.trim() || undefined,
            admission_number: admissionNumber.trim(),
            student_code: studentCode.trim() || admissionNumber.trim(),
            admission_date: admissionDate,
            current_class_id: classId,
            academic_session_id: sessionId || undefined,
            student_status: status,
          },
          actor
        );
        toast.success('Student Updated', `${firstName} ${lastName}'s profile has been updated.`);
      } else {
        const guardianPayload =
          guardianFirstName.trim() || guardianPhone.trim()
            ? {
                first_name: guardianFirstName.trim() || 'Parent',
                last_name: guardianLastName.trim() || lastName.trim(),
                phone: guardianPhone.trim(),
                email: guardianEmail.trim(),
                address: guardianAddress.trim() || address.trim(),
              }
            : undefined;

        db.createStudent(
          {
            first_name: firstName.trim(),
            middle_name: middleName.trim() || undefined,
            last_name: lastName.trim(),
            gender,
            date_of_birth: dob,
            nationality: nationality.trim(),
            state_or_region: stateOrRegion.trim(),
            address: address.trim(),
            profile_photo_url: photoUrl.trim() || undefined,
            admission_number: admissionNumber.trim(),
            student_code: studentCode.trim() || admissionNumber.trim(),
            admission_date: admissionDate,
            current_class_id: classId,
            academic_session_id: sessionId || undefined,
            student_status: status,
          },
          guardianPayload,
          guardianRelationship,
          actor
        );
        toast.success(
          'Student Enrolled',
          `${firstName} ${lastName} has been successfully admitted to ${classes.find((c) => c.id === classId)?.name || 'the class'}.`
        );
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Operation Failed', err.message || 'Could not save student.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={studentToEdit ? 'Edit Student Record' : 'Register New Student'}
      subtitle={
        studentToEdit
          ? `Updating profile for ${studentToEdit.admission_number}`
          : 'Enroll a new student with personal, academic and primary guardian details'
      }
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Personal Information */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg mb-3">
            1. Personal Information
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Middle Name</label>
              <input
                type="text"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                placeholder="Middle name (optional)"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
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
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Gender *</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth *</label>
              <input
                type="date"
                required
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nationality</label>
              <input
                type="text"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                placeholder="Nationality"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State / Region</label>
              <input
                type="text"
                value={stateOrRegion}
                onChange={(e) => setStateOrRegion(e.target.value)}
                placeholder="State or province"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>
          <div className="mt-3">
            <PhotoUpload
              value={photoUrl}
              onChange={setPhotoUrl}
              folder="students"
              label="Student Profile Photograph"
            />
          </div>
          </div>

          <div className="mt-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street address, city"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Section 2: School & Academic Information */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg mb-3">
            2. School & Academic Information
          </h4>
          {classes.length === 0 && (
            <div className="mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>No classes have been created yet. Create at least one class in Class Management before enrolling students.</span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Admission Number *</label>
              <input
                type="text"
                required
                value={admissionNumber}
                onChange={(e) => handleAdmissionChange(e.target.value)}
                placeholder="Enter admission number"
                className={`w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border rounded-xl focus:bg-white outline-none ${
                  admissionError ? 'border-rose-500 bg-rose-50/30' : 'border-slate-200 focus:border-blue-500'
                }`}
              />
              {admissionError && (
                <div className="flex items-center gap-1 mt-1 text-[11px] text-rose-600">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{admissionError}</span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Student ID / Code</label>
              <input
                type="text"
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
                placeholder="Optional student ID"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Admission Date</label>
              <input
                type="date"
                value={admissionDate}
                onChange={(e) => setAdmissionDate(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Current Assigned Class *</label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
              >
                {classes.length === 0 ? (
                  <option value="">No classes available</option>
                ) : (
                  classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.level})
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Session</label>
              <select
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
              >
                {sessions.length === 0 ? (
                  <option value="">No academic session configured</option>
                ) : (
                  sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.is_active ? '(Active)' : ''}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Enrollment Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StudentStatus)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none capitalize"
              >
                <option value="active">Active</option>
                <option value="graduated">Graduated</option>
                <option value="transferred">Transferred</option>
                <option value="suspended">Suspended</option>
                <option value="withdrawn">Withdrawn (Archived)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Guardian Information (Only on new student registration) */}
        {!studentToEdit && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg mb-3">
              3. Primary Parent / Guardian Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Guardian First Name</label>
                <input
                  type="text"
                  value={guardianFirstName}
                  onChange={(e) => setGuardianFirstName(e.target.value)}
                  placeholder="First name"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Guardian Last Name</label>
                <input
                  type="text"
                  value={guardianLastName}
                  onChange={(e) => setGuardianLastName(e.target.value)}
                  placeholder="Last name"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Relationship</label>
                <select
                  value={guardianRelationship}
                  onChange={(e) => setGuardianRelationship(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none capitalize"
                >
                  <option value="father">Father</option>
                  <option value="mother">Mother</option>
                  <option value="guardian">Legal Guardian</option>
                  <option value="uncle">Uncle</option>
                  <option value="aunt">Aunt</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                  placeholder="Contact phone number"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={guardianEmail}
                  onChange={(e) => setGuardianEmail(e.target.value)}
                  placeholder="guardian@example.com"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Guardian Residential Address</label>
              <input
                type="text"
                value={guardianAddress}
                onChange={(e) => setGuardianAddress(e.target.value)}
                placeholder="Street address, city"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
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
            disabled={!!admissionError}
            className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition"
          >
            {studentToEdit ? 'Save Changes' : 'Enroll Student'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

