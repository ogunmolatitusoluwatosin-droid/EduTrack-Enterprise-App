// System RBAC Definitions & Clean Empty Defaults for EduTrack School Management System
import {
  Role,
  User,
  Staff,
  Student,
  Guardian,
  StudentGuardian,
  AcademicSession,
  Term,
  SchoolClass,
  TeacherClassAssignment,
  Subject,
  ClassSubject,
  Attendance,
  Assessment,
  AssessmentScore,
  SchoolSettings,
  AuditLog,
} from '../types';

// System-level RBAC roles (structural permission definitions only, no pre-filled enterprise data)
export const INITIAL_ROLES: Role[] = [
  {
    id: 'role_super_admin',
    name: 'super_admin',
    label: 'Super Administrator',
    description: 'Unrestricted full access to all system modules, configurations, user accounts, and audit records.',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'role_school_admin',
    name: 'school_admin',
    label: 'School Administrator',
    description: 'Comprehensive academic and staff management, student admissions, class setups, and report generation.',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'role_teacher',
    name: 'teacher',
    label: 'Teacher',
    description: 'Access to assigned classes, student rosters, daily attendance marking, assessment creation, and grade entry.',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'role_staff',
    name: 'staff',
    label: 'School Staff',
    description: 'Specialized administrative and registrar capabilities with tailored school record lookups.',
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

// Clean empty collections for multi-enterprise readiness
export const INITIAL_SESSIONS: AcademicSession[] = [];
export const INITIAL_TERMS: Term[] = [];
export const INITIAL_SUBJECTS: Subject[] = [];
export const INITIAL_STAFF: Staff[] = [];
export const INITIAL_USERS: User[] = [];
export const INITIAL_CLASSES: SchoolClass[] = [];
export const INITIAL_TEACHER_ASSIGNMENTS: TeacherClassAssignment[] = [];
export const INITIAL_CLASS_SUBJECTS: ClassSubject[] = [];
export const INITIAL_GUARDIANS: Guardian[] = [];
export const INITIAL_STUDENT_GUARDIANS: StudentGuardian[] = [];
export const INITIAL_STUDENTS: Student[] = [];
export const INITIAL_ATTENDANCE: Attendance[] = [];
export const INITIAL_ASSESSMENTS: Assessment[] = [];
export const INITIAL_ASSESSMENT_SCORES: AssessmentScore[] = [];
export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

export const INITIAL_SETTINGS: SchoolSettings = {
  school_name: '',
  tagline: '',
  motto: '',
  email: '',
  phone: '',
  address: '',
  website: '',
  logo_url: '',
  currency_symbol: '$',
  current_session_id: '',
  current_term_id: '',
};

// Identifiers used solely to detect and purge legacy pre-filled demo data if present in an existing database
export const LEGACY_DEMO_SCHOOL_NAME = 'EduTrack Demonstration Academy';
export const LEGACY_DEMO_USER_IDS = [
  'usr_super_admin',
  'usr_school_admin',
  'usr_teacher',
  'usr_staff',
];
