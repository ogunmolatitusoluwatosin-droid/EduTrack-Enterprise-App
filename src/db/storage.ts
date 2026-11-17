// Relational Database Repository Engine with Cloud Firestore Sync for EduTrack School Management System
import {
  User,
  Role,
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
  StudentStatus,
  AttendanceStatus,
  EmploymentStatus,
} from '../types';
import {
  INITIAL_ROLES,
  INITIAL_USERS,
  INITIAL_STAFF,
  INITIAL_STUDENTS,
  INITIAL_GUARDIANS,
  INITIAL_STUDENT_GUARDIANS,
  INITIAL_SESSIONS,
  INITIAL_TERMS,
  INITIAL_CLASSES,
  INITIAL_TEACHER_ASSIGNMENTS,
  INITIAL_SUBJECTS,
  INITIAL_CLASS_SUBJECTS,
  INITIAL_ATTENDANCE,
  INITIAL_ASSESSMENTS,
  INITIAL_ASSESSMENT_SCORES,
  INITIAL_SETTINGS,
  INITIAL_AUDIT_LOGS,
  LEGACY_DEMO_SCHOOL_NAME,
  LEGACY_DEMO_USER_IDS,
} from './initialData';
import { firebaseService } from './firebaseService';

const STORAGE_KEY = 'edutrack_relational_database_v2';
const LEGACY_STORAGE_KEY = 'edutrack_relational_database_v1';

export type StorageMode = 'firebase' | 'local';

export interface DatabaseStore {
  roles: Role[];
  users: User[];
  staff: Staff[];
  students: Student[];
  guardians: Guardian[];
  student_guardians: StudentGuardian[];
  academic_sessions: AcademicSession[];
  terms: Term[];
  classes: SchoolClass[];
  teacher_class_assignments: TeacherClassAssignment[];
  subjects: Subject[];
  class_subjects: ClassSubject[];
  attendance: Attendance[];
  assessments: Assessment[];
  assessment_scores: AssessmentScore[];
  settings: SchoolSettings;
  audit_logs: AuditLog[];
}

export function generateUUID(): string {
  return 'id_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
}

class DatabaseRepository {
  private store: DatabaseStore;
  private mode: StorageMode = 'firebase'; // Default to Firebase mode
  private isFirebaseConnected = false;
  private syncListeners: Array<() => void> = [];
  private readyPromise: Promise<void>;
  private unsubscribes: Array<() => void> = [];

  constructor() {
    this.store = this.loadStore();
    this.readyPromise = this.initializeFirebaseSync();
  }

  public async waitForReady(): Promise<void> {
    return this.readyPromise;
  }

  public getStorageMode(): StorageMode {
    return this.mode;
  }

  public setStorageMode(newMode: StorageMode) {
    this.mode = newMode;
  }

  public isConnectedToFirebase(): boolean {
    return this.isFirebaseConnected;
  }

  private async initializeFirebaseSync(): Promise<void> {
    try {
      const { purgedLegacyDemo } = await firebaseService.initializeCleanDatabase();
      this.isFirebaseConnected = true;

      if (purgedLegacyDemo) {
        this.store = this.getInitialStore();
        localStorage.removeItem('edutrack_session_user_id');
        this.saveStore();
      } else {
        // Hydrate initial repository state directly from Firestore so startup state is accurate
        const [
          roles,
          users,
          settings,
          staff,
          students,
          guardians,
          studentGuardians,
          sessions,
          terms,
          classes,
          teacherAssignments,
          subjects,
          classSubjects,
          attendance,
          assessments,
          scores,
          auditLogs,
        ] = await Promise.all([
          firebaseService.getRoles(),
          firebaseService.getUsers(),
          firebaseService.getSettings(),
          firebaseService.getStaff(),
          firebaseService.getStudents(),
          firebaseService.getGuardians(),
          firebaseService.getStudentGuardians(),
          firebaseService.getAcademicSessions(),
          firebaseService.getTerms(),
          firebaseService.getClasses(),
          firebaseService.getTeacherClassAssignments(),
          firebaseService.getSubjects(),
          firebaseService.getClassSubjects(),
          firebaseService.getAllAttendance(),
          firebaseService.getAssessments(),
          firebaseService.getScores(),
          firebaseService.getAuditLogs(),
        ]);

        this.store.roles = roles.length > 0 ? roles : [...INITIAL_ROLES];
        this.store.users = users;
        this.store.settings = settings;
        this.store.staff = staff;
        this.store.students = students;
        this.store.guardians = guardians;
        this.store.student_guardians = studentGuardians;
        this.store.academic_sessions = sessions;
        this.store.terms = terms;
        this.store.classes = classes;
        this.store.teacher_class_assignments = teacherAssignments;
        this.store.subjects = subjects;
        this.store.class_subjects = classSubjects;
        this.store.attendance = attendance;
        this.store.assessments = assessments;
        this.store.assessment_scores = scores;
        this.store.audit_logs = auditLogs;
        this.saveStore();
      }

      // Subscribe to real-time updates from Firestore to keep memory & UI in sync
      this.setupFirestoreListeners();
      this.notifyListeners();
    } catch (err) {
      console.warn('Firebase initialization error, working with local fallback store:', err);
    }
  }

  private setupFirestoreListeners() {
    this.unsubscribes.forEach((unsub) => unsub());
    this.unsubscribes = [
      firebaseService.subscribeToCollection<Role>('roles', (data) => {
        this.store.roles = data.length > 0 ? data : [...INITIAL_ROLES];
        this.saveStore();
        this.notifyListeners();
      }),
      firebaseService.subscribeToCollection<User>('users', (data) => {
        this.store.users = data;
        this.saveStore();
        this.notifyListeners();
      }),
      firebaseService.subscribeToDocument<SchoolSettings>('settings', 'global', (data) => {
        this.store.settings = data ? { ...INITIAL_SETTINGS, ...data } : { ...INITIAL_SETTINGS };
        this.saveStore();
        this.notifyListeners();
      }),
      firebaseService.subscribeToCollection<Student>('students', (data) => {
        this.store.students = data;
        this.saveStore();
        this.notifyListeners();
      }),
      firebaseService.subscribeToCollection<Staff>('staff', (data) => {
        this.store.staff = data;
        this.saveStore();
        this.notifyListeners();
      }),
      firebaseService.subscribeToCollection<SchoolClass>('classes', (data) => {
        this.store.classes = data;
        this.saveStore();
        this.notifyListeners();
      }),
      firebaseService.subscribeToCollection<Subject>('subjects', (data) => {
        this.store.subjects = data;
        this.saveStore();
        this.notifyListeners();
      }),
      firebaseService.subscribeToCollection<Attendance>('attendance', (data) => {
        this.store.attendance = data;
        this.saveStore();
        this.notifyListeners();
      }),
      firebaseService.subscribeToCollection<Assessment>('assessments', (data) => {
        this.store.assessments = data;
        this.saveStore();
        this.notifyListeners();
      }),
      firebaseService.subscribeToCollection<AssessmentScore>('assessment_scores', (data) => {
        this.store.assessment_scores = data;
        this.saveStore();
        this.notifyListeners();
      }),
      firebaseService.subscribeToCollection<AcademicSession>('academic_sessions', (data) => {
        this.store.academic_sessions = data;
        this.saveStore();
        this.notifyListeners();
      }),
      firebaseService.subscribeToCollection<Term>('terms', (data) => {
        this.store.terms = data;
        this.saveStore();
        this.notifyListeners();
      }),
      firebaseService.subscribeToCollection<TeacherClassAssignment>('teacher_class_assignments', (data) => {
        this.store.teacher_class_assignments = data;
        this.saveStore();
        this.notifyListeners();
      }),
      firebaseService.subscribeToCollection<ClassSubject>('class_subjects', (data) => {
        this.store.class_subjects = data;
        this.saveStore();
        this.notifyListeners();
      }),
      firebaseService.subscribeToCollection<Guardian>('guardians', (data) => {
        this.store.guardians = data;
        this.saveStore();
        this.notifyListeners();
      }),
      firebaseService.subscribeToCollection<StudentGuardian>('student_guardians', (data) => {
        this.store.student_guardians = data;
        this.saveStore();
        this.notifyListeners();
      }),
      firebaseService.subscribeToCollection<AuditLog>('audit_logs', (data) => {
        this.store.audit_logs = data;
        this.saveStore();
        this.notifyListeners();
      }),
    ];

    window.addEventListener('beforeunload', () => {
      this.unsubscribes.forEach((unsub) => unsub());
    });
  }

  public onSync(callback: () => void): () => void {
    this.syncListeners.push(callback);
    return () => {
      this.syncListeners = this.syncListeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners() {
    this.syncListeners.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.error('Error notifying sync listener:', e);
      }
    });
  }

  private loadStore(): DatabaseStore {
    try {
      // Remove legacy v1 localStorage cache that held pre-filled demo data
      if (localStorage.getItem(LEGACY_STORAGE_KEY)) {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.students) && Array.isArray(parsed.classes) && Array.isArray(parsed.users)) {
          const isLegacySchool = parsed.settings?.school_name === LEGACY_DEMO_SCHOOL_NAME;
          const onlyLegacyUsers =
            parsed.users.length > 0 &&
            parsed.users.every((u: User) => LEGACY_DEMO_USER_IDS.includes(u.id)) &&
            !parsed.settings?.school_name;

          if (isLegacySchool || onlyLegacyUsers) {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem('edutrack_session_user_id');
            return this.getInitialStore();
          }

          return {
            ...this.getInitialStore(),
            ...parsed,
            roles: parsed.roles && parsed.roles.length > 0 ? parsed.roles : [...INITIAL_ROLES],
          };
        }
      }
    } catch {
      console.warn('Could not read from localStorage, using clean initial dataset.');
    }
    return this.getInitialStore();
  }

  private getInitialStore(): DatabaseStore {
    return {
      roles: [...INITIAL_ROLES],
      users: [...INITIAL_USERS],
      staff: [...INITIAL_STAFF],
      students: [...INITIAL_STUDENTS],
      guardians: [...INITIAL_GUARDIANS],
      student_guardians: [...INITIAL_STUDENT_GUARDIANS],
      academic_sessions: [...INITIAL_SESSIONS],
      terms: [...INITIAL_TERMS],
      classes: [...INITIAL_CLASSES],
      teacher_class_assignments: [...INITIAL_TEACHER_ASSIGNMENTS],
      subjects: [...INITIAL_SUBJECTS],
      class_subjects: [...INITIAL_CLASS_SUBJECTS],
      attendance: [...INITIAL_ATTENDANCE],
      assessments: [...INITIAL_ASSESSMENTS],
      assessment_scores: [...INITIAL_ASSESSMENT_SCORES],
      settings: { ...INITIAL_SETTINGS },
      audit_logs: [...INITIAL_AUDIT_LOGS],
    };
  }

  private saveStore(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.store));
    } catch (e) {
      console.error('Failed to persist database to localStorage', e);
    }
  }

  public async initializeEnterprise(input: {
    schoolName: string;
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
    tagline?: string;
    motto?: string;
    currencySymbol?: string;
    adminFullName: string;
    adminEmail: string;
    adminPassword: string;
  }): Promise<{ settings: SchoolSettings; adminUser: User }> {
    const cleanSchoolName = input.schoolName.trim();
    const cleanAdminName = input.adminFullName.trim();
    const cleanAdminEmail = input.adminEmail.trim().toLowerCase();

    if (!cleanSchoolName) {
      throw new Error('Institution name is required.');
    }
    if (!cleanAdminName) {
      throw new Error('Administrator full name is required.');
    }
    if (!cleanAdminEmail || !cleanAdminEmail.includes('@')) {
      throw new Error('A valid administrator email address is required.');
    }
    if (!input.adminPassword || input.adminPassword.length < 6) {
      throw new Error('Administrator password must be at least 6 characters long.');
    }

    const now = new Date().toISOString();
    const updatedSettings: SchoolSettings = {
      ...INITIAL_SETTINGS,
      school_name: cleanSchoolName,
      email: input.email?.trim() || cleanAdminEmail,
      phone: input.phone?.trim() || '',
      address: input.address?.trim() || '',
      website: input.website?.trim() || '',
      tagline: input.tagline?.trim() || '',
      motto: input.motto?.trim() || '',
      currency_symbol: input.currencySymbol?.trim() || '$',
    };

    const adminUser: User = {
      id: generateUUID(),
      email: cleanAdminEmail,
      full_name: cleanAdminName,
      role_id: 'role_super_admin',
      role: 'super_admin',
      password: input.adminPassword,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    if (this.store.roles.length === 0) {
      this.store.roles = [...INITIAL_ROLES];
    }
    this.store.settings = updatedSettings;
    this.store.users = [adminUser];
    this.saveStore();

    this.logAudit(
      adminUser.id,
      adminUser.full_name,
      'ENTERPRISE_INITIALIZED',
      'System Configuration',
      `Initialized institution "${cleanSchoolName}" with Super Administrator ${cleanAdminEmail}`
    );

    if (this.mode === 'firebase') {
      try {
        await Promise.all([
          firebaseService.updateSettings(updatedSettings),
          firebaseService.addUser(adminUser),
        ]);
      } catch (err) {
        console.warn('Firestore sync warning during enterprise initialization:', err);
      }
    }

    this.notifyListeners();
    return { settings: updatedSettings, adminUser };
  }

  public async clearAllData(): Promise<void> {
    this.store = this.getInitialStore();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    localStorage.removeItem('edutrack_session_user_id');

    if (this.mode === 'firebase') {
      try {
        await firebaseService.clearAllEnterpriseData();
      } catch (err) {
        console.error('Failed to clear Firestore collections during reset:', err);
      }
    }
    this.notifyListeners();
  }

  public async resetToDefaults(): Promise<void> {
    await this.clearAllData();
  }

  public async resetDatabase(): Promise<void> {
    await this.clearAllData();
  }

  public logAudit(userId: string, userName: string, action: string, module: string, details: string): void {
    const log: AuditLog = {
      id: generateUUID(),
      user_id: userId,
      user_name: userName,
      action,
      module,
      details,
      timestamp: new Date().toISOString(),
    };
    this.store.audit_logs.unshift(log);
    if (this.store.audit_logs.length > 200) {
      this.store.audit_logs.pop();
    }
    this.saveStore();

    if (this.mode === 'firebase') {
      firebaseService.addAuditLog({
        user_id: userId,
        user_name: userName,
        action,
        module,
        details,
      }).catch(console.error);
    }
  }

  // --- ROLES & USERS ---
  public getRoles(): Role[] {
    return this.store.roles;
  }

  public getUsers(): User[] {
    return this.store.users;
  }

  public getUserById(id: string): User | undefined {
    return this.store.users.find((u) => u.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    return this.store.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>, actor?: { id: string; name: string }): User {
    const cleanEmail = user.email.trim().toLowerCase();
    if (this.getUserByEmail(cleanEmail)) {
      throw new Error(`An account with email "${cleanEmail}" already exists.`);
    }

    const newUser: User = {
      ...user,
      email: cleanEmail,
      id: generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.store.users.push(newUser);
    if (actor) {
      this.logAudit(actor.id, actor.name, 'USER_CREATED', 'User Management', `Created user account for ${newUser.full_name} (${newUser.email})`);
    }
    this.saveStore();

    if (this.mode === 'firebase') {
      firebaseService.addUser(newUser).catch(console.error);
    }
    return newUser;
  }

  public updateUser(id: string, updates: Partial<User>, actor?: { id: string; name: string }): User {
    const index = this.store.users.findIndex((u) => u.id === id);
    if (index === -1) throw new Error('User not found');
    this.store.users[index] = {
      ...this.store.users[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    if (actor) {
      this.logAudit(actor.id, actor.name, 'USER_UPDATED', 'User Management', `Updated user ${this.store.users[index].full_name}`);
    }
    this.saveStore();

    if (this.mode === 'firebase') {
      firebaseService.updateUser(id, updates).catch(console.error);
    }
    return this.store.users[index];
  }

  public deleteUser(id: string, actor?: { id: string; name: string }): void {
    const target = this.getUserById(id);
    if (!target) throw new Error('User not found');
    this.store.users = this.store.users.filter((u) => u.id !== id);
    if (actor) {
      this.logAudit(actor.id, actor.name, 'USER_DELETED', 'User Management', `Deleted user account ${target.full_name} (${target.email})`);
    }
    this.saveStore();

    if (this.mode === 'firebase') {
      firebaseService.deleteUser(id).catch(console.error);
    }
  }

  public getUserPassword(email: string): string {
    const cleanEmail = email.trim().toLowerCase();
    const user = this.store.users.find((u) => u.email.toLowerCase() === cleanEmail);
    return user?.password || '';
  }

  public verifyIdentityForPasswordReset(email: string, verificationCodeOrStaffId: string): { success: boolean; user?: User; staff?: Staff; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const cleanInput = verificationCodeOrStaffId.trim().toLowerCase();
    const user = this.store.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return { success: false, error: 'No institutional account found with this email address.' };
    }
    if (!user.is_active) {
      return { success: false, error: 'This user account is suspended or deactivated. Contact Super Admin.' };
    }

    // Check linked staff profile credentials
    let matched = false;
    let staffMatch: Staff | undefined;
    if (user.staff_id) {
      staffMatch = this.getStaffById(user.staff_id);
      if (staffMatch) {
        if (
          staffMatch.staff_code.toLowerCase() === cleanInput ||
          (staffMatch.employee_number && staffMatch.employee_number.toLowerCase() === cleanInput) ||
          (staffMatch.phone && staffMatch.phone.replace(/\s+/g, '').includes(cleanInput.replace(/\s+/g, '')))
        ) {
          matched = true;
        }
      }
    }

    if (cleanInput === user.id.toLowerCase()) {
      matched = true;
    }

    if (!matched) {
      return {
        success: false,
        error: 'Verification credential did not match our staff records. Try your Staff ID / Employee Number or use the One-Time Security Passcode option.',
      };
    }

    return { success: true, user, staff: staffMatch };
  }

  public resetUserPassword(email: string, newPassword: string, actorOrSelf?: { id: string; name: string }): { success: boolean; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const user = this.store.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return { success: false, error: 'Account not found.' };
    }
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    this.updateUser(user.id, { password: newPassword });
    const actorName = actorOrSelf?.name || user.full_name;
    const actorId = actorOrSelf?.id || user.id;
    this.logAudit(
      actorId,
      actorName,
      'PASSWORD_RESET',
      'Security & Authentication',
      `Password successfully reset for account ${user.email} (${user.full_name})`
    );
    return { success: true };
  }

  // --- STAFF ---
  public getStaff(): Staff[] {
    return this.store.staff;
  }

  public getStaffById(id: string): Staff | undefined {
    return this.store.staff.find((s) => s.id === id);
  }

  public isStaffCodeTaken(code: string, excludeId?: string): boolean {
    const clean = code.trim().toLowerCase();
    return this.store.staff.some(
      (s) => s.id !== excludeId && (s.staff_code.toLowerCase() === clean || (s.employee_number && s.employee_number.toLowerCase() === clean))
    );
  }

  public isStaffEmailTaken(email: string, excludeId?: string): boolean {
    const clean = email.trim().toLowerCase();
    return this.store.staff.some((s) => s.id !== excludeId && s.email.toLowerCase() === clean);
  }

  public isEmployeeNumberTaken(empNo: string, excludeId?: string): boolean {
    const clean = empNo.trim().toLowerCase();
    if (!clean) return false;
    return this.store.staff.some(
      (s) => s.id !== excludeId && ((s.employee_number && s.employee_number.toLowerCase() === clean) || s.staff_code.toLowerCase() === clean)
    );
  }

  public createStaff(staff: Omit<Staff, 'id' | 'created_at' | 'updated_at'>, actor?: { id: string; name: string }): Staff {
    if (this.isStaffCodeTaken(staff.staff_code)) {
      throw new Error(`Staff Code / ID "${staff.staff_code}" is already assigned to another staff member.`);
    }
    if (staff.employee_number && this.isEmployeeNumberTaken(staff.employee_number)) {
      throw new Error(`Employee Number "${staff.employee_number}" is already registered.`);
    }
    if (this.isStaffEmailTaken(staff.email)) {
      throw new Error(`Staff email address "${staff.email}" is already in use.`);
    }

    const newStaff: Staff = {
      ...staff,
      employee_number: staff.employee_number || staff.staff_code,
      id: generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.store.staff.push(newStaff);
    if (actor) {
      this.logAudit(actor.id, actor.name, 'STAFF_CREATED', 'Staff Management', `Added staff member: ${newStaff.first_name} ${newStaff.last_name} (${newStaff.staff_code})`);
    }
    this.saveStore();

    if (this.mode === 'firebase') {
      firebaseService.addStaff(newStaff).catch(console.error);
    }
    return newStaff;
  }

  public updateStaff(id: string, updates: Partial<Staff>, actor?: { id: string; name: string }): Staff {
    const index = this.store.staff.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Staff record not found');

    if (updates.staff_code && this.isStaffCodeTaken(updates.staff_code, id)) {
      throw new Error(`Staff Code "${updates.staff_code}" is already assigned to another staff member.`);
    }
    if (updates.employee_number && this.isEmployeeNumberTaken(updates.employee_number, id)) {
      throw new Error(`Employee Number "${updates.employee_number}" is already in use.`);
    }
    if (updates.email && this.isStaffEmailTaken(updates.email, id)) {
      throw new Error(`Email address "${updates.email}" is already assigned to another staff member.`);
    }

    this.store.staff[index] = {
      ...this.store.staff[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    if (actor) {
      this.logAudit(actor.id, actor.name, 'STAFF_UPDATED', 'Staff Management', `Updated staff record for ${this.store.staff[index].first_name} ${this.store.staff[index].last_name}`);
    }
    this.saveStore();

    if (this.mode === 'firebase') {
      firebaseService.updateStaff(id, updates).catch(console.error);
    }
    return this.store.staff[index];
  }

  public deleteStaff(id: string, actor?: { id: string; name: string }): void {
    const staff = this.getStaffById(id);
    if (!staff) throw new Error('Staff record not found');

    this.store.staff = this.store.staff.filter((s) => s.id !== id);
    if (actor) {
      this.logAudit(actor.id, actor.name, 'STAFF_DELETED', 'Staff Management', `Deleted staff profile: ${staff.first_name} ${staff.last_name} (${staff.staff_code})`);
    }
    this.saveStore();

    if (this.mode === 'firebase') {
      firebaseService.deleteStaff(id).catch(console.error);
    }
  }

  public getTeachers(): Staff[] {
    return this.store.staff.filter(
      (s) =>
        s.employment_status === 'active' &&
        (s.department.toLowerCase().includes('academic') ||
          s.job_title.toLowerCase().includes('teacher') ||
          s.job_title.toLowerCase().includes('instructor') ||
          s.job_title.toLowerCase().includes('tutor') ||
          s.job_title.toLowerCase().includes('headmaster') ||
          s.job_title.toLowerCase().includes('principal'))
    );
  }

  // --- STUDENTS ---
  public getStudents(): Student[] {
    return this.store.students;
  }

  public getStudentById(id: string): Student | undefined {
    return this.store.students.find((s) => s.id === id);
  }

  public getStudentsByClass(classId: string): Student[] {
    return this.store.students.filter((s) => s.current_class_id === classId);
  }

  public isStudentCodeTaken(code: string, excludeId?: string): boolean {
    const clean = code.trim().toLowerCase();
    return this.store.students.some(
      (s) => s.id !== excludeId && (s.student_code.toLowerCase() === clean || s.admission_number.toLowerCase() === clean)
    );
  }

  public isAdmissionNumberTaken(admNo: string, excludeId?: string): boolean {
    const clean = admNo.trim().toLowerCase();
    return this.store.students.some(
      (s) => s.id !== excludeId && (s.admission_number.toLowerCase() === clean || s.student_code.toLowerCase() === clean)
    );
  }

  public createStudent(
    student: Omit<Student, 'id' | 'created_at' | 'updated_at'>,
    guardians?:
      | Array<{ guardian: Omit<Guardian, 'id' | 'created_at' | 'updated_at'>; relationship: 'father' | 'mother' | 'guardian' | 'uncle' | 'aunt' | 'other'; is_primary_contact: boolean }>
      | Omit<Guardian, 'id' | 'created_at' | 'updated_at'>,
    guardianRelationshipOrActor?: 'father' | 'mother' | 'guardian' | 'uncle' | 'aunt' | 'other' | { id: string; name: string },
    actor?: { id: string; name: string }
  ): Student {
    if (this.isStudentCodeTaken(student.student_code)) {
      throw new Error(`Student ID "${student.student_code}" is already assigned to another student.`);
    }
    if (student.admission_number && this.isAdmissionNumberTaken(student.admission_number)) {
      throw new Error(`Admission Number "${student.admission_number}" is already registered.`);
    }

    const effectiveActor = actor || (typeof guardianRelationshipOrActor === 'object' ? guardianRelationshipOrActor : undefined);
    const effectiveRelationship = typeof guardianRelationshipOrActor === 'string' ? guardianRelationshipOrActor : 'father';

    const newStudent: Student = {
      ...student,
      admission_number: student.admission_number || student.student_code,
      id: generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.store.students.push(newStudent);

    const createdGuardians: Guardian[] = [];
    const createdLinks: StudentGuardian[] = [];

    if (guardians) {
      if (Array.isArray(guardians)) {
        guardians.forEach((gData) => {
          const newGuardian: Guardian = {
            ...gData.guardian,
            id: generateUUID(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          const newLink: StudentGuardian = {
            id: generateUUID(),
            student_id: newStudent.id,
            guardian_id: newGuardian.id,
            relationship: gData.relationship,
            is_primary_contact: gData.is_primary_contact,
          };
          this.store.guardians.push(newGuardian);
          this.store.student_guardians.push(newLink);
          createdGuardians.push(newGuardian);
          createdLinks.push(newLink);
        });
      } else {
        const newGuardian: Guardian = {
          ...guardians,
          id: generateUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const newLink: StudentGuardian = {
          id: generateUUID(),
          student_id: newStudent.id,
          guardian_id: newGuardian.id,
          relationship: effectiveRelationship,
          is_primary_contact: true,
        };
        this.store.guardians.push(newGuardian);
        this.store.student_guardians.push(newLink);
        createdGuardians.push(newGuardian);
        createdLinks.push(newLink);
      }
    }

    if (effectiveActor) {
      this.logAudit(
        effectiveActor.id,
        effectiveActor.name,
        'STUDENT_ENROLLED',
        'Student Directory',
        `Admitted student: ${newStudent.first_name} ${newStudent.last_name} (${newStudent.admission_number})`
      );
    }
    this.saveStore();

    if (this.mode === 'firebase') {
      firebaseService.addStudent(newStudent).catch(console.error);
      createdGuardians.forEach((g) => firebaseService.addGuardian(g).catch(console.error));
      createdLinks.forEach((l) => firebaseService.addStudentGuardian(l).catch(console.error));
    }
    return newStudent;
  }

  public updateStudent(id: string, updates: Partial<Student>, actor?: { id: string; name: string }): Student {
    const index = this.store.students.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Student record not found');

    if (updates.student_code && this.isStudentCodeTaken(updates.student_code, id)) {
      throw new Error(`Student ID "${updates.student_code}" is already assigned to another student.`);
    }
    if (updates.admission_number && this.isAdmissionNumberTaken(updates.admission_number, id)) {
      throw new Error(`Admission Number "${updates.admission_number}" is already registered.`);
    }

    this.store.students[index] = {
      ...this.store.students[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    if (actor) {
      this.logAudit(
        actor.id,
        actor.name,
        'STUDENT_UPDATED',
        'Student Directory',
        `Updated student record for ${this.store.students[index].first_name} ${this.store.students[index].last_name}`
      );
    }
    this.saveStore();

    if (this.mode === 'firebase') {
      firebaseService.updateStudent(id, updates).catch(console.error);
    }
    return this.store.students[index];
  }

  public deleteStudent(id: string, actor?: { id: string; name: string }): void {
    const student = this.getStudentById(id);
    if (!student) throw new Error('Student record not found');

    this.store.students = this.store.students.filter((s) => s.id !== id);
    this.store.attendance = this.store.attendance.filter((a) => a.student_id !== id);
    this.store.assessment_scores = this.store.assessment_scores.filter((sc) => sc.student_id !== id);

    if (actor) {
      this.logAudit(
        actor.id,
        actor.name,
        'STUDENT_DELETED',
        'Student Directory',
        `Deleted student profile: ${student.first_name} ${student.last_name} (${student.admission_number})`
      );
    }
    this.saveStore();

    if (this.mode === 'firebase') {
      firebaseService.deleteStudent(id).catch(console.error);
    }
  }

  // --- GUARDIANS ---
  public getGuardiansForStudent(
    studentId: string
  ): Array<{ guardian: Guardian; relationship: 'father' | 'mother' | 'guardian' | 'uncle' | 'aunt' | 'other'; is_primary_contact: boolean }> {
    const links = this.store.student_guardians.filter((sg) => sg.student_id === studentId);
    return links
      .map((link) => {
        const guardian = this.store.guardians.find((g) => g.id === link.guardian_id);
        if (!guardian) return null;
        return {
          guardian,
          relationship: link.relationship,
          is_primary_contact: link.is_primary_contact,
        };
      })
      .filter(
        (item): item is { guardian: Guardian; relationship: 'father' | 'mother' | 'guardian' | 'uncle' | 'aunt' | 'other'; is_primary_contact: boolean } =>
          item !== null
      );
  }

  // --- CLASSES ---
  public getClasses(): SchoolClass[] {
    return this.store.classes;
  }

  public getClassById(id: string): SchoolClass | undefined {
    return this.store.classes.find((c) => c.id === id);
  }

  public createClass(cls: Omit<SchoolClass, 'id' | 'created_at' | 'updated_at'>, actor?: { id: string; name: string }): SchoolClass {
    const duplicate = this.store.classes.find(
      (c) => c.name.trim().toLowerCase() === cls.name.trim().toLowerCase()
    );
    if (duplicate) {
      throw new Error(`A class named "${cls.name}" already exists.`);
    }

    const newClass: SchoolClass = {
      ...cls,
      id: generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.store.classes.push(newClass);

    let primaryAssignment: TeacherClassAssignment | undefined;
    if (newClass.class_teacher_id) {
      primaryAssignment = {
        id: generateUUID(),
        teacher_id: newClass.class_teacher_id,
        class_id: newClass.id,
        academic_session_id: newClass.academic_session_id || this.getActiveAcademicSession()?.id,
        is_primary_teacher: true,
        created_at: new Date().toISOString(),
      };
      this.store.teacher_class_assignments.push(primaryAssignment);
    }

    if (actor) {
      this.logAudit(actor.id, actor.name, 'CLASS_CREATED', 'Academic Structure', `Created class: ${newClass.name}`);
    }
    this.saveStore();

    if (this.mode === 'firebase') {
      firebaseService.addClass(newClass).catch(console.error);
      if (primaryAssignment) {
        firebaseService.addTeacherAssignment(primaryAssignment).catch(console.error);
      }
    }
    return newClass;
  }

  public updateClass(id: string, updates: Partial<SchoolClass>, actor?: { id: string; name: string }): SchoolClass {
    const index = this.store.classes.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Class record not found');

    if (updates.name) {
      const duplicate = this.store.classes.find(
        (c) => c.id !== id && c.name.trim().toLowerCase() === updates.name!.trim().toLowerCase()
      );
      if (duplicate) {
        throw new Error(`A class named "${updates.name}" already exists.`);
      }
    }

    this.store.classes[index] = {
      ...this.store.classes[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    if (actor) {
      this.logAudit(actor.id, actor.name, 'CLASS_UPDATED', 'Academic Structure', `Updated class details for ${this.store.classes[index].name}`);
    }
    this.saveStore();

    if (this.mode === 'firebase') {
      firebaseService.updateClass(id, updates).catch(console.error);
    }
    return this.store.classes[index];
  }

  public deleteClass(id: string, actor?: { id: string; name: string }): void {
    const cls = this.getClassById(id);
    if (!cls) throw new Error('Class record not found');

    const studentCount = this.getStudentsByClass(id).length;
    if (studentCount > 0) {
      throw new Error(`Cannot delete class "${cls.name}" because it currently has ${studentCount} enrolled student(s). Please transfer or reassign students first.`);
    }

    this.store.classes = this.store.classes.filter((c) => c.id !== id);
    this.store.teacher_class_assignments = this.store.teacher_class_assignments.filter((a) => a.class_id !== id);
    this.store.class_subjects = this.store.class_subjects.filter((cs) => cs.class_id !== id);

    if (actor) {
      this.logAudit(actor.id, actor.name, 'CLASS_DELETED', 'Academic Structure', `Deleted class: ${cls.name}`);
    }
    this.saveStore();

    if (this.mode === 'firebase') {
      firebaseService.deleteClass(id).catch(console.error);
    }
  }

  // --- ACADEMIC SESSIONS ---
  public getAcademicSessions(): AcademicSession[] {
    return this.store.academic_sessions.map((s) => ({
      ...s,
      is_current: s.is_active,
    }));
  }

  public getAcademicSessionById(id: string): AcademicSession | undefined {
    const s = this.store.academic_sessions.find((item) => item.id === id);
    return s ? { ...s, is_current: s.is_active } : undefined;
  }

  public getActiveAcademicSession(): AcademicSession | undefined {
    const s = this.store.academic_sessions.find((s) => s.is_active) || this.store.academic_sessions[0];
    return s ? { ...s, is_current: s.is_active } : undefined;
  }

  public setActiveAcademicSession(sessionId: string, actor?: { id: string; name: string }): void {
    this.store.academic_sessions = this.store.academic_sessions.map((s) => ({
      ...s,
      is_active: s.id === sessionId,
      is_current: s.id === sessionId,
    }));
    this.store.settings.current_session_id = sessionId;
    if (actor) {
      const sName = this.store.academic_sessions.find((s) => s.id === sessionId)?.name;
      this.logAudit(actor.id, actor.name, 'SESSION_ACTIVATED', 'Academic Structure', `Set active academic session to ${sName}`);
    }
    this.saveStore();

    if (this.mode === 'firebase') {
      this.store.academic_sessions.forEach((s) => {
        firebaseService.updateAcademicSession(s.id, { is_active: s.is_active, is_current: s.is_current }).catch(console.error);
      });
      firebaseService.updateSettings({ current_session_id: sessionId }).catch(console.error);
    }
  }

  public setCurrentAcademicSession(sessionId: string, actor?: { id: string; name: string }): void {
    this.setActiveAcademicSession(sessionId, actor);
  }

  public createAcademicSession(session: Omit<AcademicSession, 'id' | 'created_at'>, actor?: { id: string; name: string }): AcademicSession {
    const duplicate = this.store.academic_sessions.find(
      (s) => s.name.trim().toLowerCase() === session.name.trim().toLowerCase()
    );
    if (duplicate) {
      throw new Error(`An academic session named "${session.name}" already exists.`);
    }

    const newSession: AcademicSession = {
      ...session,
      is_active: session.is_active || !!session.is_current,
      is_current: session.is_active || !!session.is_current,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    if (newSession.is_active) {
      this.store.academic_sessions = this.store.academic_sessions.map((s) => ({ ...s, is_active: false, is_current: false }));
      this.store.settings.current_session_id = newSession.id;
    }
    this.store.academic_sessions.push(newSession);
    if (actor) {
      this.logAudit(actor.id, actor.name, 'SESSION_CREATED', 'Academic Structure', `Created academic session ${newSession.name}`);
    }
    this.saveStore();

    if (this.mode === 'firebase') {
      firebaseService.addAcademicSession(newSession).catch(console.error);
      if (newSession.is_active) {
        this.store.academic_sessions
          .filter((s) => s.id !== newSession.id)
          .forEach((s) => firebaseService.updateAcademicSession(s.id, { is_active: false, is_current: false }).catch(console.error));
        firebaseService.updateSettings({ current_session_id: newSession.id }).catch(console.error);
      }
    }
    return newSession;
  }

  public updateAcademicSession(id: string, updates: Partial<AcademicSession>, actor?: { id: string; name: string }): AcademicSession {
    const index = this.store.academic_sessions.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Academic session not found');

    if (updates.name) {
      const duplicate = this.store.academic_sessions.find(
        (s) => s.id !== id && s.name.trim().toLowerCase() === updates.name!.trim().toLowerCase()
      );
      if (duplicate) {
        throw new Error(`An academic session named "${updates.name}" already exists.`);
      }
    }

    this.store.academic_sessions[index] = {
      ...this.store.academic_sessions[index],
      ...updates,
      is_current: updates.is_active !== undefined ? updates.is_active : this.store.academic_sessions[index].is_active,
    };
    if (actor) {
      this.logAudit(actor.id, actor.name, 'SESSION_UPDATED', 'Academic Structure', `Updated academic session ${this.store.academic_sessions[index].name}`);
    }
    this.saveStore();

    if (this.mode === 'firebase') {
      firebaseService.updateAcademicSession(id, updates).catch(console.error);
    }
    return this.store.academic_sessions[index];
  }

  // --- TERMS ---
  public getTerms(sessionId?: string): Term[] {
    return this.store.terms
      .filter((t) => (sessionId ? t.academic_session_id === sessionId : true))
      .map((t) => ({ ...t, is_current: t.is_active }));
  }

  public getTermById(id: string): Term | undefined {
    const t = this.store.terms.find((item) => item.id === id);
    return t ? { ...t, is_current: t.is_active } : undefined;
  }

  public getActiveTerm(): Term | undefined {
    const t = this.store.terms.find((t) => t.is_active) || this.store.terms[0];
    return t ? { ...t, is_current: t.is_active } : undefined;
  }

  public setActiveTerm(termId: string, actor?: { id: string; name: string }): void {
    this.store.terms = this.store.terms.map((t) => ({
      ...t,
      is_active: t.id === termId,
      is_current: t.id === termId,
    }));
    this.store.settings.current_term_id = termId;
    if (actor) {
      const tName = this.store.terms.find((t) => t.id === termId)?.name;
      this.logAudit(actor.id, actor.name, 'TERM_ACTIVATED', 'Academic Structure', `Set active term to ${tName}`);
    }
    this.saveStore();

    if (this.mode === 'firebase') {
      this.store.terms.forEach((t) => {
        firebaseService.updateTerm(t.id, { is_active: t.is_active, is_current: t.is_current }).catch(console.error);
      });
      firebaseService.updateSettings({ current_term_id: termId }).catch(console.error);
    }
  }

  public setCurrentTerm(termId: string, actor?: { id: string; name: string }): void {
    this.setActiveTerm(termId, actor);
  }

  public createTerm(term: Omit<Term, 'id'>, actor?: { id: string; name: string }): Term {
    const duplicate = this.store.terms.find(
      (t) =>
        t.academic_session_id === term.academic_session_id &&
        t.name.trim().toLowerCase() === term.name.trim().toLowerCase()
    );
    if (duplicate) {
      throw new Error(`A term named "${term.name}" already exists for this academic session.`);
    }

    const newTerm: Term = {
      ...term,
      is_active: term.is_active || !!term.is_current,
      is_current: term.is_active || !!term.is_current,
      id: generateUUID(),
    };
    if (newTerm.is_active) {
      this.store.terms = this.store.terms.map((t) => ({ ...t, is_active: false, is_current: false }));
      this.store.settings.current_term_id = newTerm.id;
    }
    this.store.terms.push(newTerm);
    if (actor) {
      this.logAudit(actor.id, actor.name, 'TERM_CREATED', 'Academic Structure', `Created term ${newTerm.name}`);
    }
    this.saveStore();

    if (this.mode === 'firebase') {
      firebaseService.addTerm(newTerm).catch(console.error);
      if (newTerm.is_active) {
        this.store.terms
          .filter((t) => t.id !== newTerm.id)
          .forEach((t) => firebaseService.updateTerm(t.id, { is_active: false, is_current: false }).catch(console.error));
        firebaseService.updateSettings({ current_term_id: newTerm.id }).catch(console.error);
      }
    }
    return newTerm;
  }

  public updateTerm(id: string, updates: Partial<Term>, actor?: { id: string; name: string }): Term {
    const index = this.store.terms.findIndex((t) => t.id === id);
    if (index === -1) throw new Error('Term not found');

    this.store.terms[index] = {
      ...this.store.terms[index],
      ...updates,
      is_current: updates.is_active !== undefined ? updates.is_active : this.store.terms[index].is_active,
    };
    if (actor) {
      this.logAudit(actor.id, actor.name, 'TERM_UPDATED', 'Academic Structure', `Updated term ${this.store.terms[index].name}`);
    }
    this.saveStore();

    if (this.mode === 'firebase') {
      firebaseService.updateTerm(id, updates).catch(console.error);
    }
    return this.store.terms[index];
  }

  // --- TEACHER CLASS ASSIGNMENTS ---
  public getTeacherClassAssignments(teacherId?: string): TeacherClassAssignment[] {
    return this.store.teacher_class_assignments.filter((tca) => (teacherId ? tca.teacher_id === teacherId : true));
  }

  public getClassesForTeacher(teacherStaffId: string): SchoolClass[] {
    // 1. Direct class teacher assignment
    const primaryClasses = this.store.classes.filter((c) => c.class_teacher_id === teacherStaffId);

    // 2. Explicit teacher-class assignments
    const assignedClassIds = new Set(
      this.store.teacher_class_assignments.filter((tca) => tca.teacher_id === teacherStaffId).map((tca) => tca.class_id)
    );

    // 3. Subject-level class assignments
    this.store.class_subjects
      .filter((cs) => cs.teacher_id === teacherStaffId)
      .forEach((cs) => assignedClassIds.add(cs.class_id));

    primaryClasses.forEach((c) => assignedClassIds.add(c.id));

    return this.store.classes.filter((c) => assignedClassIds.has(c.id));
  }

  public isTeacherAssignedToClass(teacherStaffId: string, classId: string): boolean {
    const cls = this.getClassById(classId);
    if (cls && cls.class_teacher_id === teacherStaffId) return true;

    const hasAssignment = this.store.teacher_class_assignments.some(
      (tca) => tca.teacher_id === teacherStaffId && tca.class_id === classId
    );
    if (hasAssignment) return true;

    const hasSubject = this.store.class_subjects.some(
      (cs) => cs.class_id === classId && cs.teacher_id === teacherStaffId
    );
    return hasSubject;
  }

  // --- SUBJECTS ---
  public getSubjects(): Subject[] {
    return this.store.subjects;
  }

  public getSubjectById(id: string): Subject | undefined {
    return this.store.subjects.find((s) => s.id === id);
  }

  public createSubject(subject: Omit<Subject, 'id' | 'created_at'>, actor?: { id: string; name: string }): Subject {
    const duplicateCode = this.store.subjects.find(
      (s) => s.code.trim().toLowerCase() === subject.code.trim().toLowerCase()
    );
    if (duplicateCode) {
      throw new Error(`A subject with code "${subject.code}" already exists.`);
    }

    const duplicateName = this.store.subjects.find(
      (s) => s.name.trim().toLowerCase() === subject.name.trim().toLowerCase()
    );
    if (duplicateName) {
      throw new Error(`A subject named "${subject.name}" already exists.`);
    }

    const newSubject: Subject = {
      ...subject,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    this.store.subjects.push(newSubject);
    if (actor) {
      this.logAudit(actor.id, actor.name, 'SUBJECT_CREATED', 'Academic Structure', `Created subject ${newSubject.name} (${newSubject.code})`);
    }
    this.saveStore();

    if (this.mode === 'firebase') {
      firebaseService.addSubject(newSubject).catch(console.error);
    }
    return newSubject;
  }

  public updateSubject(id: string, updates: Partial<Subject>, actor?: { id: string; name: string }): Subject {
    const index = this.store.subjects.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Subject not found');

    if (updates.code) {
      const duplicateCode = this.store.subjects.find(
        (s) => s.id !== id && s.code.trim().toLowerCase() === updates.code!.trim().toLowerCase()
      );
      if (duplicateCode) {
        throw new Error(`A subject with code "${updates.code}" already exists.`);
      }
    }

    if (updates.name) {
      const duplicateName = this.store.subjects.find(
        (s) => s.id !== id && s.name.trim().toLowerCase() === updates.name!.trim().toLowerCase()
      );
      if (duplicateName) {
        throw new Error(`A subject named "${updates.name}" already exists.`);
      }
    }

    this.store.subjects[index] = {
      ...this.store.subjects[index],
      ...updates,
    };
    if (actor) {
      this.logAudit(actor.id, actor.name, 'SUBJECT_UPDATED', 'Academic Structure', `Updated subject ${this.store.subjects[index].name}`);
    }
    this.saveStore();

    if (this.mode === 'firebase') {
      firebaseService.updateSubject(id, updates).catch(console.error);
    }
    return this.store.subjects[index];
  }

  public deleteSubject(id: string, actor?: { id: string; name: string }): void {
    const subject = this.store.subjects.find((s) => s.id === id);
    if (!subject) throw new Error('Subject not found');

    this.store.class_subjects = this.store.class_subjects.filter((cs) => cs.subject_id !== id);
    this.store.subjects = this.store.subjects.filter((s) => s.id !== id);

    if (actor) {
      this.logAudit(actor.id, actor.name, 'SUBJECT_DELETED', 'Academic Structure', `Deleted subject ${subject.name} (${subject.code})`);
    }
    this.saveStore();

    if (this.mode === 'firebase') {
      firebaseService.deleteSubject(id).catch(console.error);
    }
  }

  public getClassSubjects(classId?: string, sessionId?: string): ClassSubject[] {
    return this.store.class_subjects.filter((cs) => {
      if (classId && cs.class_id !== classId) return false;
      if (sessionId && cs.academic_session_id && cs.academic_session_id !== sessionId) return false;
      return true;
    });
  }

  public getSubjectsByClass(classId: string, sessionId?: string): Subject[] {
    const classSubs = this.getClassSubjects(classId, sessionId);
    const subIds = new Set(classSubs.map((cs) => cs.subject_id));
    return this.store.subjects.filter((s) => subIds.has(s.id));
  }

  public assignSubjectToClass(
    classId: string,
    subjectId: string,
    teacherId: string | undefined,
    sessionId: string,
    actor?: { id: string; name: string }
  ): ClassSubject {
    const cls = this.getClassById(classId);
    const subject = this.getSubjectById(subjectId);
    const teacher = teacherId ? this.getStaffById(teacherId) : undefined;

    const existingIndex = this.store.class_subjects.findIndex(
      (cs) => cs.class_id === classId && cs.subject_id === subjectId && cs.academic_session_id === sessionId
    );
    if (existingIndex > -1) {
      this.store.class_subjects[existingIndex].teacher_id = teacherId;
      if (actor) {
        this.logAudit(
          actor.id,
          actor.name,
          'CLASS_SUBJECT_UPDATED',
          'Academic Structure',
          `Updated subject teacher for ${subject?.name || 'Subject'} in ${cls?.name || 'Class'}`
        );
      }
      this.saveStore();
      if (this.mode === 'firebase') {
        firebaseService.updateClassSubject(this.store.class_subjects[existingIndex].id, { teacher_id: teacherId }).catch(console.error);
      }
      return this.store.class_subjects[existingIndex];
    }
    const newLink: ClassSubject = {
      id: generateUUID(),
      class_id: classId,
      subject_id: subjectId,
      teacher_id: teacherId,
      academic_session_id: sessionId,
    };
    this.store.class_subjects.push(newLink);

    let newAssignment: TeacherClassAssignment | undefined;
    if (teacherId) {
      const existsAssignment = this.store.teacher_class_assignments.find(
        (tca) => tca.teacher_id === teacherId && tca.class_id === classId && tca.academic_session_id === sessionId
      );
      if (!existsAssignment) {
        newAssignment = {
          id: generateUUID(),
          teacher_id: teacherId,
          class_id: classId,
          academic_session_id: sessionId,
          is_primary_teacher: false,
          created_at: new Date().toISOString(),
        };
        this.store.teacher_class_assignments.push(newAssignment);
      }
    }

    if (actor) {
      this.logAudit(
        actor.id,
        actor.name,
        'CLASS_SUBJECT_ASSIGNED',
        'Academic Structure',
        `Assigned ${subject?.name || 'Subject'} to ${cls?.name || 'Class'} (Teacher: ${teacher ? teacher.first_name + ' ' + teacher.last_name : 'Unassigned'})`
      );
    }

    this.saveStore();
    if (this.mode === 'firebase') {
      firebaseService.addClassSubject(newLink).catch(console.error);
      if (newAssignment) {
        firebaseService.addTeacherAssignment(newAssignment).catch(console.error);
      }
    }
    return newLink;
  }

  public updateClassSubjectTeacher(
    classSubjectId: string,
    teacherId: string | undefined,
    actor?: { id: string; name: string }
  ): ClassSubject {
    const index = this.store.class_subjects.findIndex((cs) => cs.id === classSubjectId);
    if (index === -1) throw new Error('Class-subject assignment not found');

    this.store.class_subjects[index].teacher_id = teacherId;
    const cs = this.store.class_subjects[index];
    const cls = this.getClassById(cs.class_id);
    const subject = this.getSubjectById(cs.subject_id);
    const teacher = teacherId ? this.getStaffById(teacherId) : undefined;

    let newAssignment: TeacherClassAssignment | undefined;
    if (teacherId && cs.academic_session_id) {
      const exists = this.store.teacher_class_assignments.find(
        (tca) => tca.teacher_id === teacherId && tca.class_id === cs.class_id && tca.academic_session_id === cs.academic_session_id
      );
      if (!exists) {
        newAssignment = {
          id: generateUUID(),
          teacher_id: teacherId,
          class_id: cs.class_id,
          academic_session_id: cs.academic_session_id,
          is_primary_teacher: false,
          created_at: new Date().toISOString(),
        };
        this.store.teacher_class_assignments.push(newAssignment);
      }
    }

    if (actor) {
      this.logAudit(
        actor.id,
        actor.name,
        'CLASS_SUBJECT_TEACHER_UPDATED',
        'Academic Structure',
        `Assigned ${teacher ? teacher.first_name + ' ' + teacher.last_name : 'Unassigned'} to teach ${subject?.name} in ${cls?.name}`
      );
    }
    this.saveStore();
    if (this.mode === 'firebase') {
      firebaseService.updateClassSubject(classSubjectId, { teacher_id: teacherId }).catch(console.error);
      if (newAssignment) {
        firebaseService.addTeacherAssignment(newAssignment).catch(console.error);
      }
    }
    return this.store.class_subjects[index];
  }

  public removeSubjectFromClass(classSubjectId: string, actor?: { id: string; name: string }): void {
    const cs = this.store.class_subjects.find((item) => item.id === classSubjectId);
    const cls = cs ? this.getClassById(cs.class_id) : undefined;
    const subject = cs ? this.getSubjectById(cs.subject_id) : undefined;

    this.store.class_subjects = this.store.class_subjects.filter((item) => item.id !== classSubjectId);
    if (actor) {
      this.logAudit(
        actor.id,
        actor.name,
        'SUBJECT_REMOVED_FROM_CLASS',
        'Academic Structure',
        `Removed ${subject?.name || 'subject'} from ${cls?.name || 'class'}`
      );
    }
    this.saveStore();
    if (this.mode === 'firebase') {
      firebaseService.deleteClassSubject(classSubjectId).catch(console.error);
    }
  }

  // --- ATTENDANCE WITH DUPLICATE PREVENTION ---
  public getAttendance(classId?: string, date?: string): Attendance[] {
    return this.store.attendance.filter((a) => {
      if (classId && a.class_id !== classId) return false;
      if (date && a.attendance_date !== date) return false;
      return true;
    });
  }

  public getAllAttendance(): Attendance[] {
    return this.store.attendance;
  }

  public getAttendanceForStudent(studentId: string): Attendance[] {
    return this.store.attendance
      .filter((a) => a.student_id === studentId)
      .sort((a, b) => new Date(b.attendance_date).getTime() - new Date(a.attendance_date).getTime());
  }

  public deleteAttendanceForClassAndDate(classId: string, date: string, actor?: { id: string; name: string }): number {
    const initialCount = this.store.attendance.length;
    this.store.attendance = this.store.attendance.filter(
      (a) => !(a.class_id === classId && a.attendance_date === date)
    );
    const deletedCount = initialCount - this.store.attendance.length;
    if (actor && deletedCount > 0) {
      const cls = this.getClassById(classId);
      this.logAudit(
        actor.id,
        actor.name,
        'ATTENDANCE_DELETED',
        'Attendance',
        `Deleted attendance session for class ${cls?.name ?? 'Unknown'} on ${date} (${deletedCount} records removed)`
      );
    }
    this.saveStore();

    if (this.mode === 'firebase') {
      firebaseService.deleteAttendanceForClassAndDate(classId, date).catch(console.error);
    }
    return deletedCount;
  }

  public saveAttendanceBatch(
    records: Array<{ student_id: string; class_id: string; attendance_date: string; status: AttendanceStatus; notes?: string }>,
    actor: { id: string; name: string }
  ): { savedCount: number; updatedCount: number } {
    let savedCount = 0;
    let updatedCount = 0;
    const now = new Date().toISOString();

    records.forEach((rec) => {
      // RULE: Prevent duplicate attendance records for the same student, class, and attendance date
      const existingIndex = this.store.attendance.findIndex(
        (a) => a.student_id === rec.student_id && a.class_id === rec.class_id && a.attendance_date === rec.attendance_date
      );

      if (existingIndex > -1) {
        this.store.attendance[existingIndex] = {
          ...this.store.attendance[existingIndex],
          status: rec.status,
          notes: rec.notes ?? this.store.attendance[existingIndex].notes,
          marked_by: actor.id,
          recorded_by: actor.id,
          updated_at: now,
        };
        updatedCount++;
      } else {
        const newAtt: Attendance = {
          id: `att_${rec.student_id}_${rec.attendance_date}`,
          student_id: rec.student_id,
          class_id: rec.class_id,
          attendance_date: rec.attendance_date,
          status: rec.status,
          notes: rec.notes || '',
          marked_by: actor.id,
          recorded_by: actor.id,
          created_at: now,
          updated_at: now,
        };
        this.store.attendance.push(newAtt);
        savedCount++;
      }
    });

    if (records.length > 0) {
      const first = records[0];
      const cls = this.getClassById(first.class_id);
      this.logAudit(
        actor.id,
        actor.name,
        'ATTENDANCE_RECORDED',
        'Attendance',
        `Marked attendance for ${cls?.name || 'Class'} on ${first.attendance_date} (${savedCount} new, ${updatedCount} updated)`
      );
    }
    this.saveStore();

    if (this.mode === 'firebase') {
      firebaseService.recordAttendance(
        records.map((r) => ({
          student_id: r.student_id,
          class_id: r.class_id,
          attendance_date: r.attendance_date,
          status: r.status,
          marked_by: actor.id,
          recorded_by: actor.id,
          notes: r.notes || '',
        }))
      ).catch(console.error);
    }

    return { savedCount, updatedCount };
  }

  // --- ASSESSMENTS & SCORES (Duplicate Prevention Enforced) ---
  public getAssessments(classId?: string, subjectId?: string, sessionId?: string, termId?: string): Assessment[] {
    return this.store.assessments.filter((a) => {
      if (classId && a.class_id !== classId) return false;
      if (subjectId && a.subject_id !== subjectId) return false;
      if (sessionId && a.academic_session_id && a.academic_session_id !== sessionId) return false;
      if (termId && a.term_id && a.term_id !== termId) return false;
      return true;
    });
  }

  public getAssessmentById(id: string): Assessment | undefined {
    return this.store.assessments.find((a) => a.id === id);
  }

  public createAssessment(assessment: Omit<Assessment, 'id' | 'created_at' | 'updated_at'>, actor: { id: string; name: string }): Assessment {
    if (assessment.maximum_score <= 0) {
      throw new Error('Maximum score must be greater than 0');
    }
    const newAssessment: Assessment = {
      ...assessment,
      id: generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.store.assessments.push(newAssessment);
    this.logAudit(
      actor.id,
      actor.name,
      'ASSESSMENT_CREATED',
      'Assessments',
      `Created assessment "${newAssessment.title}" (Max: ${newAssessment.maximum_score})`
    );
    this.saveStore();

    if (this.mode === 'firebase') {
      firebaseService.addAssessment(newAssessment).catch(console.error);
    }
    return newAssessment;
  }

  public updateAssessment(id: string, updates: Partial<Assessment>, actor: { id: string; name: string }): Assessment {
    const index = this.store.assessments.findIndex((a) => a.id === id);
    if (index === -1) throw new Error('Assessment not found');
    this.store.assessments[index] = {
      ...this.store.assessments[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.logAudit(actor.id, actor.name, 'ASSESSMENT_UPDATED', 'Assessments', `Updated assessment "${this.store.assessments[index].title}"`);
    this.saveStore();

    if (this.mode === 'firebase') {
      firebaseService.updateAssessment(id, updates).catch(console.error);
    }
    return this.store.assessments[index];
  }

  public deleteAssessment(id: string, actor: { id: string; name: string }): void {
    const index = this.store.assessments.findIndex((a) => a.id === id);
    if (index === -1) throw new Error('Assessment not found');
    const assessment = this.store.assessments[index];

    const previousScoreCount = this.store.assessment_scores.length;
    this.store.assessment_scores = this.store.assessment_scores.filter((as) => as.assessment_id !== id);
    const removedScores = previousScoreCount - this.store.assessment_scores.length;

    this.store.assessments.splice(index, 1);

    this.logAudit(
      actor.id,
      actor.name,
      'ASSESSMENT_DELETED',
      'Assessments',
      `Deleted assessment "${assessment.title}" and ${removedScores} student score record(s)`
    );
    this.saveStore();

    if (this.mode === 'firebase') {
      firebaseService.deleteAssessment(id).catch(console.error);
    }
  }

  public deleteAssessmentScore(scoreId: string, actor: { id: string; name: string }): void {
    const index = this.store.assessment_scores.findIndex((as) => as.id === scoreId);
    if (index === -1) throw new Error('Assessment score record not found');
    const score = this.store.assessment_scores[index];
    const assessment = this.getAssessmentById(score.assessment_id);
    const student = this.getStudentById(score.student_id);

    this.store.assessment_scores.splice(index, 1);
    this.logAudit(
      actor.id,
      actor.name,
      'SCORE_DELETED',
      'Assessments',
      `Removed score for ${student?.first_name || 'Student'} ${student?.last_name || ''} in assessment "${assessment?.title || 'Assessment'}"`
    );
    this.saveStore();

    if (this.mode === 'firebase') {
      firebaseService.deleteAssessmentScore(scoreId).catch(console.error);
    }
  }

  public getSubjectsForTeacherInClass(teacherStaffId: string, classId: string): Subject[] {
    const cls = this.getClassById(classId);
    const isPrimaryTeacher = cls?.class_teacher_id === teacherStaffId;

    const teacherClassSubjects = this.store.class_subjects.filter(
      (cs) => cs.class_id === classId && cs.teacher_id === teacherStaffId
    );

    if (teacherClassSubjects.length > 0) {
      const subjectIds = new Set(teacherClassSubjects.map((cs) => cs.subject_id));
      return this.store.subjects.filter((s) => subjectIds.has(s.id));
    }

    if (isPrimaryTeacher) {
      return this.getSubjectsByClass(classId);
    }

    return this.getSubjectsByClass(classId);
  }

  public getAssessmentStats(assessmentId: string): {
    totalStudents: number;
    recordedCount: number;
    highestScore: number;
    lowestScore: number;
    averageScore: number;
    averagePercentage: number;
    maxScore: number;
    passCount: number;
    failCount: number;
    passRate: number;
  } {
    const assessment = this.getAssessmentById(assessmentId);
    if (!assessment) {
      return {
        totalStudents: 0,
        recordedCount: 0,
        highestScore: 0,
        lowestScore: 0,
        averageScore: 0,
        averagePercentage: 0,
        maxScore: 100,
        passCount: 0,
        failCount: 0,
        passRate: 0,
      };
    }

    const students = this.getStudentsByClass(assessment.class_id).filter((s) => s.student_status === 'active');
    const scores = this.getScoresForAssessment(assessmentId);
    const maxScore = assessment.maximum_score || 100;

    if (scores.length === 0) {
      return {
        totalStudents: students.length,
        recordedCount: 0,
        highestScore: 0,
        lowestScore: 0,
        averageScore: 0,
        averagePercentage: 0,
        maxScore,
        passCount: 0,
        failCount: 0,
        passRate: 0,
      };
    }

    const scoreValues = scores.map((s) => s.score);
    const highestScore = Math.max(...scoreValues);
    const lowestScore = Math.min(...scoreValues);
    const sum = scoreValues.reduce((acc, curr) => acc + curr, 0);
    const averageScore = Math.round((sum / scores.length) * 10) / 10;
    const averagePercentage = maxScore > 0 ? Math.round((averageScore / maxScore) * 100) : 0;

    const passCount = scores.filter((s) => s.score / maxScore >= 0.5).length;
    const failCount = scores.length - passCount;
    const passRate = Math.round((passCount / scores.length) * 100);

    return {
      totalStudents: students.length,
      recordedCount: scores.length,
      highestScore,
      lowestScore,
      averageScore,
      averagePercentage,
      maxScore,
      passCount,
      failCount,
      passRate,
    };
  }

  public getScores(): AssessmentScore[] {
    return this.store.assessment_scores;
  }

  public getScoresForAssessment(assessmentId: string): AssessmentScore[] {
    return this.store.assessment_scores.filter((as) => as.assessment_id === assessmentId);
  }

  public getScoresForStudent(studentId: string): Array<{ score: AssessmentScore; assessment: Assessment; subject?: Subject }> {
    return this.store.assessment_scores
      .filter((as) => as.student_id === studentId)
      .map((score) => {
        const assessment = this.store.assessments.find((a) => a.id === score.assessment_id)!;
        const subject = assessment ? this.getSubjectById(assessment.subject_id) : undefined;
        return { score, assessment, subject };
      })
      .filter((item) => !!item.assessment);
  }

  public saveAssessmentScoresBatch(
    param1: string | Array<{ assessment_id: string; student_id: string; score: number; feedback?: string; recorded_by?: string }>,
    param2?: Array<{ student_id: string; score: number; feedback?: string }> | { id: string; name: string },
    param3?: { id: string; name: string }
  ): { saved: number; updated: number } {
    let saved = 0;
    let updated = 0;
    const now = new Date().toISOString();

    if (Array.isArray(param1)) {
      const records = param1;
      const actor = (param2 as { id: string; name: string }) || { id: 'admin', name: 'System Admin' };

      records.forEach((item) => {
        const existingIndex = this.store.assessment_scores.findIndex(
          (as) => as.assessment_id === item.assessment_id && as.student_id === item.student_id
        );
        if (existingIndex > -1) {
          this.store.assessment_scores[existingIndex] = {
            ...this.store.assessment_scores[existingIndex],
            score: item.score,
            feedback: item.feedback ?? this.store.assessment_scores[existingIndex].feedback,
            recorded_by: item.recorded_by || actor.id,
            updated_at: now,
          };
          updated++;
        } else {
          const newScore: AssessmentScore = {
            id: `sc_${item.assessment_id}_${item.student_id}`,
            assessment_id: item.assessment_id,
            student_id: item.student_id,
            score: item.score,
            feedback: item.feedback,
            recorded_by: item.recorded_by || actor.id,
            created_at: now,
            updated_at: now,
          };
          this.store.assessment_scores.push(newScore);
          saved++;
        }
      });

      this.saveStore();
      return { saved, updated };
    }

    const assessmentId = param1 as string;
    const scoresData = (param2 as Array<{ student_id: string; score: number; feedback?: string }>) || [];
    const actor = param3 || { id: 'admin', name: 'System Admin' };

    const assessment = this.getAssessmentById(assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    for (const item of scoresData) {
      if (item.score < 0) {
        throw new Error(`Score cannot be negative (${item.score})`);
      }
      if (item.score > assessment.maximum_score) {
        throw new Error(`Score (${item.score}) cannot exceed maximum allowed score of ${assessment.maximum_score}`);
      }
    }

    scoresData.forEach((item) => {
      const existingIndex = this.store.assessment_scores.findIndex(
        (as) => as.assessment_id === assessmentId && as.student_id === item.student_id
      );

      if (existingIndex > -1) {
        this.store.assessment_scores[existingIndex] = {
          ...this.store.assessment_scores[existingIndex],
          score: item.score,
          feedback: item.feedback ?? this.store.assessment_scores[existingIndex].feedback,
          recorded_by: actor.id,
          updated_at: now,
        };
        updated++;
      } else {
        const newScore: AssessmentScore = {
          id: `sc_${assessmentId}_${item.student_id}`,
          assessment_id: assessmentId,
          student_id: item.student_id,
          score: item.score,
          feedback: item.feedback,
          recorded_by: actor.id,
          created_at: now,
          updated_at: now,
        };
        this.store.assessment_scores.push(newScore);
        saved++;
      }
    });

    this.logAudit(
      actor.id,
      actor.name,
      'SCORES_RECORDED',
      'Assessments',
      `Recorded ${saved} score(s) and updated ${updated} score(s) for "${assessment.title}"`
    );
    this.saveStore();

    if (this.mode === 'firebase') {
      firebaseService.saveScores(assessmentId, scoresData, actor.id).catch(console.error);
    }

    return { saved, updated };
  }

  // --- SETTINGS ---
  public getSettings(): SchoolSettings {
    return this.store.settings;
  }

  public updateSettings(settings: Partial<SchoolSettings>, actor?: { id: string; name: string }): SchoolSettings {
    this.store.settings = {
      ...this.store.settings,
      ...settings,
    };
    if (actor) {
      this.logAudit(actor.id, actor.name, 'SETTINGS_UPDATED', 'System Configuration', 'Updated institution branding and system settings');
    }
    this.saveStore();

    if (this.mode === 'firebase') {
      firebaseService.updateSettings(settings).catch(console.error);
    }
    return this.store.settings;
  }

  // --- AUDIT LOGS ---
  public getAuditLogs(): AuditLog[] {
    return this.store.audit_logs;
  }

  // --- GLOBAL SEARCH ---
  public globalSearch(
    queryText: string,
    filterType: 'all' | 'students' | 'staff' | 'classes' = 'all'
  ): Array<{
    id: string;
    type: 'student' | 'staff' | 'class';
    name: string;
    studentCode?: string;
    admissionNumber?: string;
    staffCode?: string;
    employeeNumber?: string;
    identificationNumber: string;
    className?: string;
    status: string;
    context: string;
    gender?: string;
    avatarUrl?: string;
    matchReason?: string;
    score: number;
  }> {
    const raw = queryText.trim().toLowerCase();
    if (!raw) return [];

    const tokens = raw.split(/\s+/).filter(Boolean);
    const results: Array<{
      id: string;
      type: 'student' | 'staff' | 'class';
      name: string;
      studentCode?: string;
      admissionNumber?: string;
      staffCode?: string;
      employeeNumber?: string;
      identificationNumber: string;
      className?: string;
      status: string;
      context: string;
      gender?: string;
      avatarUrl?: string;
      matchReason?: string;
      score: number;
    }> = [];

    // 1. Search Students
    if (filterType === 'all' || filterType === 'students') {
      this.store.students.forEach((st) => {
        const fullName = `${st.first_name} ${st.middle_name || ''} ${st.last_name}`.toLowerCase();
        const code = (st.student_code || '').toLowerCase();
        const adm = (st.admission_number || '').toLowerCase();
        const cls = this.getClassById(st.current_class_id);
        const clsName = (cls?.name || '').toLowerCase();

        let matchCount = 0;
        let matchReason = '';
        let relevanceScore = 0;

        for (const t of tokens) {
          if (code === t || adm === t) {
            relevanceScore += 100;
            matchReason = code === t ? `Exact Student ID: ${st.student_code}` : `Exact Admission No: ${st.admission_number}`;
            matchCount++;
          } else if (code.includes(t)) {
            relevanceScore += 50;
            matchReason = `Student ID matches "${t}"`;
            matchCount++;
          } else if (adm.includes(t)) {
            relevanceScore += 45;
            matchReason = `Admission No matches "${t}"`;
            matchCount++;
          } else if (fullName.startsWith(t)) {
            relevanceScore += 40;
            matchReason = `Name starts with "${t}"`;
            matchCount++;
          } else if (fullName.includes(t)) {
            relevanceScore += 25;
            matchReason = `Name matches "${t}"`;
            matchCount++;
          } else if (clsName.includes(t)) {
            relevanceScore += 15;
            matchReason = `Class: ${cls?.name}`;
            matchCount++;
          }
        }

        if (matchCount === tokens.length) {
          results.push({
            id: st.id,
            type: 'student',
            name: `${st.first_name} ${st.middle_name ? st.middle_name + ' ' : ''}${st.last_name}`,
            studentCode: st.student_code,
            admissionNumber: st.admission_number,
            identificationNumber: `ID: ${st.student_code} • Adm: ${st.admission_number}`,
            className: cls?.name || 'Unassigned',
            status: st.student_status,
            context: `${cls?.name || 'Class Unassigned'} • Adm: ${st.admission_number}`,
            gender: st.gender,
            avatarUrl: st.profile_photo_url,
            matchReason,
            score: relevanceScore,
          });
        }
      });
    }

    // 2. Search Staff
    if (filterType === 'all' || filterType === 'staff') {
      this.store.staff.forEach((st) => {
        const fullName = `${st.first_name} ${st.middle_name || ''} ${st.last_name}`.toLowerCase();
        const code = (st.staff_code || '').toLowerCase();
        const empNo = (st.employee_number || st.staff_code || '').toLowerCase();
        const title = (st.job_title || '').toLowerCase();
        const dept = (st.department || '').toLowerCase();
        const email = (st.email || '').toLowerCase();

        let matchCount = 0;
        let matchReason = '';
        let relevanceScore = 0;

        for (const t of tokens) {
          if (code === t || empNo === t) {
            relevanceScore += 100;
            matchReason = code === t ? `Exact Staff ID: ${st.staff_code}` : `Exact Employee No: ${st.employee_number || st.staff_code}`;
            matchCount++;
          } else if (code.includes(t)) {
            relevanceScore += 50;
            matchReason = `Staff ID matches "${t}"`;
            matchCount++;
          } else if (empNo.includes(t)) {
            relevanceScore += 45;
            matchReason = `Employee No matches "${t}"`;
            matchCount++;
          } else if (fullName.startsWith(t)) {
            relevanceScore += 40;
            matchReason = `Name starts with "${t}"`;
            matchCount++;
          } else if (fullName.includes(t)) {
            relevanceScore += 25;
            matchReason = `Name matches "${t}"`;
            matchCount++;
          } else if (title.includes(t)) {
            relevanceScore += 20;
            matchReason = `Job Title matches "${t}"`;
            matchCount++;
          } else if (dept.includes(t)) {
            relevanceScore += 15;
            matchReason = `Department matches "${t}"`;
            matchCount++;
          } else if (email.includes(t)) {
            relevanceScore += 10;
            matchReason = `Email matches "${t}"`;
            matchCount++;
          }
        }

        if (matchCount === tokens.length) {
          const empNumDisplay = st.employee_number || st.staff_code;
          results.push({
            id: st.id,
            type: 'staff',
            name: `${st.first_name} ${st.middle_name ? st.middle_name + ' ' : ''}${st.last_name}`,
            staffCode: st.staff_code,
            employeeNumber: empNumDisplay,
            identificationNumber: `Staff ID: ${st.staff_code} • Emp No: ${empNumDisplay}`,
            status: st.employment_status,
            context: `${st.job_title} • ${st.department}`,
            gender: st.gender,
            avatarUrl: st.profile_photo_url,
            matchReason,
            score: relevanceScore,
          });
        }
      });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 25);
  }

  // --- BACKWARD-COMPATIBLE ALIASES & HELPER METHODS ---
  public getSessions(): AcademicSession[] {
    return this.getAcademicSessions();
  }

  public getActiveSession(): AcademicSession | undefined {
    return this.getActiveAcademicSession();
  }

  public setActiveSession(sessionId: string, actor?: { id: string; name: string }): void {
    this.setActiveAcademicSession(sessionId, actor);
  }

  public deleteAcademicSession(id: string, actor?: { id: string; name: string }): void {
    const s = this.getAcademicSessionById(id);
    if (!s) return;
    this.store.academic_sessions = this.store.academic_sessions.filter((item) => item.id !== id);
    if (actor) {
      this.logAudit(actor.id, actor.name, 'SESSION_DELETED', 'Academic Structure', `Deleted academic session ${s.name}`);
    }
    this.saveStore();
    if (this.mode === 'firebase') {
      firebaseService.deleteAcademicSession(id).catch(console.error);
    }
  }

  public deleteTerm(id: string, actor?: { id: string; name: string }): void {
    const t = this.getTermById(id);
    if (!t) return;
    this.store.terms = this.store.terms.filter((item) => item.id !== id);
    if (actor) {
      this.logAudit(actor.id, actor.name, 'TERM_DELETED', 'Academic Structure', `Deleted term ${t.name}`);
    }
    this.saveStore();
    if (this.mode === 'firebase') {
      firebaseService.deleteTerm(id).catch(console.error);
    }
  }

  public getTeacherAssignments(teacherId?: string): TeacherClassAssignment[] {
    return this.getTeacherClassAssignments(teacherId);
  }

  public assignTeacherToClass(
    teacherId: string,
    classId: string,
    sessionId: string,
    isPrimary: boolean = false,
    actor?: { id: string; name: string }
  ): TeacherClassAssignment {
    const existingIndex = this.store.teacher_class_assignments.findIndex(
      (a) => a.teacher_id === teacherId && a.class_id === classId && a.academic_session_id === sessionId
    );
    if (existingIndex > -1) {
      this.store.teacher_class_assignments[existingIndex].is_primary_teacher = isPrimary;
      this.saveStore();
      return this.store.teacher_class_assignments[existingIndex];
    }
    const newAssignment: TeacherClassAssignment = {
      id: generateUUID(),
      teacher_id: teacherId,
      class_id: classId,
      academic_session_id: sessionId,
      is_primary_teacher: isPrimary,
      created_at: new Date().toISOString(),
    };
    this.store.teacher_class_assignments.push(newAssignment);
    if (isPrimary) {
      const clsIndex = this.store.classes.findIndex((c) => c.id === classId);
      if (clsIndex > -1) {
        this.store.classes[clsIndex].class_teacher_id = teacherId;
        if (this.mode === 'firebase') {
          firebaseService.updateClass(classId, { class_teacher_id: teacherId }).catch(console.error);
        }
      }
    }
    if (actor) {
      this.logAudit(actor.id, actor.name, 'TEACHER_ASSIGNED', 'Academic Structure', `Assigned teacher to class`);
    }
    this.saveStore();
    if (this.mode === 'firebase') {
      firebaseService.addTeacherAssignment(newAssignment).catch(console.error);
    }
    return newAssignment;
  }

  public deleteTeacherAssignment(id: string, actor?: { id: string; name: string }): void {
    this.store.teacher_class_assignments = this.store.teacher_class_assignments.filter((a) => a.id !== id);
    if (actor) {
      this.logAudit(actor.id, actor.name, 'TEACHER_UNASSIGNED', 'Academic Structure', `Removed teacher assignment`);
    }
    this.saveStore();
    if (this.mode === 'firebase') {
      firebaseService.deleteTeacherAssignment(id).catch(console.error);
    }
  }

  public toggleStaffStatus(id: string, newStatus?: EmploymentStatus, actor?: { id: string; name: string }): Staff {
    const staff = this.getStaffById(id);
    if (!staff) throw new Error('Staff record not found');
    const targetStatus = newStatus || (staff.employment_status === 'active' ? 'on_leave' : 'active');
    return this.updateStaff(id, { employment_status: targetStatus }, actor);
  }

  public changeStudentStatus(id: string, status: StudentStatus, actor?: { id: string; name: string }): Student {
    return this.updateStudent(id, { student_status: status }, actor);
  }

  public assignStudentClass(id: string, classId: string, actor?: { id: string; name: string }): Student {
    return this.updateStudent(id, { current_class_id: classId }, actor);
  }

  public updateGuardian(id: string, updates: Partial<Guardian>, actor?: { id: string; name: string }): Guardian {
    const index = this.store.guardians.findIndex((g) => g.id === id);
    if (index === -1) throw new Error('Guardian record not found');
    this.store.guardians[index] = {
      ...this.store.guardians[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    if (actor) {
      this.logAudit(actor.id, actor.name, 'GUARDIAN_UPDATED', 'Guardians', `Updated guardian ${this.store.guardians[index].first_name}`);
    }
    this.saveStore();
    if (this.mode === 'firebase') {
      firebaseService.updateGuardian(id, updates).catch(console.error);
    }
    return this.store.guardians[index];
  }

  public setPrimaryGuardian(studentId: string, guardianId: string): void {
    this.store.student_guardians = this.store.student_guardians.map((sg) => {
      if (sg.student_id === studentId) {
        return { ...sg, is_primary_contact: sg.guardian_id === guardianId };
      }
      return sg;
    });
    this.saveStore();
  }

  public addGuardianToStudent(
    studentId: string,
    guardianData: Omit<Guardian, 'id' | 'created_at' | 'updated_at'>,
    relationship: 'father' | 'mother' | 'guardian' | 'uncle' | 'aunt' | 'other',
    isPrimary: boolean,
    actor?: { id: string; name: string }
  ): Guardian {
    const newGuardian: Guardian = {
      ...guardianData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.store.guardians.push(newGuardian);
    if (isPrimary) {
      this.store.student_guardians = this.store.student_guardians.map((sg) =>
        sg.student_id === studentId ? { ...sg, is_primary_contact: false } : sg
      );
    }
    const newLink: StudentGuardian = {
      id: generateUUID(),
      student_id: studentId,
      guardian_id: newGuardian.id,
      relationship,
      is_primary_contact: isPrimary,
    };
    this.store.student_guardians.push(newLink);
    if (actor) {
      this.logAudit(actor.id, actor.name, 'GUARDIAN_ADDED', 'Guardians', `Added guardian ${newGuardian.first_name} ${newGuardian.last_name}`);
    }
    this.saveStore();
    if (this.mode === 'firebase') {
      firebaseService.addGuardian(newGuardian).catch(console.error);
      firebaseService.addStudentGuardian(newLink).catch(console.error);
    }
    return newGuardian;
  }

  public removeGuardianFromStudent(studentId: string, guardianId: string, actor?: { id: string; name: string }): void {
    const removedLinks = this.store.student_guardians.filter(
      (sg) => sg.student_id === studentId && sg.guardian_id === guardianId
    );
    this.store.student_guardians = this.store.student_guardians.filter(
      (sg) => !(sg.student_id === studentId && sg.guardian_id === guardianId)
    );
    if (actor) {
      this.logAudit(actor.id, actor.name, 'GUARDIAN_UNLINKED', 'Guardians', `Unlinked guardian from student`);
    }
    this.saveStore();
    if (this.mode === 'firebase') {
      removedLinks.forEach((link) => firebaseService.deleteStudentGuardian(link.id).catch(console.error));
    }
  }
}

export const db = new DatabaseRepository();

