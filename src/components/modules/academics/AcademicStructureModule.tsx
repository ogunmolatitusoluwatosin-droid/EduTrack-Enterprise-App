import React, { useState, useEffect } from 'react';
import { db } from '../../../db/storage';
import { useAuth } from '../../../context/AuthContext';
import { PageHeader } from '../../layout/PageHeader';
import { AcademicSessionsTab } from './AcademicSessionsTab';
import { TermsTab } from './TermsTab';
import { ClassesTab } from './ClassesTab';
import { SubjectsTab } from './SubjectsTab';
import { TeacherAssignmentsTab } from './TeacherAssignmentsTab';
import { ClassSubjectsTab } from './ClassSubjectsTab';
import {
  CalendarDays,
  Layers,
  Building2,
  BookOpen,
  UserCheck,
  GraduationCap,
  Calendar,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export type AcademicSubTab =
  | 'sessions'
  | 'terms'
  | 'classes'
  | 'subjects'
  | 'teacher_assignments'
  | 'class_subjects';

interface AcademicStructureModuleProps {
  initialTab?: AcademicSubTab;
  onSelectStudent?: (studentId: string) => void;
  onNavigateParent?: (tab: string) => void;
}

export const AcademicStructureModule: React.FC<AcademicStructureModuleProps> = ({
  initialTab = 'sessions',
  onSelectStudent,
  onNavigateParent,
}) => {
  const { isSchoolAdmin, isSuperAdmin, isTeacher, isStaff } = useAuth();
  const [activeTab, setActiveTab] = useState<AcademicSubTab>(initialTab);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [drilldownExtra, setDrilldownExtra] = useState<any>(null);

  // Sync if initialTab changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const activeSession = db.getActiveSession();
  const activeTerm = db.getActiveTerm();
  const classesCount = db.getClasses().length;
  const subjectsCount = db.getSubjects().length;
  const teacherAssignmentsCount = db.getTeacherAssignments().length;

  const handleNavigateSubTab = (tab: string, extra?: any) => {
    setActiveTab(tab as AcademicSubTab);
    if (extra) {
      setDrilldownExtra(extra);
    }
  };

  const navTabs = [
    {
      id: 'sessions' as AcademicSubTab,
      label: 'Academic Sessions',
      icon: CalendarDays,
      count: db.getAcademicSessions().length,
    },
    {
      id: 'terms' as AcademicSubTab,
      label: 'Terms & Semesters',
      icon: Layers,
      count: db.getTerms().length,
    },
    {
      id: 'classes' as AcademicSubTab,
      label: 'Classes & Arms',
      icon: Building2,
      count: classesCount,
    },
    {
      id: 'subjects' as AcademicSubTab,
      label: 'Subjects Catalog',
      icon: BookOpen,
      count: subjectsCount,
    },
    {
      id: 'teacher_assignments' as AcademicSubTab,
      label: 'Teacher-Class Assignments',
      icon: UserCheck,
      count: teacherAssignmentsCount,
    },
    {
      id: 'class_subjects' as AcademicSubTab,
      label: 'Class-Subject Curriculum',
      icon: GraduationCap,
      count: db.getClassSubjects().length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Academic Structure & Curriculum"
        subtitle="Manage academic years, terms, classes, subjects catalog, and faculty-to-class workload allocations."
      >
        <div className="flex items-center gap-2 flex-wrap">
          {activeSession && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100/80">
              <Calendar className="w-3.5 h-3.5" />
              <span>Active Session: {activeSession.name}</span>
            </div>
          )}
          {activeTerm && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100/80">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Current Term: {activeTerm.name}</span>
            </div>
          )}
        </div>
      </PageHeader>

      {/* Sub-Navigation Tabs */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setDrilldownExtra(null);
                }}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition select-none ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-blue-700/80 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Display */}
      <div>
        {activeTab === 'sessions' && (
          <AcademicSessionsTab
            onSelectSession={(sessionId) => setSelectedSessionId(sessionId)}
            onNavigateTab={handleNavigateSubTab}
          />
        )}

        {activeTab === 'terms' && (
          <TermsTab initialSessionId={selectedSessionId || activeSession?.id} />
        )}

        {activeTab === 'classes' && (
          <ClassesTab
            initialSessionId={selectedSessionId || activeSession?.id}
            onNavigateTab={handleNavigateSubTab}
            onSelectStudent={onSelectStudent}
          />
        )}

        {activeTab === 'subjects' && (
          <SubjectsTab onNavigateTab={handleNavigateSubTab} />
        )}

        {activeTab === 'teacher_assignments' && (
          <TeacherAssignmentsTab
            initialSessionId={selectedSessionId || activeSession?.id}
            initialClassId={drilldownExtra?.classId}
            initialTeacherId={drilldownExtra?.teacherId}
          />
        )}

        {activeTab === 'class_subjects' && (
          <ClassSubjectsTab
            initialSessionId={selectedSessionId || activeSession?.id}
            initialClassId={drilldownExtra?.classId}
            initialSubjectId={drilldownExtra?.subjectId}
          />
        )}
      </div>
    </div>
  );
};
