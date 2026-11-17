import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { User, Role, Staff, UserRole } from '../types';
import { db } from '../db/storage';
import { auth } from '../db/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';

export interface EnterpriseSetupInput {
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
}

interface AuthContextType {
  user: User | null;
  role: Role | null;
  staff: Staff | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  needsEnterpriseSetup: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  completeEnterpriseSetup: (input: EnterpriseSetupInput) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string, newPassword: string, verificationCodeOrStaffId?: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (newPassword: string, currentPassword?: string) => Promise<{ success: boolean; error?: string }>;
  can: (action: 'view' | 'create' | 'edit' | 'delete' | 'manage', module: string) => boolean;
  isSuperAdmin: boolean;
  isSchoolAdmin: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  isStaff: boolean;
  authorizedClassIds: string[];
  isClassAuthorized: (classId: string) => boolean;
  isStudentAuthorized: (studentId: string) => boolean;
  isAssessmentAuthorized: (assessmentId: string) => boolean;
  refreshAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'edutrack_session_user_id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dbReady, setDbReady] = useState<boolean>(false);
  const [syncVersion, setSyncVersion] = useState<number>(0);

  const userRef = useRef<User | null>(null);
  userRef.current = user;

  const syncAppUserSession = useCallback((userIdOrEmail?: string) => {
    let foundUser: User | undefined;

    if (userIdOrEmail) {
      if (userIdOrEmail.includes('@')) {
        foundUser = db.getUserByEmail(userIdOrEmail);
      } else {
        foundUser = db.getUserById(userIdOrEmail);
      }
    }

    if (!foundUser) {
      const savedId = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedId) {
        foundUser = db.getUserById(savedId);
      }
    }

    if (foundUser && foundUser.is_active) {
      const foundRole = db.getRoles().find((r) => r.id === foundUser?.role_id) || null;
      const foundStaff = foundUser.staff_id ? db.getStaffById(foundUser.staff_id) || null : null;
      setUser(foundUser);
      setRole(foundRole);
      setStaff(foundStaff);
      localStorage.setItem(AUTH_STORAGE_KEY, foundUser.id);
    } else {
      setUser(null);
      setRole(null);
      setStaff(null);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let latestFbUser: FirebaseUser | null = null;
    let unsubscribeAuth: (() => void) | undefined;

    const unsubscribeDb = db.onSync(() => {
      if (!isMounted) return;
      setSyncVersion((v) => v + 1);
      if (userRef.current) {
        syncAppUserSession(userRef.current.id);
      }
    });

    const bootstrap = async () => {
      await db.waitForReady();
      if (!isMounted) return;
      setDbReady(true);

      unsubscribeAuth = onAuthStateChanged(auth, (fbUser) => {
        if (!isMounted) return;
        latestFbUser = fbUser;
        setFirebaseUser(fbUser);
        if (fbUser && fbUser.email) {
          syncAppUserSession(fbUser.email);
        } else {
          const savedId = localStorage.getItem(AUTH_STORAGE_KEY);
          if (savedId) {
            syncAppUserSession(savedId);
          } else {
            setUser(null);
            setRole(null);
            setStaff(null);
          }
        }
        setIsLoading(false);
      });

      // Hydrate session immediately if a saved session exists while auth initializes
      const savedId = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedId) {
        syncAppUserSession(savedId);
      } else if (!latestFbUser) {
        setIsLoading(false);
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
      unsubscribeDb();
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, [syncAppUserSession]);

  const refreshAuth = useCallback(() => {
    if (userRef.current) {
      syncAppUserSession(userRef.current.id);
    } else {
      syncAppUserSession();
    }
  }, [syncAppUserSession]);

  const needsEnterpriseSetup = useMemo(() => {
    if (!dbReady || isLoading) return false;
    return db.getUsers().length === 0;
  }, [dbReady, isLoading, syncVersion]);

  const completeEnterpriseSetup = async (
    input: EnterpriseSetupInput
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const { adminUser } = await db.initializeEnterprise(input);
      const cleanEmail = adminUser.email;
      const enteredPass = input.adminPassword.trim();

      try {
        await createUserWithEmailAndPassword(auth, cleanEmail, enteredPass);
      } catch (authErr: any) {
        if (authErr?.code === 'auth/email-already-in-use') {
          try {
            await signInWithEmailAndPassword(auth, cleanEmail, enteredPass);
          } catch {
            // Repository session remains active
          }
        }
      }

      const now = new Date().toISOString();
      db.updateUser(adminUser.id, { last_login: now, last_login_at: now });
      syncAppUserSession(adminUser.id);
      setSyncVersion((v) => v + 1);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to initialize institution workspace.' };
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const enteredPass = password ? password.trim() : '';

    const found = db.getUserByEmail(cleanEmail);
    if (!found) {
      setIsLoading(false);
      return { success: false, error: 'Account with this email address was not found in the directory.' };
    }

    if (!found.is_active) {
      setIsLoading(false);
      return { success: false, error: 'This user account is currently deactivated. Please contact the Super Administrator.' };
    }

    const expectedPassword = found.password || db.getUserPassword(cleanEmail);
    if (!expectedPassword || enteredPass !== expectedPassword) {
      setIsLoading(false);
      return {
        success: false,
        error: 'Incorrect password entered. Please check your credentials or click "Forgot password?" to reset it.',
      };
    }

    try {
      try {
        await signInWithEmailAndPassword(auth, cleanEmail, enteredPass);
      } catch (authErr: any) {
        if (
          authErr.code === 'auth/user-not-found' ||
          authErr.code === 'auth/invalid-credential' ||
          authErr.code === 'auth/invalid-email'
        ) {
          try {
            await createUserWithEmailAndPassword(auth, cleanEmail, enteredPass);
          } catch {
            // Proceed with synchronized database session
          }
        }
      }

      const now = new Date().toISOString();
      db.updateUser(found.id, { last_login: now, last_login_at: now });
      syncAppUserSession(found.id);
      return { success: true };
    } catch (err: any) {
      console.warn('Auth fallback to repository session:', err);
      const now = new Date().toISOString();
      db.updateUser(found.id, { last_login: now, last_login_at: now });
      syncAppUserSession(found.id);
      return { success: true };
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (
    email: string,
    newPassword: string,
    verificationCodeOrStaffId?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const found = db.getUserByEmail(cleanEmail);
    if (!found) {
      return { success: false, error: 'No account found with this email address.' };
    }

    if (verificationCodeOrStaffId) {
      const verifyResult = db.verifyIdentityForPasswordReset(cleanEmail, verificationCodeOrStaffId);
      if (!verifyResult.success) {
        return { success: false, error: verifyResult.error || 'Identity verification failed.' };
      }
    }

    const res = db.resetUserPassword(cleanEmail, newPassword);
    if (!res.success) {
      return { success: false, error: res.error };
    }

    return { success: true };
  };

  const changePassword = async (
    newPassword: string,
    currentPassword?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'You must be logged in to change your password.' };
    }

    if (currentPassword !== undefined && currentPassword.trim() !== '') {
      const activePass = user.password || db.getUserPassword(user.email);
      if (currentPassword.trim() !== activePass.trim()) {
        return { success: false, error: 'The current password you entered is incorrect.' };
      }
    }

    const res = db.resetUserPassword(user.email, newPassword, { id: user.id, name: user.full_name });
    if (!res.success) {
      return { success: false, error: res.error };
    }

    const updatedUser = db.getUserById(user.id);
    if (updatedUser) {
      setUser(updatedUser);
    }

    return { success: true };
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Firebase sign out warning:', e);
    }
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
    setRole(null);
    setStaff(null);
    setFirebaseUser(null);
    setSyncVersion((v) => v + 1);
  };

  const roleName = (role?.name || user?.role) as UserRole | undefined;

  const isSuperAdmin = roleName === 'super_admin';
  const isSchoolAdmin = roleName === 'school_admin';
  const isAdmin = isSuperAdmin || isSchoolAdmin;
  const isTeacher = roleName === 'teacher';
  const isStaff = roleName === 'staff';

  // Compute authorized class IDs for the current user session
  const authorizedClassIds = useMemo<string[]>(() => {
    if (!user) return [];
    if (isAdmin || isStaff) {
      return db.getClasses().map((c) => c.id);
    }
    if (isTeacher && staff) {
      return db.getClassesForTeacher(staff.id).map((c) => c.id);
    }
    return [];
  }, [user, isAdmin, isStaff, isTeacher, staff, syncVersion]);

  // Authorization verification helpers
  const isClassAuthorized = useCallback(
    (classId: string): boolean => {
      if (isAdmin || isStaff) return true;
      if (isTeacher && staff) {
        return authorizedClassIds.includes(classId);
      }
      return false;
    },
    [isAdmin, isStaff, isTeacher, staff, authorizedClassIds]
  );

  const isStudentAuthorized = useCallback(
    (studentId: string): boolean => {
      if (isAdmin || isStaff) return true;
      if (isTeacher) {
        const student = db.getStudentById(studentId);
        if (!student) return false;
        return authorizedClassIds.includes(student.current_class_id);
      }
      return false;
    },
    [isAdmin, isStaff, isTeacher, authorizedClassIds]
  );

  const isAssessmentAuthorized = useCallback(
    (assessmentId: string): boolean => {
      if (isAdmin) return true;
      if (isStaff) return true;
      if (isTeacher && staff) {
        const assessment = db.getAssessmentById(assessmentId);
        if (!assessment) return false;
        return authorizedClassIds.includes(assessment.class_id);
      }
      return false;
    },
    [isAdmin, isStaff, isTeacher, staff, authorizedClassIds]
  );

  const can = (action: 'view' | 'create' | 'edit' | 'delete' | 'manage', module: string): boolean => {
    if (!roleName) return false;
    if (isSuperAdmin) return true;

    switch (module.toLowerCase()) {
      case 'dashboard':
        return true;

      case 'students':
        if (isSchoolAdmin) return true;
        if (isStaff) return action === 'view';
        if (isTeacher) return action === 'view';
        return false;

      case 'staff':
        if (isSchoolAdmin) return true;
        if (isStaff) return action === 'view';
        return false;

      case 'classes':
        if (isSchoolAdmin) return true;
        if (isTeacher) return action === 'view';
        if (isStaff) return action === 'view';
        return false;

      case 'academic_sessions':
      case 'terms':
      case 'subjects':
        if (isSchoolAdmin) return true;
        if (isTeacher || isStaff) return action === 'view';
        return false;

      case 'attendance':
        if (isSchoolAdmin) return true;
        if (isTeacher) return action === 'view' || action === 'create' || action === 'edit';
        if (isStaff) return action === 'view';
        return false;

      case 'assessments':
        if (isSchoolAdmin) return true;
        if (isTeacher) return action === 'view' || action === 'create' || action === 'edit';
        if (isStaff) return action === 'view';
        return false;

      case 'reports':
        if (isSchoolAdmin || isStaff) return true;
        if (isTeacher) return action === 'view';
        return false;

      case 'users':
        return isSuperAdmin || isSchoolAdmin;

      case 'settings':
        return isSuperAdmin;

      default:
        return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        staff,
        firebaseUser,
        isAuthenticated: !!user,
        isLoading,
        needsEnterpriseSetup,
        login,
        completeEnterpriseSetup,
        logout,
        resetPassword,
        changePassword,
        can,
        isSuperAdmin,
        isSchoolAdmin,
        isAdmin,
        isTeacher,
        isStaff,
        authorizedClassIds,
        isClassAuthorized,
        isStudentAuthorized,
        isAssessmentAuthorized,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
