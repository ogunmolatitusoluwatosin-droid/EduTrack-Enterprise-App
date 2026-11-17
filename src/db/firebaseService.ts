// Firebase Repository Service Layer for EduTrack School Management System
import {
  collection,
  doc,
  getDocs,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { auth, firestore, storage } from './firebase';
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
} from '../types';
import {
  INITIAL_ROLES,
  INITIAL_SETTINGS,
  LEGACY_DEMO_SCHOOL_NAME,
  LEGACY_DEMO_USER_IDS,
} from './initialData';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function generateUUID(): string {
  return 'id_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
}

const ENTERPRISE_COLLECTIONS = [
  'users',
  'staff',
  'students',
  'guardians',
  'student_guardians',
  'academic_sessions',
  'terms',
  'classes',
  'teacher_class_assignments',
  'subjects',
  'class_subjects',
  'attendance',
  'assessments',
  'assessment_scores',
  'audit_logs',
  'settings',
];

export class FirebaseService {
  private isInitialized = false;

  async testConnection(): Promise<void> {
    try {
      await getDocFromServer(doc(firestore, 'test', 'connection'));
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.error('Please check your Firebase configuration.');
      }
    }
  }

  // Initialize structural roles and purge legacy demo data if present
  async initializeCleanDatabase(): Promise<{ purgedLegacyDemo: boolean }> {
    if (this.isInitialized) return { purgedLegacyDemo: false };

    let purgedLegacyDemo = false;

    try {
      await this.testConnection();

      // 1. Ensure system RBAC roles exist
      const rolesSnap = await getDocs(collection(firestore, 'roles'));
      if (rolesSnap.empty) {
        const batch = writeBatch(firestore);
        for (const r of INITIAL_ROLES) {
          batch.set(doc(firestore, 'roles', r.id), r);
        }
        await batch.commit();
      }

      // 2. Check if legacy pre-filled demo data is still sitting in Firestore
      const settingsSnap = await getDoc(doc(firestore, 'settings', 'global'));
      const usersSnap = await getDocs(collection(firestore, 'users'));

      const settingsData = settingsSnap.exists() ? (settingsSnap.data() as Partial<SchoolSettings>) : null;
      const isLegacySettings = settingsData?.school_name === LEGACY_DEMO_SCHOOL_NAME;

      const userIds = usersSnap.docs.map((d) => d.id);
      const onlyLegacyUsers =
        userIds.length > 0 && userIds.every((id) => LEGACY_DEMO_USER_IDS.includes(id));

      if (isLegacySettings || (onlyLegacyUsers && !settingsData?.school_name)) {
        await this.clearAllEnterpriseData();
        purgedLegacyDemo = true;
      }

      this.isInitialized = true;
    } catch (err: any) {
      if (
        err?.code === 'unavailable' ||
        err?.message?.includes('offline') ||
        err?.message?.includes('network')
      ) {
        console.warn('Firestore is running in offline cache mode.');
      } else {
        console.warn('Firebase clean initialization note:', err);
      }
      this.isInitialized = true;
    }

    return { purgedLegacyDemo };
  }

  // Backward-compatible signature if invoked anywhere
  async initializeAndSeed(_forceSeed = false): Promise<void> {
    await this.initializeCleanDatabase();
  }

  // Wipe all enterprise data collections from Firestore (retaining system RBAC roles)
  async clearAllEnterpriseData(): Promise<void> {
    try {
      for (const colName of ENTERPRISE_COLLECTIONS) {
        const snap = await getDocs(collection(firestore, colName));
        if (snap.empty) continue;

        // Commit in chunks of 400 to stay safely below Firestore 500-op batch limit
        const docs = snap.docs;
        for (let i = 0; i < docs.length; i += 400) {
          const batch = writeBatch(firestore);
          const chunk = docs.slice(i, i + 400);
          chunk.forEach((docSnap) => batch.delete(docSnap.ref));
          await batch.commit();
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'enterprise_reset');
    }
  }

  // --- Real-time Listeners for reactive synchronization ---
  subscribeToCollection<T>(collectionName: string, onUpdate: (data: T[]) => void): Unsubscribe {
    try {
      const colRef = collection(firestore, collectionName);
      return onSnapshot(
        colRef,
        (snapshot) => {
          const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as T));
          onUpdate(items);
        },
        (error) => {
          if (error.code === 'unavailable' || error.message?.includes('offline')) {
            console.warn(`Firestore offline synchronization active for ${collectionName}`);
          } else {
            console.error(`Error in snapshot listener for ${collectionName}:`, error);
          }
        }
      );
    } catch {
      return () => {};
    }
  }

  subscribeToDocument<T>(
    collectionName: string,
    docId: string,
    onUpdate: (data: T | null) => void
  ): Unsubscribe {
    try {
      const docRef = doc(firestore, collectionName, docId);
      return onSnapshot(
        docRef,
        (docSnap) => {
          onUpdate(docSnap.exists() ? (docSnap.data() as T) : null);
        },
        (error) => {
          if (error.code === 'unavailable' || error.message?.includes('offline')) {
            console.warn(`Firestore offline synchronization active for ${collectionName}/${docId}`);
          } else {
            console.error(`Error in snapshot listener for ${collectionName}/${docId}:`, error);
          }
        }
      );
    } catch {
      return () => {};
    }
  }

  // --- STUDENTS MODULE ---
  async getStudents(): Promise<Student[]> {
    try {
      const snap = await getDocs(collection(firestore, 'students'));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Student));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'students');
    }
  }

  async getStudentById(id: string): Promise<Student | null> {
    try {
      const snap = await getDoc(doc(firestore, 'students', id));
      return snap.exists() ? ({ id: snap.id, ...snap.data() } as Student) : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `students/${id}`);
    }
  }

  async addStudent(
    data: Omit<Student, 'id' | 'created_at' | 'updated_at'> & {
      id?: string;
      created_at?: string;
      updated_at?: string;
    }
  ): Promise<Student> {
    const id = data.id || generateUUID();
    const now = new Date().toISOString();
    const newStudent: Student = {
      ...data,
      id,
      created_at: data.created_at || now,
      updated_at: data.updated_at || now,
    } as Student;
    try {
      await setDoc(doc(firestore, 'students', id), newStudent);
      return newStudent;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `students/${id}`);
    }
  }

  async updateStudent(id: string, updates: Partial<Student>): Promise<Student | null> {
    const now = new Date().toISOString();
    const docRef = doc(firestore, 'students', id);
    try {
      const existing = await getDoc(docRef);
      if (!existing.exists()) return null;

      const merged = { ...existing.data(), ...updates, updated_at: now } as Student;
      await updateDoc(docRef, { ...updates, updated_at: now });
      return merged;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `students/${id}`);
    }
  }

  async deleteStudent(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(firestore, 'students', id));
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `students/${id}`);
    }
  }

  async getStudentsByClass(classId: string, status?: string): Promise<Student[]> {
    let q = query(collection(firestore, 'students'), where('current_class_id', '==', classId));
    if (status) {
      q = query(
        collection(firestore, 'students'),
        where('current_class_id', '==', classId),
        where('student_status', '==', status)
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Student));
  }

  async getStudentByAdmissionNumber(admissionNumber: string): Promise<Student | null> {
    const q = query(collection(firestore, 'students'), where('admission_number', '==', admissionNumber.trim()));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as Student;
  }

  // --- STAFF MODULE ---
  async getStaff(): Promise<Staff[]> {
    const snap = await getDocs(collection(firestore, 'staff'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Staff));
  }

  async getStaffById(id: string): Promise<Staff | null> {
    const snap = await getDoc(doc(firestore, 'staff', id));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Staff) : null;
  }

  async addStaff(
    data: Omit<Staff, 'id' | 'created_at' | 'updated_at'> & {
      id?: string;
      created_at?: string;
      updated_at?: string;
    }
  ): Promise<Staff> {
    const id = data.id || generateUUID();
    const now = new Date().toISOString();
    const newStaff: Staff = {
      ...data,
      id,
      created_at: data.created_at || now,
      updated_at: data.updated_at || now,
    } as Staff;
    try {
      await setDoc(doc(firestore, 'staff', id), newStaff);
      return newStaff;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `staff/${id}`);
    }
  }

  async updateStaff(id: string, updates: Partial<Staff>): Promise<Staff | null> {
    const now = new Date().toISOString();
    const docRef = doc(firestore, 'staff', id);
    try {
      const existing = await getDoc(docRef);
      if (!existing.exists()) return null;

      const merged = { ...existing.data(), ...updates, updated_at: now } as Staff;
      await updateDoc(docRef, { ...updates, updated_at: now });
      return merged;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `staff/${id}`);
    }
  }

  async deleteStaff(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(firestore, 'staff', id));
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `staff/${id}`);
    }
  }

  async getStaffByDepartment(department: string, status?: string): Promise<Staff[]> {
    let q = query(collection(firestore, 'staff'), where('department', '==', department));
    if (status) {
      q = query(
        collection(firestore, 'staff'),
        where('department', '==', department),
        where('employment_status', '==', status)
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Staff));
  }

  async getStaffByCode(staffCode: string): Promise<Staff | null> {
    const q = query(collection(firestore, 'staff'), where('staff_code', '==', staffCode.trim()));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as Staff;
  }

  // --- CLASSES MODULE ---
  async getClasses(): Promise<SchoolClass[]> {
    const snap = await getDocs(collection(firestore, 'classes'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SchoolClass));
  }

  async getClassById(id: string): Promise<SchoolClass | null> {
    const snap = await getDoc(doc(firestore, 'classes', id));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as SchoolClass) : null;
  }

  async addClass(
    data: Omit<SchoolClass, 'id' | 'created_at' | 'updated_at'> & {
      id?: string;
      created_at?: string;
      updated_at?: string;
    }
  ): Promise<SchoolClass> {
    const id = data.id || generateUUID();
    const now = new Date().toISOString();
    const newClass: SchoolClass = {
      ...data,
      id,
      created_at: data.created_at || now,
      updated_at: data.updated_at || now,
    } as SchoolClass;
    try {
      await setDoc(doc(firestore, 'classes', id), newClass);
      return newClass;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `classes/${id}`);
    }
  }

  async updateClass(id: string, updates: Partial<SchoolClass>): Promise<SchoolClass | null> {
    const now = new Date().toISOString();
    const docRef = doc(firestore, 'classes', id);
    try {
      const existing = await getDoc(docRef);
      if (!existing.exists()) return null;

      const merged = { ...existing.data(), ...updates, updated_at: now } as SchoolClass;
      await updateDoc(docRef, { ...updates, updated_at: now });
      return merged;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `classes/${id}`);
    }
  }

  async deleteClass(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(firestore, 'classes', id));
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `classes/${id}`);
    }
  }

  // --- ACADEMIC SESSIONS MODULE ---
  async getAcademicSessions(): Promise<AcademicSession[]> {
    const snap = await getDocs(collection(firestore, 'academic_sessions'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AcademicSession));
  }

  async addAcademicSession(
    data: Omit<AcademicSession, 'id' | 'created_at'> & { id?: string; created_at?: string }
  ): Promise<AcademicSession> {
    const id = data.id || generateUUID();
    const now = new Date().toISOString();
    const newSession: AcademicSession = {
      ...data,
      id,
      created_at: data.created_at || now,
    } as AcademicSession;
    try {
      await setDoc(doc(firestore, 'academic_sessions', id), newSession);
      return newSession;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `academic_sessions/${id}`);
    }
  }

  async updateAcademicSession(id: string, updates: Partial<AcademicSession>): Promise<AcademicSession | null> {
    const docRef = doc(firestore, 'academic_sessions', id);
    try {
      const existing = await getDoc(docRef);
      if (!existing.exists()) return null;

      const merged = { ...existing.data(), ...updates } as AcademicSession;
      await updateDoc(docRef, updates);
      return merged;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `academic_sessions/${id}`);
    }
  }

  async deleteAcademicSession(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(firestore, 'academic_sessions', id));
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `academic_sessions/${id}`);
    }
  }

  // --- TERMS MODULE ---
  async getTerms(): Promise<Term[]> {
    const snap = await getDocs(collection(firestore, 'terms'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Term));
  }

  async addTerm(data: Omit<Term, 'id'> & { id?: string }): Promise<Term> {
    const id = data.id || generateUUID();
    const newTerm: Term = {
      ...data,
      id,
    } as Term;
    try {
      await setDoc(doc(firestore, 'terms', id), newTerm);
      return newTerm;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `terms/${id}`);
    }
  }

  async updateTerm(id: string, updates: Partial<Term>): Promise<Term | null> {
    const docRef = doc(firestore, 'terms', id);
    try {
      const existing = await getDoc(docRef);
      if (!existing.exists()) return null;

      const merged = { ...existing.data(), ...updates } as Term;
      await updateDoc(docRef, updates);
      return merged;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `terms/${id}`);
    }
  }

  async deleteTerm(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(firestore, 'terms', id));
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `terms/${id}`);
    }
  }

  // --- SUBJECTS MODULE ---
  async getSubjects(): Promise<Subject[]> {
    const snap = await getDocs(collection(firestore, 'subjects'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Subject));
  }

  async addSubject(data: Omit<Subject, 'id' | 'created_at'> & { id?: string; created_at?: string }): Promise<Subject> {
    const id = data.id || generateUUID();
    const now = new Date().toISOString();
    const newSubject: Subject = {
      ...data,
      id,
      created_at: data.created_at || now,
    } as Subject;
    try {
      await setDoc(doc(firestore, 'subjects', id), newSubject);
      return newSubject;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `subjects/${id}`);
    }
  }

  async updateSubject(id: string, updates: Partial<Subject>): Promise<Subject | null> {
    const docRef = doc(firestore, 'subjects', id);
    try {
      const existing = await getDoc(docRef);
      if (!existing.exists()) return null;

      const merged = { ...existing.data(), ...updates } as Subject;
      await updateDoc(docRef, updates);
      return merged;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `subjects/${id}`);
    }
  }

  async deleteSubject(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(firestore, 'subjects', id));
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `subjects/${id}`);
    }
  }

  // --- CLASS SUBJECTS & TEACHER ASSIGNMENTS ---
  async getClassSubjects(): Promise<ClassSubject[]> {
    const snap = await getDocs(collection(firestore, 'class_subjects'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ClassSubject));
  }

  async addClassSubject(data: ClassSubject): Promise<ClassSubject> {
    try {
      await setDoc(doc(firestore, 'class_subjects', data.id), data);
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `class_subjects/${data.id}`);
    }
  }

  async updateClassSubject(id: string, updates: Partial<ClassSubject>): Promise<void> {
    try {
      await setDoc(doc(firestore, 'class_subjects', id), updates, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `class_subjects/${id}`);
    }
  }

  async deleteClassSubject(id: string): Promise<void> {
    try {
      await deleteDoc(doc(firestore, 'class_subjects', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `class_subjects/${id}`);
    }
  }

  async addTeacherAssignment(assignment: TeacherClassAssignment): Promise<TeacherClassAssignment> {
    try {
      await setDoc(doc(firestore, 'teacher_class_assignments', assignment.id), assignment);
      return assignment;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `teacher_class_assignments/${assignment.id}`);
    }
  }

  async deleteTeacherAssignment(id: string): Promise<void> {
    try {
      await deleteDoc(doc(firestore, 'teacher_class_assignments', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `teacher_class_assignments/${id}`);
    }
  }

  // --- GUARDIANS MODULE ---
  async getGuardians(): Promise<Guardian[]> {
    const snap = await getDocs(collection(firestore, 'guardians'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Guardian));
  }

  async addGuardian(
    data: Omit<Guardian, 'id' | 'created_at' | 'updated_at'> & {
      id?: string;
      created_at?: string;
      updated_at?: string;
    }
  ): Promise<Guardian> {
    const id = data.id || generateUUID();
    const now = new Date().toISOString();
    const newGuardian: Guardian = {
      ...data,
      id,
      created_at: data.created_at || now,
      updated_at: data.updated_at || now,
    } as Guardian;
    try {
      await setDoc(doc(firestore, 'guardians', id), newGuardian);
      return newGuardian;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `guardians/${id}`);
    }
  }

  async updateGuardian(id: string, updates: Partial<Guardian>): Promise<Guardian | null> {
    const now = new Date().toISOString();
    const docRef = doc(firestore, 'guardians', id);
    try {
      const existing = await getDoc(docRef);
      if (!existing.exists()) return null;

      const merged = { ...existing.data(), ...updates, updated_at: now } as Guardian;
      await updateDoc(docRef, { ...updates, updated_at: now });
      return merged;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `guardians/${id}`);
    }
  }

  async deleteGuardian(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(firestore, 'guardians', id));
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `guardians/${id}`);
    }
  }

  async getStudentGuardians(): Promise<StudentGuardian[]> {
    const snap = await getDocs(collection(firestore, 'student_guardians'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as StudentGuardian));
  }

  async addStudentGuardian(link: StudentGuardian): Promise<void> {
    try {
      await setDoc(doc(firestore, 'student_guardians', link.id), link);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `student_guardians/${link.id}`);
    }
  }

  async deleteStudentGuardian(id: string): Promise<void> {
    try {
      await deleteDoc(doc(firestore, 'student_guardians', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `student_guardians/${id}`);
    }
  }

  // --- ATTENDANCE MODULE ---
  async getAllAttendance(): Promise<Attendance[]> {
    const snap = await getDocs(collection(firestore, 'attendance'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Attendance));
  }

  async getAttendanceForClassAndDate(classId: string, date: string): Promise<Attendance[]> {
    const q = query(
      collection(firestore, 'attendance'),
      where('class_id', '==', classId),
      where('attendance_date', '==', date)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Attendance));
  }

  async getAttendanceForStudent(studentId: string): Promise<Attendance[]> {
    const q = query(collection(firestore, 'attendance'), where('student_id', '==', studentId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Attendance));
  }

  async recordAttendance(
    records: Array<Omit<Attendance, 'id' | 'created_at' | 'updated_at'> & { id?: string }>
  ): Promise<Attendance[]> {
    const now = new Date().toISOString();
    const batch = writeBatch(firestore);
    const savedRecords: Attendance[] = [];

    for (const r of records) {
      const recordId = r.id || `att_${r.student_id}_${r.attendance_date}`;
      const fullRecord: Attendance = {
        ...r,
        id: recordId,
        created_at: now,
        updated_at: now,
      };
      batch.set(doc(firestore, 'attendance', recordId), fullRecord, { merge: true });
      savedRecords.push(fullRecord);
    }

    try {
      await batch.commit();
      return savedRecords;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'attendance');
    }
  }

  async deleteAttendanceForClassAndDate(classId: string, date: string): Promise<void> {
    const records = await this.getAttendanceForClassAndDate(classId, date);
    if (records.length === 0) return;
    const batch = writeBatch(firestore);
    for (const r of records) {
      batch.delete(doc(firestore, 'attendance', r.id));
    }
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'attendance');
    }
  }

  // --- ASSESSMENTS MODULE ---
  async getAssessments(): Promise<Assessment[]> {
    const snap = await getDocs(collection(firestore, 'assessments'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Assessment));
  }

  async getAssessmentById(id: string): Promise<Assessment | null> {
    const snap = await getDoc(doc(firestore, 'assessments', id));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Assessment) : null;
  }

  async addAssessment(
    data: Omit<Assessment, 'id' | 'created_at' | 'updated_at'> & {
      id?: string;
      created_at?: string;
      updated_at?: string;
    }
  ): Promise<Assessment> {
    const id = data.id || generateUUID();
    const now = new Date().toISOString();
    const newAssessment: Assessment = {
      ...data,
      id,
      created_at: data.created_at || now,
      updated_at: data.updated_at || now,
    } as Assessment;
    try {
      await setDoc(doc(firestore, 'assessments', id), newAssessment);
      return newAssessment;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `assessments/${id}`);
    }
  }

  async updateAssessment(id: string, updates: Partial<Assessment>): Promise<Assessment | null> {
    const now = new Date().toISOString();
    const docRef = doc(firestore, 'assessments', id);
    try {
      const existing = await getDoc(docRef);
      if (!existing.exists()) return null;

      const merged = { ...existing.data(), ...updates, updated_at: now } as Assessment;
      await updateDoc(docRef, { ...updates, updated_at: now });
      return merged;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `assessments/${id}`);
    }
  }

  async deleteAssessment(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(firestore, 'assessments', id));
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `assessments/${id}`);
    }
  }

  async getAssessmentsByFilter(filters: {
    classId?: string;
    subjectId?: string;
    sessionId?: string;
    termId?: string;
  }): Promise<Assessment[]> {
    const constraints = [];
    if (filters.classId && filters.classId !== 'ALL') {
      constraints.push(where('class_id', '==', filters.classId));
    }
    if (filters.subjectId && filters.subjectId !== 'ALL') {
      constraints.push(where('subject_id', '==', filters.subjectId));
    }
    if (filters.sessionId && filters.sessionId !== 'ALL') {
      constraints.push(where('academic_session_id', '==', filters.sessionId));
    }
    if (filters.termId && filters.termId !== 'ALL') {
      constraints.push(where('term_id', '==', filters.termId));
    }
    const colRef = collection(firestore, 'assessments');
    const q = constraints.length > 0 ? query(colRef, ...(constraints as [any, ...any[]])) : colRef;
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Assessment));
  }

  // --- ASSESSMENT SCORES ---
  async getScores(): Promise<AssessmentScore[]> {
    const snap = await getDocs(collection(firestore, 'assessment_scores'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AssessmentScore));
  }

  async getScoresForAssessment(assessmentId: string): Promise<AssessmentScore[]> {
    const q = query(collection(firestore, 'assessment_scores'), where('assessment_id', '==', assessmentId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AssessmentScore));
  }

  async getScoresForStudent(studentId: string): Promise<AssessmentScore[]> {
    const q = query(collection(firestore, 'assessment_scores'), where('student_id', '==', studentId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AssessmentScore));
  }

  async saveScores(
    assessmentId: string,
    scores: Array<{ student_id: string; score: number; feedback?: string; id?: string }>,
    recordedBy: string
  ): Promise<AssessmentScore[]> {
    const now = new Date().toISOString();
    const batch = writeBatch(firestore);
    const savedScores: AssessmentScore[] = [];

    for (const item of scores) {
      const scoreId = item.id || `sc_${assessmentId}_${item.student_id}`;
      const scoreObj: AssessmentScore = {
        id: scoreId,
        assessment_id: assessmentId,
        student_id: item.student_id,
        score: item.score,
        feedback: item.feedback || '',
        recorded_by: recordedBy,
        created_at: now,
        updated_at: now,
      };
      batch.set(doc(firestore, 'assessment_scores', scoreId), scoreObj, { merge: true });
      savedScores.push(scoreObj);
    }

    try {
      await batch.commit();
      return savedScores;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'assessment_scores');
    }
  }

  async deleteAssessmentScore(scoreId: string): Promise<boolean> {
    try {
      await deleteDoc(doc(firestore, 'assessment_scores', scoreId));
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `assessment_scores/${scoreId}`);
    }
  }

  // --- USERS & ROLES ---
  async getUsers(): Promise<User[]> {
    const snap = await getDocs(collection(firestore, 'users'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as User));
  }

  async getUserById(id: string): Promise<User | null> {
    const snap = await getDoc(doc(firestore, 'users', id));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as User) : null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const q = query(collection(firestore, 'users'), where('email', '==', email.toLowerCase().trim()));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as User;
  }

  async addUser(user: User): Promise<User> {
    try {
      await setDoc(doc(firestore, 'users', user.id), user);
      return user;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.id}`);
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const now = new Date().toISOString();
    const docRef = doc(firestore, 'users', id);
    try {
      const existing = await getDoc(docRef);
      if (!existing.exists()) return null;

      const merged = { ...existing.data(), ...updates, updated_at: now } as User;
      await updateDoc(docRef, { ...updates, updated_at: now });
      return merged;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${id}`);
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(firestore, 'users', id));
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
    }
  }

  async getRoles(): Promise<Role[]> {
    const snap = await getDocs(collection(firestore, 'roles'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Role));
  }

  // --- TEACHER CLASS ASSIGNMENTS ---
  async getTeacherClassAssignments(): Promise<TeacherClassAssignment[]> {
    const snap = await getDocs(collection(firestore, 'teacher_class_assignments'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TeacherClassAssignment));
  }

  async getAssignmentsForTeacher(teacherStaffId: string): Promise<TeacherClassAssignment[]> {
    const q = query(
      collection(firestore, 'teacher_class_assignments'),
      where('teacher_id', '==', teacherStaffId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TeacherClassAssignment));
  }

  async getClassSubjectsForTeacher(teacherStaffId: string): Promise<ClassSubject[]> {
    const q = query(collection(firestore, 'class_subjects'), where('teacher_id', '==', teacherStaffId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ClassSubject));
  }

  async assignTeacherToClass(
    assignment: Omit<TeacherClassAssignment, 'id' | 'created_at'>
  ): Promise<TeacherClassAssignment> {
    const id = generateUUID();
    const newAssignment: TeacherClassAssignment = {
      id,
      ...assignment,
      created_at: new Date().toISOString(),
    };
    await setDoc(doc(firestore, 'teacher_class_assignments', id), newAssignment);
    return newAssignment;
  }

  // --- SETTINGS & AUDIT LOGS ---
  async getSettings(): Promise<SchoolSettings> {
    const snap = await getDoc(doc(firestore, 'settings', 'global'));
    return snap.exists() ? (snap.data() as SchoolSettings) : { ...INITIAL_SETTINGS };
  }

  async updateSettings(updates: Partial<SchoolSettings>): Promise<SchoolSettings> {
    const docRef = doc(firestore, 'settings', 'global');
    try {
      const existing = await getDoc(docRef);
      const merged = { ...(existing.exists() ? existing.data() : INITIAL_SETTINGS), ...updates } as SchoolSettings;
      await setDoc(docRef, merged);
      return merged;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/global');
    }
  }

  async addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    const id = generateUUID();
    const newLog: AuditLog = {
      id,
      ...log,
      timestamp: new Date().toISOString(),
    };
    try {
      await setDoc(doc(firestore, 'audit_logs', id), newLog);
      return newLog;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `audit_logs/${id}`);
    }
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    const snap = await getDocs(collection(firestore, 'audit_logs'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLog));
  }

  // --- FIREBASE STORAGE: PROFILE PHOTO UPLOADS ---
  async uploadProfilePhoto(file: File, path: string): Promise<string> {
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, file);
    const downloadUrl = await getDownloadURL(fileRef);
    return downloadUrl;
  }
}

export const firebaseService = new FirebaseService();
