import React from 'react';
import { AcademicStructureModule } from '../academics/AcademicStructureModule';
import { NavigationTab } from '../../layout/Sidebar';

interface ClassManagementProps {
  onNavigate?: (tab: NavigationTab) => void;
  onSelectStudent?: (studentId: string) => void;
}

export const ClassManagement: React.FC<ClassManagementProps> = ({
  onNavigate,
  onSelectStudent,
}) => {
  return (
    <AcademicStructureModule
      initialTab="classes"
      onSelectStudent={onSelectStudent}
      onNavigateParent={onNavigate}
    />
  );
};
