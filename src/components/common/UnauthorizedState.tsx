import React from 'react';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { NavigationTab } from '../layout/Sidebar';
import { Button } from '../common/Button';

interface UnauthorizedStateProps {
  moduleName?: string;
  requiredRole?: string;
  onNavigateHome: () => void;
}

export const UnauthorizedState: React.FC<UnauthorizedStateProps> = ({
  moduleName = 'this section',
  requiredRole = 'an Administrator',
  onNavigateHome,
}) => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-4 shadow-xs">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <h2 className="text-xl font-bold text-gray-900 tracking-tight">Access Restricted</h2>
      <p className="mt-2 text-sm text-gray-500 max-w-md">
        You do not have permission to access <span className="font-semibold text-gray-800">{moduleName}</span>. This module requires {requiredRole} privileges.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <Button variant="outline" size="md" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={onNavigateHome}>
          Return to Dashboard
        </Button>
      </div>

      <div className="mt-8 p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-500 flex items-center gap-2 max-w-sm">
        <Lock className="w-4 h-4 text-gray-400 shrink-0" />
        <span>Role-Based Access Control (RBAC) is enforced at both the UI and database layer.</span>
      </div>
    </div>
  );
};
