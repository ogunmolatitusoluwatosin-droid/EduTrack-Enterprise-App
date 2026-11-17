// EduTrack School Management System - Core Database & Domain Types

export type UserRole = 'super_admin' | 'school_admin' | 'teacher' | 'staff';

export type EmploymentStatus = 'active' | 'on_leave' | 'suspended' | 'resigned' | 'retired';
export type EmploymentType = 'full_time' | 'part_time' | 'contract';
export type StudentStatus = 'active' | 'graduated' | 'transferred' | 'suspended' | 'withdrawn';
export type Gender = 'male' | 'female' | 'other';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type AssessmentType = 'assignment' | 'quiz' | 'test' | 'project' | 'examination';

// 12.1 users
export interface User {
  id: string;
  email: string;
  full_name: string;
  password?: string;
  role_id?: string; // foreign key to roles.id
  role?: UserRole;
  staff_id?: string; // optional foreign key to staff.id
  avatar_url?: string;
  is_active: boolean;
  last_login?: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

// 12.2 roles
export interface Role {
  id: string;
  name: UserRole;
  label: string;
  description: string;
  created_at: string;
}

// 12.3 staff
export interface Staff {
  id: string;
  staff_code: string;
  employee_number?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender: Gender;
  date_of_birth: string;
  phone: string;
  email: string;
  address: string;
  job_title: string;
  department: string;
  employment_type: EmploymentType;
  employment_status: EmploymentStatus;
  date_employed: string;
  qualification: string;
  profile_photo_url?: string;
  assigned_class_id?: string; // helper or primary class
  created_at: string;
  updated_at: string;
}

// 12.4 students
export interface Student {
  id: string;
  student_code: string;
  admission_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender: Gender;
  date_of_birth: string;
  nationality: string;
  state_or_region: string;
  address: string;
  admission_date: string;
  current_class_id: string; // foreign key to classes.id
  academic_session_id?: string;
  student_status: StudentStatus;
  profile_photo_url?: string;
  created_at: string;
  updated_at: string;
}

// 12.5 guardians
export interface Guardian {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  address: string;
  occupation?: string;
  created_at: string;
  updated_at: string;
}

// 12.6 student_guardians (pivot table)
export interface StudentGuardian {
  id: string;
  student_id: string;
  guardian_id: string;
  relationship: 'father' | 'mother' | 'guardian' | 'uncle' | 'aunt' | 'other';
  is_primary_contact: boolean;
}

// 12.7 academic_sessions
export interface AcademicSession {
  id: string;
  name: string; // e.g. "2026/2027"
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_current?: boolean;
  created_at: string;
}

// 12.8 terms
export interface Term {
  id: string;
  academic_session_id: string;
  name: 'First Term' | 'Second Term' | 'Third Term' | string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_current?: boolean;
}

// 12.9 classes
export interface SchoolClass {
  id: string;
  name: string; // e.g. "Primary 1A", "SS 2 Science"
  level: string; // e.g. "Primary 1", "JSS 1", "SS 2"
  section: string; // e.g. "A", "B", "Science", "Arts"
  academic_session_id?: string;
  class_teacher_id?: string; // staff_id of teacher
  capacity?: number;
  created_at: string;
  updated_at: string;
}

export type ClassEntity = SchoolClass;
export type Class = SchoolClass;

// 12.10 teacher_class_assignments
export interface TeacherClassAssignment {
  id: string;
  teacher_id: string; // staff_id
  class_id: string;
  academic_session_id?: string;
  subject_id?: string;
  is_primary_teacher?: boolean;
  created_at: string;
}

// 12.11 subjects
export interface Subject {
  id: string;
  name: string;
  code: string; // e.g. "MTH", "ENG", "SCI"
  description?: string;
  created_at: string;
}

// 12.12 class_subjects
export interface ClassSubject {
  id: string;
  class_id: string;
  subject_id: string;
  name?: string;
  code?: string;
  teacher_id?: string; // staff_id
  academic_session_id?: string;
}

// 12.13 attendance
export interface Attendance {
  id: string;
  student_id: string;
  class_id: string;
  attendance_date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  marked_by?: string; // user_id or staff_id
  recorded_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type AttendanceRecord = Attendance;

// 12.14 assessments
export interface Assessment {
  id: string;
  title: string;
  assessment_type: AssessmentType;
  class_id: string;
  subject_id: string;
  academic_session_id?: string;
  term_id?: string;
  maximum_score: number;
  weight_percentage?: number;
  assessment_date: string;
  created_by: string; // user_id or staff_id
  created_at: string;
  updated_at: string;
}

// 12.15 assessment_scores
export interface AssessmentScore {
  id: string;
  assessment_id: string;
  student_id: string;
  score: number;
  feedback?: string;
  recorded_by: string;
  created_at: string;
  updated_at: string;
}

// System Audit Log
export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  module: string;
  details: string;
  timestamp: string;
}

// School Settings
export interface SchoolSettings {
  school_name: string;
  tagline: string;
  motto: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  logo_url: string;
  currency_symbol: string;
  current_session_id: string;
  current_term_id: string;
}
