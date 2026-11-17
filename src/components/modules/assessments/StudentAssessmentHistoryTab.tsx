import React, { useState, useMemo } from 'react';
import { db } from '../../../db/storage';
import { useAuth } from '../../../context/AuthContext';
import { SchoolClass, Student } from '../../../types';
import {
  Users,
  Search,
  BookOpen,
  Award,
  TrendingUp,
  FileText,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface StudentAssessmentHistoryTabProps {
  availableClasses: SchoolClass[];
  onOpenStudentModal: (student: Student) => void;
}

export const StudentAssessmentHistoryTab: React.FC<StudentAssessmentHistoryTabProps> = ({
  availableClasses,
  onOpenStudentModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');

  // Active students filtered by teacher's classes
  const students = useMemo(() => {
    const classIdSet = new Set(availableClasses.map((c) => c.id));
    return db
      .getStudents()
      .filter((s) => s.student_status === 'active' && s.current_class_id && classIdSet.has(s.current_class_id))
      .sort((a, b) => a.first_name.localeCompare(b.first_name));
  }, [availableClasses]);

  // Compute student summary performance map
  const studentMetrics = useMemo(() => {
    const map = new Map<
      string,
      {
        total: number;
        average: number;
        highest: number;
        lowest: number;
        passRate: number;
      }
    >();

    students.forEach((student) => {
      const history = db.getScoresForStudent(student.id);
      if (history.length === 0) {
        map.set(student.id, { total: 0, average: 0, highest: 0, lowest: 0, passRate: 0 });
        return;
      }

      let sumPct = 0;
      let highest = 0;
      let lowest = 100;
      let passed = 0;

      history.forEach(({ score, assessment }) => {
        const max = assessment.maximum_score || 100;
        const pct = max > 0 ? (score.score / max) * 100 : 0;
        sumPct += pct;
        if (pct > highest) highest = pct;
        if (pct < lowest) lowest = pct;
        if (pct >= 50) passed++;
      });

      const avg = Math.round(sumPct / history.length);
      const passRate = Math.round((passed / history.length) * 100);

      map.set(student.id, {
        total: history.length,
        average: avg,
        highest: Math.round(highest),
        lowest: Math.round(lowest),
        passRate,
      });
    });

    return map;
  }, [students]);

  // Filtered student list
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (selectedClassFilter !== 'ALL' && s.current_class_id !== selectedClassFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.first_name.toLowerCase().includes(q) ||
          s.last_name.toLowerCase().includes(q) ||
          s.student_code.toLowerCase().includes(q) ||
          s.admission_number.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [students, searchQuery, selectedClassFilter]);

  const getPerformanceBadge = (avg: number, total: number) => {
    if (total === 0) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
          No Tests
        </span>
      );
    }
    if (avg >= 75) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
          Distinction ({avg}%)
        </span>
      );
    }
    if (avg >= 60) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-300">
          Proficient ({avg}%)
        </span>
      );
    }
    if (avg >= 50) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
          Average ({avg}%)
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
        Needs Support ({avg}%)
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Search & Filter Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student by name or ID..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-600">Filter Class:</label>
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
          >
            <option value="ALL">All Assigned Classes ({students.length} students)</option>
            {availableClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Student Performance Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredStudents.length === 0 ? (
          <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400 text-xs">
            No students found matching your search.
          </div>
        ) : (
          filteredStudents.map((student) => {
            const cls = student.current_class_id ? db.getClassById(student.current_class_id) : undefined;
            const metrics = studentMetrics.get(student.id) || {
              total: 0,
              average: 0,
              highest: 0,
              lowest: 0,
              passRate: 0,
            };

            return (
              <div
                key={student.id}
                onClick={() => onOpenStudentModal(student)}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-blue-300 transition cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  {/* Top Profile Header */}
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      {student.profile_photo_url ? (
                        <img
                          src={student.profile_photo_url}
                          alt={student.first_name}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center border border-slate-200 shrink-0">
                          {student.first_name[0]}
                          {student.last_name[0]}
                        </div>
                      )}
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-600 transition truncate max-w-[150px]">
                          {student.first_name} {student.last_name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {student.student_code} • {cls?.name || 'Class'}
                        </div>
                      </div>
                    </div>

                    <div>{getPerformanceBadge(metrics.average, metrics.total)}</div>
                  </div>

                  {/* Quick Metrics */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100 mb-3 text-center">
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">Tests</div>
                      <div className="text-xs font-extrabold text-slate-800">{metrics.total}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">Mean Avg</div>
                      <div className="text-xs font-extrabold text-indigo-700">{metrics.average}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">Pass Rate</div>
                      <div className="text-xs font-extrabold text-emerald-700">{metrics.passRate}%</div>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-bold">
                  <span>View Full Assessment History</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
