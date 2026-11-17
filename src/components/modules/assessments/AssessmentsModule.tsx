import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../../../db/storage';
import { useAuth } from '../../../context/AuthContext';
import { Assessment, SchoolClass, Student } from '../../../types';
import { PageHeader } from '../../layout/PageHeader';
import { GradebookTab } from './GradebookTab';
import { AssessmentHistoryTab } from './AssessmentHistoryTab';
import { StudentAssessmentHistoryTab } from './StudentAssessmentHistoryTab';
import { AssessmentAnalyticsTab } from './AssessmentAnalyticsTab';
import { CreateAssessmentModal } from './CreateAssessmentModal';
import { StudentAssessmentModal } from './StudentAssessmentModal';
import {
  FileSpreadsheet,
  Plus,
  History,
  Users,
  BarChart3,
  Award,
  BookOpen,
  AlertCircle,
} from 'lucide-react';

interface AssessmentsModuleProps {
  initialAssessmentId?: string;
}

export const AssessmentsModule: React.FC<AssessmentsModuleProps> = ({
  initialAssessmentId,
}) => {
  const { user, staff, isTeacher, isSchoolAdmin, isSuperAdmin } = useAuth();

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const handleRefresh = () => setRefreshTrigger((p) => p + 1);

  // Active Tab: 'gradebook' | 'history' | 'students' | 'analytics'
  const [activeTab, setActiveTab] = useState<'gradebook' | 'history' | 'students' | 'analytics'>('gradebook');

  // Teacher Access Scoping: Determine classes accessible by this user
  const availableClasses: SchoolClass[] = useMemo(() => {
    const allClasses = db.getClasses();
    if (isTeacher && staff && !isSchoolAdmin && !isSuperAdmin) {
      const assigned = db.getClassesForTeacher(staff.id);
      return assigned;
    }
    return allClasses;
  }, [isTeacher, staff, isSchoolAdmin, isSuperAdmin, refreshTrigger]);

  // Selected state for Gradebook
  const [selectedClassId, setSelectedClassId] = useState<string>(
    availableClasses[0]?.id || ''
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>(
    initialAssessmentId || ''
  );

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [studentForModal, setStudentForModal] = useState<Student | null>(null);

  // Sync available class if selection is invalid
  useEffect(() => {
    if (availableClasses.length > 0) {
      if (!availableClasses.some((c) => c.id === selectedClassId)) {
        setSelectedClassId(availableClasses[0].id);
      }
    } else {
      setSelectedClassId('');
    }
  }, [availableClasses, selectedClassId]);

  // If initialAssessmentId was provided, jump directly to Gradebook
  useEffect(() => {
    if (initialAssessmentId) {
      const targetAssessment = db.getAssessmentById(initialAssessmentId);
      if (targetAssessment) {
        setSelectedClassId(targetAssessment.class_id);
        setSelectedSubjectId(targetAssessment.subject_id);
        setSelectedAssessmentId(targetAssessment.id);
        setActiveTab('gradebook');
      }
    }
  }, [initialAssessmentId]);

  // When a new assessment is created from modal
  const handleAssessmentCreated = (assessment: Assessment) => {
    setSelectedClassId(assessment.class_id);
    setSelectedSubjectId(assessment.subject_id);
    setSelectedAssessmentId(assessment.id);
    setActiveTab('gradebook');
    handleRefresh();
  };

  // When user clicks "Scores" from the History table
  const handleOpenAssessmentScores = (assessment: Assessment) => {
    setSelectedClassId(assessment.class_id);
    setSelectedSubjectId(assessment.subject_id);
    setSelectedAssessmentId(assessment.id);
    setActiveTab('gradebook');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Student Assessment & Gradebook"
        subtitle="Create assessments, enter and validate student scores, track performance metrics, and review student assessment history."
        icon={FileSpreadsheet}
        actionLabel="Create Assessment"
        actionIcon={Plus}
        onAction={() => setIsCreateModalOpen(true)}
        badgeText={
          isTeacher && !isSchoolAdmin && !isSuperAdmin
            ? 'Teacher Access'
            : 'Administrative Access'
        }
      />

      {/* Role Scoping Warning Notice (if teacher has no classes assigned) */}
      {isTeacher && !isSchoolAdmin && !isSuperAdmin && availableClasses.length === 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-800 text-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="font-bold text-amber-900 block text-sm">
              No Assigned Classes or Subjects Found
            </strong>
            <p>
              Your staff account ({staff?.first_name} {staff?.last_name}) has not been allocated as a teacher or subject instructor to any class yet. Please contact the school administrator to assign your class schedules.
            </p>
          </div>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('gradebook')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'gradebook'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Score Entry Gradebook</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Assessment History</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('students')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'students'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Student Performance Profiles</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'analytics'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Analytics & Rankings</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'gradebook' && (
        <GradebookTab
          availableClasses={availableClasses}
          selectedClassId={selectedClassId}
          onSelectClassId={setSelectedClassId}
          selectedSubjectId={selectedSubjectId}
          onSelectSubjectId={setSelectedSubjectId}
          selectedAssessmentId={selectedAssessmentId}
          onSelectAssessmentId={setSelectedAssessmentId}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onOpenStudentModal={(student) => setStudentForModal(student)}
        />
      )}

      {activeTab === 'history' && (
        <AssessmentHistoryTab
          availableClasses={availableClasses}
          onOpenAssessmentScores={handleOpenAssessmentScores}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          refreshTrigger={refreshTrigger}
          onRefresh={handleRefresh}
        />
      )}

      {activeTab === 'students' && (
        <StudentAssessmentHistoryTab
          availableClasses={availableClasses}
          onOpenStudentModal={(student) => setStudentForModal(student)}
        />
      )}

      {activeTab === 'analytics' && (
        <AssessmentAnalyticsTab
          availableClasses={availableClasses}
          onOpenStudentModal={(student) => setStudentForModal(student)}
        />
      )}

      {/* Create Assessment Modal */}
      <CreateAssessmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleAssessmentCreated}
        availableClasses={availableClasses}
        initialClassId={selectedClassId}
        initialSubjectId={selectedSubjectId}
      />

      {/* Student Assessment History Drilldown Modal */}
      <StudentAssessmentModal
        student={studentForModal}
        onClose={() => setStudentForModal(null)}
      />
    </div>
  );
};
