import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { LoginPage } from './components/auth/LoginPage';
import { EnterpriseSetupPage } from './components/auth/EnterpriseSetupPage';
import { Sidebar, NavigationTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { GlobalSearchModal } from './components/search/GlobalSearchModal';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { UnauthorizedState } from './components/common/UnauthorizedState';

// Module Components
import { AdminDashboard } from './components/modules/dashboard/AdminDashboard';
import { TeacherDashboard } from './components/modules/dashboard/TeacherDashboard';
import { StaffDashboard } from './components/modules/dashboard/StaffDashboard';
import { StudentList } from './components/modules/students/StudentList';
import { StaffList } from './components/modules/staff/StaffList';
import { ClassManagement } from './components/modules/classes/ClassManagement';
import { TeacherMyClasses } from './components/modules/classes/TeacherMyClasses';
import { AcademicSessions } from './components/modules/academics/AcademicSessions';
import { AttendanceModule } from './components/modules/attendance/AttendanceModule';
import { AssessmentsModule } from './components/modules/assessments/AssessmentsModule';
import { ReportsModule } from './components/modules/reports/ReportsModule';
import { UserManagement } from './components/modules/users/UserManagement';
import { SettingsModule } from './components/modules/settings/SettingsModule';
import { TeacherProfile } from './components/modules/profile/TeacherProfile';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, needsEnterpriseSetup, isTeacher, isStaff, isSchoolAdmin, isSuperAdmin, can } = useAuth();

  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Drill-down target references for seamless cross-module workflows
  const [targetStudentId, setTargetStudentId] = useState<string | null>(null);
  const [targetStaffId, setTargetStaffId] = useState<string | null>(null);
  const [targetClassId, setTargetClassId] = useState<string | undefined>(undefined);
  const [targetAssessmentId, setTargetAssessmentId] = useState<string | undefined>(undefined);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner message="Verifying secure session..." size="lg" />
      </div>
    );
  }

  if (needsEnterpriseSetup) {
    return <EnterpriseSetupPage />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Drill-down navigation helpers
  const handleSelectStudent = (studentId: string) => {
    setTargetStudentId(studentId);
    setCurrentTab('students');
  };

  const handleSelectStaff = (staffId: string) => {
    setTargetStaffId(staffId);
    setCurrentTab('staff');
  };

  const handleSelectClass = (classId: string) => {
    setTargetClassId(classId);
    setCurrentTab('classes');
  };

  const handleSelectClassForAttendance = (classId: string) => {
    setTargetClassId(classId);
    setCurrentTab('attendance');
  };

  const handleSelectAssessment = (assessmentId: string) => {
    setTargetAssessmentId(assessmentId);
    setCurrentTab('assessments');
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          // reset transient drilldowns if navigating directly
          setTargetStudentId(null);
          setTargetStaffId(null);
        }}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          onOpenSearch={() => setIsSearchModalOpen(true)}
          onNavigateProfile={() => setCurrentTab('profile')}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* Protected Tab Routing with Role-Based Verification */}
          {currentTab === 'dashboard' && (
            isTeacher ? (
              <TeacherDashboard
                onNavigate={setCurrentTab}
                onSelectClass={handleSelectClassForAttendance}
                onSelectAssessment={handleSelectAssessment}
              />
            ) : isStaff ? (
              <StaffDashboard
                onNavigate={setCurrentTab}
                onSelectStudent={handleSelectStudent}
                onSelectStaff={handleSelectStaff}
              />
            ) : (
              <AdminDashboard
                onNavigate={setCurrentTab}
                onSelectStudent={handleSelectStudent}
                onSelectStaff={handleSelectStaff}
              />
            )
          )}

          {currentTab === 'students' && (
            can('view', 'students') ? (
              <StudentList
                initialSelectedStudentId={targetStudentId}
                onClearInitialStudent={() => setTargetStudentId(null)}
              />
            ) : (
              <UnauthorizedState
                moduleName="Student Records"
                requiredRole="Authorized School Staff or Administrator"
                onNavigateHome={() => setCurrentTab('dashboard')}
              />
            )
          )}

          {currentTab === 'staff' && (
            can('view', 'staff') ? (
              <StaffList
                initialSelectedStaffId={targetStaffId}
                onClearInitialStaff={() => setTargetStaffId(null)}
              />
            ) : (
              <UnauthorizedState
                moduleName="Staff Management & Directory"
                requiredRole="School Administrator or Operations Staff"
                onNavigateHome={() => setCurrentTab('dashboard')}
              />
            )
          )}

          {currentTab === 'classes' && (
            can('view', 'classes') ? (
              <ClassManagement
                onNavigate={setCurrentTab}
                onSelectStudent={handleSelectStudent}
              />
            ) : (
              <UnauthorizedState
                moduleName="Class Management"
                requiredRole="Administrator or Staff"
                onNavigateHome={() => setCurrentTab('dashboard')}
              />
            )
          )}

          {currentTab === 'my_classes' && (
            isTeacher ? (
              <TeacherMyClasses
                onNavigate={setCurrentTab}
                onSelectClassForAttendance={handleSelectClassForAttendance}
                onSelectStudent={handleSelectStudent}
              />
            ) : (
              <UnauthorizedState
                moduleName="Teacher Assigned Classes"
                requiredRole="Assigned Teaching Faculty"
                onNavigateHome={() => setCurrentTab('dashboard')}
              />
            )
          )}

          {currentTab === 'academic_sessions' && (
            can('view', 'academic_sessions') ? (
              <AcademicSessions />
            ) : (
              <UnauthorizedState
                moduleName="Academic Sessions & Terms"
                requiredRole="School Administrator"
                onNavigateHome={() => setCurrentTab('dashboard')}
              />
            )
          )}

          {currentTab === 'attendance' && (
            can('view', 'attendance') ? (
              <AttendanceModule initialClassId={targetClassId} />
            ) : (
              <UnauthorizedState
                moduleName="Attendance Records"
                requiredRole="Assigned Teacher or Administrator"
                onNavigateHome={() => setCurrentTab('dashboard')}
              />
            )
          )}

          {currentTab === 'assessments' && (
            can('view', 'assessments') ? (
              <AssessmentsModule initialAssessmentId={targetAssessmentId} />
            ) : (
              <UnauthorizedState
                moduleName="Assessments & Grades"
                requiredRole="Teacher or Administrator"
                onNavigateHome={() => setCurrentTab('dashboard')}
              />
            )
          )}

          {currentTab === 'reports' && (
            can('view', 'reports') ? (
              <ReportsModule />
            ) : (
              <UnauthorizedState
                moduleName="Reports & Analytics"
                requiredRole="Administrator or Staff"
                onNavigateHome={() => setCurrentTab('dashboard')}
              />
            )
          )}

          {currentTab === 'users' && (
            (isSuperAdmin || isSchoolAdmin) ? (
              <UserManagement />
            ) : (
              <UnauthorizedState
                moduleName="System User Management"
                requiredRole="Administrator"
                onNavigateHome={() => setCurrentTab('dashboard')}
              />
            )
          )}

          {currentTab === 'settings' && (
            isSuperAdmin ? (
              <SettingsModule />
            ) : (
              <UnauthorizedState
                moduleName="System Administration & Settings"
                requiredRole="Super Administrator"
                onNavigateHome={() => setCurrentTab('dashboard')}
              />
            )
          )}

          {currentTab === 'profile' && <TeacherProfile />}
        </main>
      </div>

      {/* Cross-entity Global Search Dialog */}
      <GlobalSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelectStudent={handleSelectStudent}
        onSelectStaff={handleSelectStaff}
        onSelectClass={handleSelectClass}
        onSelectAssessment={handleSelectAssessment}
      />
    </div>
  );
};

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
