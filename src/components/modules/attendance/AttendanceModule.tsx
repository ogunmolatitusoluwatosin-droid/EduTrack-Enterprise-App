import React, { useState, useMemo } from 'react';
import { db } from '../../../db/storage';
import { useAuth } from '../../../context/AuthContext';
import { PageHeader } from '../../layout/PageHeader';
import { AttendanceSheet } from './AttendanceSheet';
import { AttendanceHistoryTab } from './AttendanceHistoryTab';
import { AttendanceAnalyticsTab } from './AttendanceAnalyticsTab';
import {
  CalendarCheck2,
  History,
  BarChart3,
  AlertCircle,
  Building2,
  Calendar,
} from 'lucide-react';

export type AttendanceTab = 'sheet' | 'history' | 'analytics';

interface AttendanceModuleProps {
  initialClassId?: string;
}

export const AttendanceModule: React.FC<AttendanceModuleProps> = ({ initialClassId }) => {
  const { staff, isTeacher, isSchoolAdmin, isSuperAdmin } = useAuth();

  const allClasses = db.getClasses();
  const teacherStaffId = staff?.id;

  // Enforce Teacher Class Assignment Constraint
  const availableClasses = useMemo(() => {
    if (isTeacher && teacherStaffId && !isSchoolAdmin && !isSuperAdmin) {
      return db.getClassesForTeacher(teacherStaffId);
    }
    return allClasses;
  }, [allClasses, isTeacher, teacherStaffId, isSchoolAdmin, isSuperAdmin]);

  const [activeTab, setActiveTab] = useState<AttendanceTab>('sheet');
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    if (initialClassId && availableClasses.some((c) => c.id === initialClassId)) {
      return initialClassId;
    }
    return availableClasses[0]?.id || '';
  });

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const handleSelectSessionFromHistory = (classId: string, date: string) => {
    setSelectedClassId(classId);
    setSelectedDate(date);
    setActiveTab('sheet');
  };

  // If teacher has no assigned classes, show clear notification
  if (isTeacher && !isSchoolAdmin && !isSuperAdmin && availableClasses.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Student Attendance"
          subtitle="Record and monitor daily student attendance for assigned classes."
        />

        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Assigned Classes Found</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Your teacher profile is currently not assigned as a Form Master or Subject Instructor to any active
              classes. Only authorized teachers can record attendance for their designated classes.
            </p>
          </div>
          <div className="pt-2 text-xs font-medium text-slate-400">
            Please contact your School Administrator to configure class teacher allocations.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Attendance Management"
        subtitle="Record daily student attendance, manage historical logs, and track punctuality metrics."
      />

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('sheet')}
          className={`flex items-center gap-2 py-2.5 px-4 font-bold text-xs sm:text-sm border-b-2 transition whitespace-nowrap ${
            activeTab === 'sheet'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <CalendarCheck2 className="w-4 h-4" />
          <span>Mark Attendance (Daily Sheet)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 py-2.5 px-4 font-bold text-xs sm:text-sm border-b-2 transition whitespace-nowrap ${
            activeTab === 'history'
              ? 'border-purple-600 text-purple-600 bg-purple-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Attendance History & Logs</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 py-2.5 px-4 font-bold text-xs sm:text-sm border-b-2 transition whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Attendance Statistics & Trends</span>
        </button>
      </div>

      {/* Main Tab Views */}
      {activeTab === 'sheet' && (
        <AttendanceSheet
          selectedClassId={selectedClassId}
          selectedDate={selectedDate}
          onClassChange={setSelectedClassId}
          onDateChange={setSelectedDate}
          availableClasses={availableClasses}
          onViewHistory={() => setActiveTab('history')}
        />
      )}

      {activeTab === 'history' && (
        <AttendanceHistoryTab
          availableClasses={availableClasses}
          selectedClassId={selectedClassId}
          onSelectSession={handleSelectSessionFromHistory}
          onClassChange={setSelectedClassId}
        />
      )}

      {activeTab === 'analytics' && (
        <AttendanceAnalyticsTab availableClasses={availableClasses} />
      )}
    </div>
  );
};
