import React, { useState } from 'react';
import { db } from '../../../db/storage';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Term, AcademicSession } from '../../../types';
import { Modal } from '../../common/Modal';
import { StatusBadge } from '../../common/Badge';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Calendar,
  Clock,
  CalendarDays,
  AlertCircle,
  Filter,
} from 'lucide-react';

interface TermsTabProps {
  initialSessionId?: string;
}

export const TermsTab: React.FC<TermsTabProps> = ({ initialSessionId }) => {
  const { isSchoolAdmin, isSuperAdmin, user } = useAuth();
  const toast = useToast();
  const canManage = isSchoolAdmin || isSuperAdmin;

  const [refreshKey, setRefreshKey] = useState(0);
  const reload = () => setRefreshKey((k) => k + 1);

  const sessions = db.getAcademicSessions();
  const allTerms = db.getTerms();
  const activeSession = db.getActiveSession();
  const activeTerm = db.getActiveTerm();

  const [selectedSessionFilter, setSelectedSessionFilter] = useState<string>(
    initialSessionId || activeSession?.id || (sessions[0]?.id ?? 'all')
  );

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);
  const [targetSessionId, setTargetSessionId] = useState<string>(
    activeSession?.id || (sessions[0]?.id ?? '')
  );
  const [termName, setTermName] = useState('First Term');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(false);

  // Delete modal state
  const [termToDelete, setTermToDelete] = useState<Term | null>(null);

  const filteredTerms = allTerms.filter((term) => {
    if (selectedSessionFilter === 'all') return true;
    return term.academic_session_id === selectedSessionFilter;
  });

  const openCreateModal = () => {
    setEditingTerm(null);
    setTargetSessionId(selectedSessionFilter !== 'all' ? selectedSessionFilter : (activeSession?.id || sessions[0]?.id || ''));
    setTermName('First Term');
    setStartDate(activeSession?.start_date || '2026-09-07');
    setEndDate('2026-12-18');
    setIsActive(false);
    setIsModalOpen(true);
  };

  const openEditModal = (term: Term) => {
    setEditingTerm(term);
    setTargetSessionId(term.academic_session_id);
    setTermName(term.name);
    setStartDate(term.start_date);
    setEndDate(term.end_date);
    setIsActive(term.is_active);
    setIsModalOpen(true);
  };

  const handleSaveTerm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSessionId) {
      toast.error('Validation Error', 'Please select an academic session.');
      return;
    }
    if (!termName.trim()) {
      toast.error('Validation Error', 'Term name is required.');
      return;
    }
    if (!startDate || !endDate) {
      toast.error('Validation Error', 'Start date and end date are required.');
      return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      toast.error('Invalid Dates', 'The term start date must be before the end date.');
      return;
    }

    try {
      const actor = user ? { id: user.id, name: user.full_name } : undefined;

      if (editingTerm) {
        db.updateTerm(
          editingTerm.id,
          {
            academic_session_id: targetSessionId,
            name: termName.trim(),
            start_date: startDate,
            end_date: endDate,
            is_active: isActive,
            is_current: isActive,
          },
          actor
        );
        toast.success('Term Updated', `Term "${termName}" updated successfully.`);
      } else {
        db.createTerm(
          {
            academic_session_id: targetSessionId,
            name: termName.trim(),
            start_date: startDate,
            end_date: endDate,
            is_active: isActive,
            is_current: isActive,
          },
          actor
        );
        toast.success('Term Created', `Term "${termName}" added to session.`);
      }

      setIsModalOpen(false);
      reload();
    } catch (err: any) {
      toast.error('Operation Failed', err.message);
    }
  };

  const handleSetActive = (termId: string) => {
    try {
      const actor = user ? { id: user.id, name: user.full_name } : undefined;
      db.setActiveTerm(termId, actor);
      toast.success('Active Term Set', 'The school-wide current active term was updated.');
      reload();
    } catch (err: any) {
      toast.error('Failed to Set Active Term', err.message);
    }
  };

  const handleDeleteTerm = () => {
    if (!termToDelete) return;
    try {
      const actor = user ? { id: user.id, name: user.full_name } : undefined;
      db.deleteTerm(termToDelete.id, actor);
      toast.success('Term Deleted', `Term "${termToDelete.name}" was removed.`);
      setTermToDelete(null);
      reload();
    } catch (err: any) {
      toast.error('Cannot Delete Term', err.message);
    }
  };

  const getDurationDays = (start: string, end: string) => {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const getTermStatus = (term: Term) => {
    if (term.is_active) {
      return { label: 'Active Term', variant: 'success' as const };
    }
    const today = new Date().toISOString().split('T')[0];
    if (term.end_date < today) {
      return { label: 'Concluded', variant: 'neutral' as const };
    }
    if (term.start_date > today) {
      return { label: 'Upcoming', variant: 'info' as const };
    }
    return { label: 'Inactive', variant: 'warning' as const };
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Academic Terms & Semesters</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage terms, semester divisions, assessment periods, and grading calendar dates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Session Selector Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedSessionFilter}
              onChange={(e) => setSelectedSessionFilter(e.target.value)}
              aria-label="Filter terms by academic session"
              className="px-3 py-2 bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Academic Sessions</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.is_active ? '(Active Session)' : ''}
                </option>
              ))}
            </select>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Term</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{filteredTerms.length}</div>
            <div className="text-xs font-medium text-slate-500">
              {selectedSessionFilter === 'all' ? 'Total Terms (All Sessions)' : 'Terms in Selected Session'}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 truncate">
              {activeTerm ? activeTerm.name : 'None Active'}
            </div>
            <div className="text-xs font-medium text-slate-500">Currently Active Term</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 truncate">
              {activeSession?.name || 'No Active Session'}
            </div>
            <div className="text-xs font-medium text-slate-500">Active Academic Session</div>
          </div>
        </div>
      </div>

      {/* Terms Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
            Terms List ({filteredTerms.length})
          </h4>
          <span className="text-xs text-slate-400">
            Attendance and grade records attach to active term
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Term Name</th>
                <th className="py-3 px-4">Academic Session</th>
                <th className="py-3 px-4">Start Date</th>
                <th className="py-3 px-4">End Date</th>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredTerms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No academic terms found for the selected session.
                  </td>
                </tr>
              ) : (
                filteredTerms.map((term) => {
                  const parentSession = sessions.find((s) => s.id === term.academic_session_id);
                  const statusInfo = getTermStatus(term);
                  const duration = getDurationDays(term.start_date, term.end_date);

                  return (
                    <tr
                      key={term.id}
                      className={`hover:bg-slate-50/75 transition ${
                        term.is_active ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                              term.is_active
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <Layers className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {term.name}
                              {term.is_active && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                                  Current Active
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              ID: {term.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 font-medium whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {parentSession?.name || 'Unassigned Session'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 font-medium whitespace-nowrap">
                        {new Date(term.start_date).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 font-medium whitespace-nowrap">
                        {new Date(term.end_date).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {duration} days (~{Math.round(duration / 7)} weeks)
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={statusInfo.variant} label={statusInfo.label} />
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {!term.is_active && canManage && (
                            <button
                              type="button"
                              onClick={() => handleSetActive(term.id)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                              title="Set as Current Active Term"
                            >
                              Set Active
                            </button>
                          )}
                          {canManage && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditModal(term)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Edit Term"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setTermToDelete(term)}
                                disabled={term.is_active}
                                className={`p-1.5 rounded-lg transition ${
                                  term.is_active
                                    ? 'text-slate-300 cursor-not-allowed'
                                    : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                }`}
                                title={
                                  term.is_active ? 'Active term cannot be deleted' : 'Delete Term'
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
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Term Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTerm ? 'Edit Academic Term' : 'Add Academic Term'}
      >
        <form onSubmit={handleSaveTerm} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Academic Session <span className="text-rose-500">*</span>
            </label>
            <select
              value={targetSessionId}
              onChange={(e) => setTargetSessionId(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="">Select an Academic Session</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.is_active ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Term Name <span className="text-rose-500">*</span>
            </label>
            <div className="space-y-2">
              <input
                type="text"
                required
                value={termName}
                onChange={(e) => setTermName(e.target.value)}
                placeholder="e.g. First Term, Second Term, Third Term"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400">Presets:</span>
                {['First Term', 'Second Term', 'Third Term', 'Summer Term'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTermName(preset)}
                    className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
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
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                Set as Current Active Term
              </span>
            </label>
            <p className="text-[11px] text-slate-400 ml-6 mt-0.5">
              Attendance and score recording defaults to the active term.
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
              {editingTerm ? 'Update Term' : 'Create Term'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!termToDelete}
        onClose={() => setTermToDelete(null)}
        title="Confirm Term Deletion"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Permanent Action</span>
              Are you sure you want to delete term{' '}
              <strong className="font-bold">"{termToDelete?.name}"</strong>?
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setTermToDelete(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteTerm}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition"
            >
              Delete Term
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
