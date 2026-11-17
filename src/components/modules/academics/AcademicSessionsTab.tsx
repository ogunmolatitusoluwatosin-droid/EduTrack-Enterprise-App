import React, { useState } from 'react';
import { db } from '../../../db/storage';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { AcademicSession } from '../../../types';
import { Modal } from '../../common/Modal';
import { StatusBadge } from '../../common/Badge';
import {
  CalendarDays,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Calendar,
  Clock,
  Layers,
  Building2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface AcademicSessionsTabProps {
  onSelectSession?: (sessionId: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const AcademicSessionsTab: React.FC<AcademicSessionsTabProps> = ({
  onSelectSession,
  onNavigateTab,
}) => {
  const { isSchoolAdmin, isSuperAdmin, user } = useAuth();
  const toast = useToast();
  const canManage = isSchoolAdmin || isSuperAdmin;

  const [refreshKey, setRefreshKey] = useState(0);
  const reload = () => setRefreshKey((k) => k + 1);

  const sessions = db.getAcademicSessions();
  const terms = db.getTerms();
  const classes = db.getClasses();
  const activeSession = db.getActiveSession();

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<AcademicSession | null>(null);
  const [sessionName, setSessionName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(false);

  // Delete confirmation modal state
  const [sessionToDelete, setSessionToDelete] = useState<AcademicSession | null>(null);

  const openCreateModal = () => {
    setEditingSession(null);
    setSessionName('2027/2028');
    setStartDate('2027-09-06');
    setEndDate('2028-07-21');
    setIsActive(false);
    setIsModalOpen(true);
  };

  const openEditModal = (session: AcademicSession) => {
    setEditingSession(session);
    setSessionName(session.name);
    setStartDate(session.start_date);
    setEndDate(session.end_date);
    setIsActive(session.is_active);
    setIsModalOpen(true);
  };

  const handleSaveSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionName.trim()) {
      toast.error('Validation Error', 'Academic session name is required.');
      return;
    }
    if (!startDate || !endDate) {
      toast.error('Validation Error', 'Start date and end date are required.');
      return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      toast.error('Invalid Dates', 'The session start date must be before the end date.');
      return;
    }

    try {
      const actor = user ? { id: user.id, name: user.full_name } : undefined;

      if (editingSession) {
        db.updateAcademicSession(
          editingSession.id,
          {
            name: sessionName.trim(),
            start_date: startDate,
            end_date: endDate,
            is_active: isActive,
            is_current: isActive,
          },
          actor
        );
        toast.success('Session Updated', `Academic session "${sessionName}" updated successfully.`);
      } else {
        db.createAcademicSession(
          {
            name: sessionName.trim(),
            start_date: startDate,
            end_date: endDate,
            is_active: isActive,
            is_current: isActive,
          },
          actor
        );
        toast.success('Session Created', `Academic session "${sessionName}" created successfully.`);
      }

      setIsModalOpen(false);
      reload();
    } catch (err: any) {
      toast.error('Operation Failed', err.message);
    }
  };

  const handleSetActive = (sessionId: string) => {
    try {
      const actor = user ? { id: user.id, name: user.full_name } : undefined;
      db.setActiveSession(sessionId, actor);
      toast.success('Active Session Updated', 'System-wide active academic session set.');
      reload();
    } catch (err: any) {
      toast.error('Failed to Set Active Session', err.message);
    }
  };

  const handleDeleteSession = () => {
    if (!sessionToDelete) return;
    try {
      const actor = user ? { id: user.id, name: user.full_name } : undefined;
      db.deleteAcademicSession(sessionToDelete.id, actor);
      toast.success('Session Deleted', `Academic session "${sessionToDelete.name}" removed.`);
      setSessionToDelete(null);
      reload();
    } catch (err: any) {
      toast.error('Cannot Delete Session', err.message);
    }
  };

  const getSessionDurationDays = (start: string, end: string) => {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const getSessionStatus = (session: AcademicSession) => {
    if (session.is_active) {
      return { label: 'Active Session', variant: 'success' as const };
    }
    const today = new Date().toISOString().split('T')[0];
    if (session.end_date < today) {
      return { label: 'Concluded', variant: 'neutral' as const };
    }
    if (session.start_date > today) {
      return { label: 'Upcoming', variant: 'info' as const };
    }
    return { label: 'Inactive', variant: 'warning' as const };
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Academic Sessions</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure primary school calendar years, date intervals, and active operational windows.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Session</span>
          </button>
        )}
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{sessions.length}</div>
            <div className="text-xs font-medium text-slate-500">Total Configured Sessions</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 truncate">
              {activeSession ? activeSession.name : 'None Set'}
            </div>
            <div className="text-xs font-medium text-slate-500">Current Active Session</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">
              {terms.filter((t) => t.academic_session_id === activeSession?.id).length} Terms
            </div>
            <div className="text-xs font-medium text-slate-500">In Active Session</div>
          </div>
        </div>
      </div>

      {/* Sessions Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
            All Academic Sessions ({sessions.length})
          </h4>
          <span className="text-xs text-slate-400">
            Only one session can be active at a time
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Session Name</th>
                <th className="py-3 px-4">Start Date</th>
                <th className="py-3 px-4">End Date</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Linked Terms</th>
                <th className="py-3 px-4">Linked Classes</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {sessions.map((session) => {
                const sessionTerms = terms.filter((t) => t.academic_session_id === session.id);
                const sessionClasses = classes.filter((c) => c.academic_session_id === session.id);
                const statusInfo = getSessionStatus(session);
                const durationDays = getSessionDurationDays(session.start_date, session.end_date);

                return (
                  <tr
                    key={session.id}
                    className={`hover:bg-slate-50/75 transition ${
                      session.is_active ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            session.is_active
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            {session.name}
                            {session.is_active && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            ID: {session.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 font-medium whitespace-nowrap">
                      {new Date(session.start_date).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 font-medium whitespace-nowrap">
                      {new Date(session.end_date).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {durationDays} days (~{Math.round(durationDays / 30)} mos)
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectSession) onSelectSession(session.id);
                          if (onNavigateTab) onNavigateTab('terms');
                        }}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline font-medium"
                      >
                        <Layers className="w-3.5 h-3.5 text-blue-500" />
                        <span>{sessionTerms.length} Term{sessionTerms.length === 1 ? '' : 's'}</span>
                      </button>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectSession) onSelectSession(session.id);
                          if (onNavigateTab) onNavigateTab('classes');
                        }}
                        className="inline-flex items-center gap-1 text-slate-700 hover:text-blue-700 hover:underline font-medium"
                      >
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{sessionClasses.length} Class{sessionClasses.length === 1 ? '' : 'es'}</span>
                      </button>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={statusInfo.variant} label={statusInfo.label} />
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {!session.is_active && canManage && (
                          <button
                            type="button"
                            onClick={() => handleSetActive(session.id)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                            title="Set as Current Active Session"
                          >
                            Set Active
                          </button>
                        )}
                        {canManage && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditModal(session)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Edit Session Details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSessionToDelete(session)}
                              disabled={session.is_active}
                              className={`p-1.5 rounded-lg transition ${
                                session.is_active
                                  ? 'text-slate-300 cursor-not-allowed'
                                  : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              }`}
                              title={
                                session.is_active
                                  ? 'Active session cannot be deleted'
                                  : 'Delete Session'
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Session Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSession ? 'Edit Academic Session' : 'Create New Academic Session'}
      >
        <form onSubmit={handleSaveSession} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Session Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="e.g. 2026/2027 or 2027/2028"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Standard format is YYYY/YYYY (e.g. 2026/2027).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                End Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="text-xs font-medium text-slate-700">
                Set as Active School Academic Session
              </span>
            </label>
            <p className="text-[11px] text-slate-400 ml-6 mt-0.5">
              Setting this will automatically mark previous sessions as inactive.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
            >
              {editingSession ? 'Update Session' : 'Create Session'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!sessionToDelete}
        onClose={() => setSessionToDelete(null)}
        title="Confirm Session Deletion"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Permanent Action</span>
              Are you sure you want to delete academic session{' '}
              <strong className="font-bold">"{sessionToDelete?.name}"</strong>? This will fail if
              there are terms or classes assigned to this session.
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setSessionToDelete(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteSession}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition"
            >
              Delete Session
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
