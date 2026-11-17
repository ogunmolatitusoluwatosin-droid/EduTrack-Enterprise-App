import React, { useState } from 'react';
import { PageHeader } from '../../layout/PageHeader';
import { useAuth } from '../../../context/AuthContext';
import {
  GraduationCap,
  Users,
  CalendarCheck2,
  FileSpreadsheet,
  Printer,
  BarChart3,
} from 'lucide-react';
import { StudentReportsTab } from './StudentReportsTab';
import { StaffReportsTab } from './StaffReportsTab';
import { AttendanceReportsTab } from './AttendanceReportsTab';
import { AssessmentReportsTab } from './AssessmentReportsTab';

export type ReportTabType = 'students' | 'staff' | 'attendance' | 'assessments';

export const ReportsModule: React.FC = () => {
  const { isTeacher } = useAuth();
  const [activeReportTab, setActiveReportTab] = useState<ReportTabType>('students');

  const handlePrint = () => {
    window.print();
  };

  const tabs = [
    { id: 'students', label: 'Student Reports', icon: GraduationCap },
    ...(!isTeacher ? [{ id: 'staff', label: 'Staff Reports', icon: Users }] : []),
    { id: 'attendance', label: 'Attendance Reports', icon: CalendarCheck2 },
    { id: 'assessments', label: 'Assessment Reports', icon: FileSpreadsheet },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Institutional data intelligence, demographic distributions, attendance summaries, and academic performance."
        actions={
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-2xs transition"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Current Report</span>
          </button>
        }
      />

      {/* Report Category Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeReportTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReportTab(tab.id as ReportTabType)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 whitespace-nowrap ${
                isActive
                  ? 'text-blue-600 border-blue-600 bg-blue-50/50'
                  : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Render Active Report Tab */}
      <div className="pt-1">
        {activeReportTab === 'students' && <StudentReportsTab />}
        {activeReportTab === 'staff' && !isTeacher && <StaffReportsTab />}
        {activeReportTab === 'attendance' && <AttendanceReportsTab />}
        {activeReportTab === 'assessments' && <AssessmentReportsTab />}
      </div>
    </div>
  );
};
