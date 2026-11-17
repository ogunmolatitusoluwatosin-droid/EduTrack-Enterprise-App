import React, { useState } from 'react';
import { db } from '../../../db/storage';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { PageHeader } from '../../layout/PageHeader';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import {
  Settings,
  Building2,
  Clock,
  Database,
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  Save,
  Search,
} from 'lucide-react';

export const SettingsModule: React.FC = () => {
  const { user, logout } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'profile' | 'audit' | 'database'>('profile');

  const currentSettings = db.getSettings();

  // School Profile Form State
  const [schoolName, setSchoolName] = useState(currentSettings.school_name || '');
  const [motto, setMotto] = useState(currentSettings.motto || currentSettings.tagline || '');
  const [email, setEmail] = useState(currentSettings.email || '');
  const [phone, setPhone] = useState(currentSettings.phone || '');
  const [address, setAddress] = useState(currentSettings.address || '');
  const [website, setWebsite] = useState(currentSettings.website || '');
  const [currencySymbol, setCurrencySymbol] = useState(currentSettings.currency_symbol || '$');
  const [isResetting, setIsResetting] = useState(false);

  // Audit Logs State
  const auditLogs = db.getAuditLogs();
  const [auditSearch, setAuditSearch] = useState('');
  const [auditModuleFilter, setAuditModuleFilter] = useState('ALL');

  // Reset & Backup Confirmation Dialog
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const actor = user ? { id: user.id, name: user.full_name } : undefined;
    db.updateSettings(
      {
        school_name: schoolName.trim(),
        motto: motto.trim(),
        tagline: motto.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        website: website.trim(),
        currency_symbol: currencySymbol.trim() || '$',
      },
      actor
    );
    toast.success('School Profile Updated', 'Institutional information saved successfully.');
  };

  const handleExportBackup = () => {
    const rawData = localStorage.getItem('edutrack_relational_database_v2');
    if (!rawData) {
      toast.info('Nothing to Export', 'No local backup snapshot is available yet.');
      return;
    }
    const blob = new Blob([rawData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `school_system_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup Generated', 'Full database snapshot downloaded.');
  };

  const handleResetDatabase = async () => {
    setIsResetting(true);
    try {
      await db.clearAllData();
      await logout();
      toast.success('Workspace Cleared', 'All institution records were erased. Ready for fresh setup.');
    } catch (err: any) {
      toast.error('Reset Failed', err?.message || 'Could not clear institution records.');
    } finally {
      setIsResetting(false);
    }
  };

  const filteredLogs = auditLogs.filter((log) => {
    if (auditSearch.trim()) {
      const q = auditSearch.toLowerCase();
      if (
        !log.user_name.toLowerCase().includes(q) &&
        !log.details.toLowerCase().includes(q) &&
        !log.action.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    if (auditModuleFilter !== 'ALL' && log.module !== auditModuleFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Administration & Configuration"
        subtitle="Manage school institutional identity, immutable audit records, and database snapshots."
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        {[
          { id: 'profile', label: 'School Profile', icon: Building2 },
          { id: 'audit', label: `Audit Log Trail (${auditLogs.length})`, icon: Clock },
          { id: 'database', label: 'Database Backup & Reset', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
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

      {/* Tab 1: School Profile */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 max-w-3xl">
          <h3 className="text-sm font-bold text-slate-900">Institutional Profile & Branding</h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">School Name</label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">School Motto / Slogan</label>
            <input
              type="text"
              value={motto}
              onChange={(e) => setMotto(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Telephone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street address, city, country"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Website URL</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://institution.edu"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Currency Symbol</label>
              <input
                type="text"
                maxLength={5}
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                placeholder="$"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Search audit trail..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>
            <div>
              <select
                value={auditModuleFilter}
                onChange={(e) => setAuditModuleFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
              >
                <option value="ALL">All Modules</option>
                <option value="STUDENTS">STUDENTS</option>
                <option value="STAFF">STAFF</option>
                <option value="CLASSES">CLASSES</option>
                <option value="ATTENDANCE">ATTENDANCE</option>
                <option value="ASSESSMENTS">ASSESSMENTS</option>
                <option value="USERS">USERS</option>
                <option value="ACADEMICS">ACADEMICS</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {filteredLogs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-slate-50 transition flex items-start justify-between gap-4 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{log.user_name}</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {log.action}
                      </span>
                      <span className="text-slate-400 font-semibold">• {log.module}</span>
                    </div>
                    <p className="text-slate-600 mt-1">{log.details}</p>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Database & Reset */}
      {activeTab === 'database' && (
        <div className="space-y-4 max-w-3xl">
          {/* Backup */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Database Snapshot Export</h4>
              <p className="text-xs text-slate-500 mt-0.5">Download entire database as a portable JSON file.</p>
            </div>
            <button
              onClick={handleExportBackup}
              className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-xs rounded-xl shadow-2xs transition flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Export JSON</span>
            </button>
          </div>

          {/* Factory Reset */}
          <div className="p-5 bg-rose-50/50 rounded-2xl border border-rose-200/80 shadow-xs flex items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-rose-900">Factory Reset / Clear All Institution Data</h4>
              <p className="text-xs text-rose-700/80 mt-0.5">
                Permanently removes all students, staff, classes, academic records, settings, and user accounts so a new institution can set up from scratch.
              </p>
            </div>
            <button
              onClick={() => setIsResetConfirmOpen(true)}
              disabled={isResetting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0 disabled:opacity-60"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isResetting ? 'Clearing...' : 'Clear All Data'}</span>
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetDatabase}
        title="Clear All Institution Data?"
        message="This will permanently erase all institutional records, user accounts, and settings from this workspace and return to first-time setup. Export a JSON backup first if needed."
        confirmText="Yes, Clear All Data"
        variant="danger"
      />
    </div>
  );
};
