import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, UserCheck, GraduationCap, ArrowRight, X, Sparkles, Filter, Hash, Tag, Building2 } from 'lucide-react';
import { db } from '../../db/storage';
import { StatusBadge } from '../common/Badge';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStudent: (studentId: string) => void;
  onSelectStaff: (staffId: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectStudent,
  onSelectStaff,
}) => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'student' | 'staff'>('all');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return db.globalSearch(query, activeTab);
  }, [query, activeTab]);

  // Reset selected index when query or tab changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeTab]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery('');
      setActiveTab('all');
    }
  }, [isOpen]);

  // Global keydown handler for navigation & selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
      } else if (e.key === 'Enter') {
        if (results.length > 0 && selectedIndex >= 0 && selectedIndex < results.length) {
          e.preventDefault();
          const item = results[selectedIndex];
          if (item.type === 'student') onSelectStudent(item.id);
          else onSelectStaff(item.id);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose, onSelectStudent, onSelectStaff]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div id="global-search-container" className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center pt-12 sm:pt-20 p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity"
        />

        {/* Search Modal Window */}
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.97 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col max-h-[82vh]"
        >
          {/* Header & Search Input */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                <Search className="w-5 h-5" />
              </div>
              <div className="flex-1 relative">
                <input
                  id="global-search-input"
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search students (Name, ID, Adm No) or staff (Name, ID, Emp No)..."
                  className="w-full text-base sm:text-lg bg-transparent border-none outline-none text-slate-900 placeholder-slate-400 font-medium"
                />
              </div>
              {query && (
                <button
                  id="clear-global-search-btn"
                  onClick={() => setQuery('')}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Scope Filter Tabs */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200/60">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>
              <button
                id="search-tab-all"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  activeTab === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                All Records
              </button>
              <button
                id="search-tab-students"
                onClick={() => setActiveTab('student')}
                className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                  activeTab === 'student'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" /> Students
              </button>
              <button
                id="search-tab-staff"
                onClick={() => setActiveTab('staff')}
                className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                  activeTab === 'staff'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" /> Staff
              </button>
            </div>
          </div>

          {/* Results List */}
          <div className="p-3 overflow-y-auto flex-1 divide-y divide-slate-100">
            {query.trim().length === 0 ? (
              <div className="py-10 px-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-3">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">Global System Directory Search</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Quickly look up student profiles, admission numbers, and staff employee records from anywhere in EduTrack. Start typing a name, admission number, student ID, or staff code above.
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                  <Search className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">No matching records found</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  No students or staff members matched &ldquo;{query}&rdquo; for the selected filter. Try searching by name, student code, admission number, or employee ID.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {results.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={`${item.type}-${item.id}`}
                      id={`search-result-${item.type}-${item.id}`}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => {
                        if (item.type === 'student') onSelectStudent(item.id);
                        else onSelectStaff(item.id);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl text-left transition border ${
                        isSelected
                          ? 'bg-blue-50/90 border-blue-200 shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div className="flex items-start gap-3.5 flex-1 min-w-0 mr-3">
                        {/* Record Type Icon Badge */}
                        <div
                          className={`p-2.5 rounded-xl border flex-shrink-0 mt-0.5 ${
                            item.type === 'student'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              : 'bg-blue-50 text-blue-600 border-blue-200'
                          }`}
                        >
                          {item.type === 'student' ? (
                            <GraduationCap className="w-5 h-5" />
                          ) : (
                            <UserCheck className="w-5 h-5" />
                          )}
                        </div>

                        {/* Record Details: Type, Name, ID Numbers, Status */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            {/* Record Type Badge */}
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                item.type === 'student'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-indigo-100 text-indigo-800'
                              }`}
                            >
                              {item.type === 'student' ? 'Student' : 'Staff'}
                            </span>

                            {/* Full Name */}
                            <span className="font-bold text-slate-900 text-sm truncate">
                              {item.name}
                            </span>
                          </div>

                          {/* Identification Numbers clearly indicated */}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mb-1 font-mono">
                            {item.type === 'student' ? (
                              <>
                                <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-slate-700 border border-slate-200 text-[11px]">
                                  <span className="font-sans text-slate-400 font-semibold text-[10px]">ID:</span>
                                  {item.studentCode}
                                </span>
                                <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-slate-700 border border-slate-200 text-[11px]">
                                  <span className="font-sans text-slate-400 font-semibold text-[10px]">ADM:</span>
                                  {item.admissionNumber}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-slate-700 border border-slate-200 text-[11px]">
                                  <span className="font-sans text-slate-400 font-semibold text-[10px]">ID:</span>
                                  {item.staffCode}
                                </span>
                                <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-slate-700 border border-slate-200 text-[11px]">
                                  <span className="font-sans text-slate-400 font-semibold text-[10px]">EMP:</span>
                                  {item.employeeNumber}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Context Subtitle */}
                          <div className="text-xs text-slate-500 truncate flex items-center gap-2">
                            <span>{item.context}</span>
                            {item.matchReason && (
                              <span className="text-[10px] text-blue-600 font-medium bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                                {item.matchReason}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Current Status Badge & Action Arrow */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <StatusBadge status={item.status} />
                        <div
                          className={`p-1.5 rounded-lg transition ${
                            isSelected ? 'bg-blue-600 text-white' : 'text-slate-300'
                          }`}
                        >
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer with Keyboard Shortcuts */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200/80 text-[11px] text-slate-500 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span>
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-slate-700 font-mono shadow-2xs font-semibold">↑</kbd>{' '}
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-slate-700 font-mono shadow-2xs font-semibold">↓</kbd>{' '}
                to navigate
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-slate-700 font-mono shadow-2xs font-semibold">↵ Enter</kbd>{' '}
                to select
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-slate-700 font-mono shadow-2xs font-semibold">Esc</kbd>{' '}
                to close
              </span>
            </div>
            <span className="font-semibold text-slate-400">
              {results.length} {results.length === 1 ? 'match' : 'matches'}
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

