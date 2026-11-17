import React from 'react';
import { AcademicStructureModule, AcademicSubTab } from './AcademicStructureModule';

interface AcademicSessionsProps {
  initialTab?: AcademicSubTab;
  onSelectStudent?: (studentId: string) => void;
  onNavigateParent?: (tab: string) => void;
}

export const AcademicSessions: React.FC<AcademicSessionsProps> = ({
  initialTab = 'sessions',
  onSelectStudent,
  onNavigateParent,
}) => {
  return (
    <AcademicStructureModule
      initialTab={initialTab}
      onSelectStudent={onSelectStudent}
      onNavigateParent={onNavigateParent}
    />
  );
};
