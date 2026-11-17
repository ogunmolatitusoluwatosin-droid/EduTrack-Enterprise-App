import React, { useState, useMemo } from 'react';
import { db } from '../../../db/storage';
import { useAuth } from '../../../context/AuthContext';
import { AssessmentType } from '../../../types';
import { StatCard } from '../../common/StatCard';
import {
  FileSpreadsheet,
  TrendingUp,
  Award,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Search,
  Filter,
  Download,
  GraduationCap,
  ChevronRight,
  User,
  Building,
} from 'lucide-react';

export const AssessmentReportsTab: React.FC = () => {
  const { isTeacher, staff, isSchoolAdmin, isSuperAdmin } = useAuth();

  const classes = useMemo(() => {
    if (isTeacher && staff && !isSchoolAdmin && !isSuperAdmin) {
      return db.getClassesForTeacher(staff.id);
    }
    return db.getClasses();
  }, [isTeacher, staff, isSchoolAdmin, isSuperAdmin]);

  const teacherClassIds = useMemo(() => classes.map((c) => c.id), [classes]);

  const assessments = useMemo(() => {
    let list = db.getAssessments();
    if (isTeacher && staff && !isSchoolAdmin && !isSuperAdmin) {
      list = list.filter((a) => teacherClassIds.includes(a.class_id));
    }
    return list;
  }, [teacherClassIds, isTeacher, staff, isSchoolAdmin, isSuperAdmin]);

  const allScores = useMemo(() => {
    let list = db.getScores();
    if (isTeacher && staff && !isSchoolAdmin && !isSuperAdmin) {
      const assessmentIds = assessments.map((a) => a.id);
      list = list.filter((s) => assessmentIds.includes(s.assessment_id));
    }
    return list;
  }, [assessments, isTeacher, staff, isSchoolAdmin, isSuperAdmin]);

  const subjects = db.getSubjects();
  
  const students = useMemo(() => {
    let list = db.getStudents();
    if (isTeacher && staff && !isSchoolAdmin && !isSuperAdmin) {
      list = list.filter((s) => teacherClassIds.includes(s.current_class_id));
    }
    return list;
  }, [teacherClassIds, isTeacher, staff, isSchoolAdmin, isSuperAdmin]);

  const academicSessions = db.getAcademicSessions();
  const terms = db.getTerms();

  // Sub-view mode
  const [subView, setSubView] = useState<'by_class' | 'student_history' | 'all_assessments'>('by_class');

  // Filters State
  const [selectedSessionId, setSelectedSessionId] = useState<string>('ALL');
  const [selectedTermId, setSelectedTermId] = useState<string>('ALL');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Student specific selection
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');

  // Lookups
  const classMap = useMemo(() => {
    const map = new Map<string, string>();
    classes.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [classes]);

  const subjectMap = useMemo(() => {
    const map = new Map<string, { name: string; code: string }>();
    subjects.forEach((s) => map.set(s.id, { name: s.name, code: s.code }));
    return map;
  }, [subjects]);

  const studentMap = useMemo(() => {
    const map = new Map<string, { name: string; admissionNo: string; classId: string }>();
    students.forEach((s) => {
      map.set(s.id, {
        name: `${s.first_name} ${s.last_name}`,
        admissionNo: s.admission_number,
        classId: s.current_class_id,
      });
    });
    return map;
  }, [students]);

  // Filtered terms by session
  const availableTerms = useMemo(() => {
    if (selectedSessionId === 'ALL') return terms;
    return terms.filter((t) => t.academic_session_id === selectedSessionId);
  }, [terms, selectedSessionId]);

  // Filtered Assessments
  const filteredAssessments = useMemo(() => {
    return assessments.filter((a) => {
      if (selectedSessionId !== 'ALL' && a.academic_session_id && a.academic_session_id !== selectedSessionId) {
        return false;
      }
      if (selectedTermId !== 'ALL' && a.term_id && a.term_id !== selectedTermId) {
        return false;
      }
      if (selectedClassId !== 'ALL' && a.class_id !== selectedClassId) {
        return false;
      }
      if (selectedSubjectId !== 'ALL' && a.subject_id !== selectedSubjectId) {
        return false;
      }
      if (selectedType !== 'ALL' && a.assessment_type !== selectedType) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = a.title.toLowerCase().includes(q);
        const sub = subjectMap.get(a.subject_id);
        const subMatch = sub ? sub.name.toLowerCase().includes(q) || sub.code.toLowerCase().includes(q) : false;
        if (!titleMatch && !subMatch) return false;
      }
      return true;
    });
  }, [assessments, selectedSessionId, selectedTermId, selectedClassId, selectedSubjectId, selectedType, searchQuery, subjectMap]);

  // Filtered Scores matching filtered assessments
  const filteredScores = useMemo(() => {
    const allowedAssessmentIds = new Set(filteredAssessments.map((a) => a.id));
    return allScores.filter((sc) => allowedAssessmentIds.has(sc.assessment_id));
  }, [allScores, filteredAssessments]);

  // Overall Global Academic Statistics
  const overallStats = useMemo(() => {
    const totalAssessments = filteredAssessments.length;
    const totalScores = filteredScores.length;

    if (totalScores === 0) {
      return {
        totalAssessments,
        totalScores: 0,
        averagePercentage: 0,
        highestScore: 0,
        highestScoreDetails: '—',
        lowestScore: 0,
        lowestScoreDetails: '—',
        passRate: 0,
      };
    }

    let sumPercentage = 0;
    let highestPct = -Infinity;
    let lowestPct = Infinity;
    let highestDetails = '';
    let lowestDetails = '';
    let passCount = 0;

    filteredScores.forEach((sc) => {
      const asm = filteredAssessments.find((a) => a.id === sc.assessment_id);
      const max = asm?.maximum_score || 100;
      const pct = (sc.score / max) * 100;
      sumPercentage += pct;

      if (pct >= 50) passCount++;

      const studentInfo = studentMap.get(sc.student_id);
      const studentName = studentInfo ? studentInfo.name : 'Student';
      const asmTitle = asm ? asm.title : 'Assessment';

      if (pct > highestPct) {
        highestPct = pct;
        highestDetails = `${Math.round(pct)}% (${studentName} - ${asmTitle})`;
      }
      if (pct < lowestPct) {
        lowestPct = pct;
        lowestDetails = `${Math.round(pct)}% (${studentName} - ${asmTitle})`;
      }
    });

    const averagePercentage = Math.round(sumPercentage / totalScores);
    const passRate = Math.round((passCount / totalScores) * 100);

    return {
      totalAssessments,
      totalScores,
      averagePercentage,
      highestScore: highestPct === -Infinity ? 0 : Math.round(highestPct),
      highestScoreDetails: highestDetails || '—',
      lowestScore: lowestPct === Infinity ? 0 : Math.round(lowestPct),
      lowestScoreDetails: lowestDetails || '—',
      passRate,
    };
  }, [filteredAssessments, filteredScores, studentMap]);

  // 1. Assessment Results by Class (Class Averages, Highest, Lowest)
  const assessmentResultsByClass = useMemo(() => {
    return classes.map((cls) => {
      const classAssessments = filteredAssessments.filter((a) => a.class_id === cls.id);
      const asmIds = new Set(classAssessments.map((a) => a.id));
      const classScores = filteredScores.filter((sc) => asmIds.has(sc.assessment_id));

      if (classScores.length === 0) {
        return {
          id: cls.id,
          name: cls.name,
          level: cls.level,
          assessmentCount: classAssessments.length,
          scoreCount: 0,
          classAverage: 0,
          highestScore: 0,
          lowestScore: 0,
          passRate: 0,
        };
      }

      let sumPct = 0;
      let highestPct = -Infinity;
      let lowestPct = Infinity;
      let passCount = 0;

      classScores.forEach((sc) => {
        const asm = classAssessments.find((a) => a.id === sc.assessment_id);
        const max = asm?.maximum_score || 100;
        const pct = (sc.score / max) * 100;
        sumPct += pct;
        if (pct >= 50) passCount++;
        if (pct > highestPct) highestPct = pct;
        if (pct < lowestPct) lowestPct = pct;
      });

      return {
        id: cls.id,
        name: cls.name,
        level: cls.level,
        assessmentCount: classAssessments.length,
        scoreCount: classScores.length,
        classAverage: Math.round(sumPct / classScores.length),
        highestScore: Math.round(highestPct),
        lowestScore: Math.round(lowestPct),
        passRate: Math.round((passCount / classScores.length) * 100),
      };
    });
  }, [classes, filteredAssessments, filteredScores]);

  // 2. Individual Assessment Item Breakdown
  const assessmentItemReports = useMemo(() => {
    return filteredAssessments.map((asm) => {
      const scores = allScores.filter((sc) => sc.assessment_id === asm.id);
      const max = asm.maximum_score || 100;
      const sub = subjectMap.get(asm.subject_id);
      const className = classMap.get(asm.class_id) || 'Unassigned';

      if (scores.length === 0) {
        return {
          ...asm,
          className,
          subjectName: sub?.name || 'Subject',
          subjectCode: sub?.code || '',
          scoreCount: 0,
          averageScore: 0,
          averagePercentage: 0,
          highestScore: 0,
          lowestScore: 0,
          passRate: 0,
        };
      }

      const scoreVals = scores.map((s) => s.score);
      const sum = scoreVals.reduce((acc, curr) => acc + curr, 0);
      const avg = Math.round((sum / scoreVals.length) * 10) / 10;
      const avgPct = Math.round((avg / max) * 100);
      const highest = Math.max(...scoreVals);
      const lowest = Math.min(...scoreVals);
      const passCount = scores.filter((s) => s.score / max >= 0.5).length;
      const passRate = Math.round((passCount / scores.length) * 100);

      return {
        ...asm,
        className,
        subjectName: sub?.name || 'Subject',
        subjectCode: sub?.code || '',
        scoreCount: scores.length,
        averageScore: avg,
        averagePercentage: avgPct,
        highestScore: highest,
        lowestScore: lowest,
        passRate,
      };
    });
  }, [filteredAssessments, allScores, subjectMap, classMap]);

  // 3. Student Assessment History & Student Average
  const studentHistoryList = useMemo(() => {
    if (!selectedStudentId) return [];
    const rawScores = db.getScoresForStudent(selectedStudentId);

    return rawScores.map((item) => {
      const max = item.assessment.maximum_score || 100;
      const pct = Math.round((item.score.score / max) * 100);
      return {
        ...item,
        percentage: pct,
      };
    });
  }, [selectedStudentId]);

  // Student cumulative average
  const selectedStudentMetrics = useMemo(() => {
    if (!selectedStudentId || studentHistoryList.length === 0) {
      return {
        studentAverage: 0,
        totalTaken: 0,
        highestScore: 0,
        lowestScore: 0,
        passCount: 0,
      };
    }

    const pcts = studentHistoryList.map((i) => i.percentage);
    const sum = pcts.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / pcts.length);
    const highest = Math.max(...pcts);
    const lowest = Math.min(...pcts);
    const passCount = studentHistoryList.filter((i) => i.percentage >= 50).length;

    return {
      studentAverage: avg,
      totalTaken: studentHistoryList.length,
      highestScore: highest,
      lowestScore: lowest,
      passCount,
    };
  }, [selectedStudentId, studentHistoryList]);

  // Filter students for student picker
  const filteredStudentsList = useMemo(() => {
    return students.filter((s) => {
      if (selectedClassId !== 'ALL' && s.current_class_id !== selectedClassId) return false;
      if (studentSearchQuery.trim()) {
        const q = studentSearchQuery.toLowerCase().trim();
        const name = `${s.first_name} ${s.last_name}`.toLowerCase();
        const adm = s.admission_number.toLowerCase();
        if (!name.includes(q) && !adm.includes(q)) return false;
      }
      return true;
    });
  }, [students, selectedClassId, studentSearchQuery]);

  const selectedStudentObj = students.find((s) => s.id === selectedStudentId);

  const hasActiveFilters =
    selectedSessionId !== 'ALL' ||
    selectedTermId !== 'ALL' ||
    selectedClassId !== 'ALL' ||
    selectedSubjectId !== 'ALL' ||
    selectedType !== 'ALL' ||
    searchQuery.trim().length > 0;

  const handleResetFilters = () => {
    setSelectedSessionId('ALL');
    setSelectedTermId('ALL');
    setSelectedClassId('ALL');
    setSelectedSubjectId('ALL');
    setSelectedType('ALL');
    setSearchQuery('');
  };

  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];

    if (subView === 'by_class') {
      headers = ['Class Name', 'Level', 'Assessments Created', 'Total Scores Graded', 'Class Average (%)', 'Highest Score (%)', 'Lowest Score (%)', 'Pass Rate (%)'];
      rows = assessmentResultsByClass.map((c) => [
        c.name,
        c.level,
        String(c.assessmentCount),
        String(c.scoreCount),
        `${c.classAverage}%`,
        `${c.highestScore}%`,
        `${c.lowestScore}%`,
        `${c.passRate}%`,
      ]);
    } else if (subView === 'student_history') {
      headers = ['Subject', 'Assessment Title', 'Type', 'Date', 'Score', 'Max Score', 'Percentage (%)', 'Remarks'];
      rows = studentHistoryList.map((item) => [
        item.subject?.name || 'Subject',
        item.assessment.title,
        item.assessment.assessment_type,
        item.assessment.assessment_date,
        String(item.score.score),
        String(item.assessment.maximum_score),
        `${item.percentage}%`,
        item.score.feedback || '—',
      ]);
    } else {
      headers = ['Title', 'Class', 'Subject', 'Type', 'Date', 'Max Score', 'Scores Graded', 'Average Score', 'Average %', 'Highest', 'Lowest', 'Pass Rate (%)'];
      rows = assessmentItemReports.map((a) => [
        a.title,
        a.className,
        a.subjectName,
        a.assessment_type,
        a.assessment_date,
        String(a.maximum_score),
        String(a.scoreCount),
        String(a.averageScore),
        `${a.averagePercentage}%`,
        String(a.highestScore),
        String(a.lowestScore),
        `${a.passRate}%`,
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `assessment_reports_${subView}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. Core Assessment Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Class Average"
          value={`${overallStats.averagePercentage}%`}
          subtitle="Overall institutional score average"
          icon={Percent}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Highest Score"
          value={`${overallStats.highestScore}%`}
          subtitle={overallStats.highestScoreDetails}
          icon={ArrowUpRight}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Lowest Score"
          value={`${overallStats.lowestScore}%`}
          subtitle={overallStats.lowestScoreDetails}
          icon={ArrowDownRight}
          iconBgColor="bg-rose-50"
          iconColor="text-rose-600"
        />
        <StatCard
          title="Pass Rate (≥50%)"
          value={`${overallStats.passRate}%`}
          subtitle="Scores meeting passing grade"
          icon={Award}
          iconBgColor="bg-purple-50"
          iconColor="text-purple-600"
        />
        <StatCard
          title="Total Graded"
          value={overallStats.totalScores}
          subtitle={`Across ${overallStats.totalAssessments} assessments`}
          icon={FileSpreadsheet}
          iconBgColor="bg-indigo-50"
          iconColor="text-indigo-600"
        />
      </div>

      {/* 2. Sub-View Navigation & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Navigation Sub-Tabs */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl">
            <button
              onClick={() => setSubView('by_class')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                subView === 'by_class'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Assessment Results by Class
            </button>
            <button
              onClick={() => setSubView('student_history')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                subView === 'student_history'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Student Assessment History
            </button>
            <button
              onClick={() => setSubView('all_assessments')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                subView === 'all_assessments'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Assessment Items
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl shadow-2xs transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Global Assessment Filters */}
        <div className="p-4 border-b border-slate-200 space-y-3 bg-white">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assessment or subject..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none"
              />
            </div>

            {/* Class Filter */}
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="ALL">All Classes ({classes.length})</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Subject Filter */}
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="ALL">All Subjects ({subjects.length})</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none capitalize"
            >
              <option value="ALL">All Types</option>
              <option value="assignment">Assignment</option>
              <option value="quiz">Quiz</option>
              <option value="test">Test</option>
              <option value="project">Project</option>
              <option value="examination">Examination</option>
            </select>

            {/* Academic Session Filter */}
            <select
              value={selectedSessionId}
              onChange={(e) => {
                setSelectedSessionId(e.target.value);
                setSelectedTermId('ALL');
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="ALL">All Sessions</option>
              {academicSessions.map((ses) => (
                <option key={ses.id} value={ses.id}>
                  {ses.name} {ses.is_active ? '(Current)' : ''}
                </option>
              ))}
            </select>

            {/* Term Filter */}
            <select
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="ALL">All Terms</option>
              {availableTerms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-500">
            Showing <strong className="text-slate-800">{filteredAssessments.length}</strong> assessments with{' '}
            <strong className="text-slate-800">{filteredScores.length}</strong> total student grades recorded
          </div>
        </div>

        {/* View 1: Assessment Results By Class */}
        {subView === 'by_class' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Class Name</th>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3 text-center">Assessments</th>
                  <th className="px-4 py-3 text-center">Scores Graded</th>
                  <th className="px-4 py-3">Class Average</th>
                  <th className="px-4 py-3 text-center">Highest Score</th>
                  <th className="px-4 py-3 text-center">Lowest Score</th>
                  <th className="px-4 py-3">Pass Rate (≥50%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assessmentResultsByClass.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                      <Building className="w-4 h-4 text-blue-500" />
                      {c.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 uppercase font-semibold">{c.level}</td>
                    <td className="px-4 py-3 text-center text-slate-700 font-semibold">{c.assessmentCount}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-900">{c.scoreCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              c.classAverage >= 70 ? 'bg-emerald-500' : c.classAverage >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${c.classAverage}%` }}
                          />
                        </div>
                        <span
                          className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                            c.classAverage >= 70
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.classAverage >= 50
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {c.classAverage}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-emerald-700">{c.highestScore}%</td>
                    <td className="px-4 py-3 text-center font-bold text-rose-700">{c.lowestScore}%</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-800">{c.passRate}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* View 2: Student Assessment History & Student Average */}
        {subView === 'student_history' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            {/* Student Picker Sidebar */}
            <div className="p-4 bg-slate-50/50 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Student to Inspect History</label>
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    placeholder="Search student..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
                {filteredStudentsList.map((s) => {
                  const isSelected = selectedStudentId === s.id;
                  const cName = classMap.get(s.current_class_id) || 'Class';
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStudentId(s.id)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-blue-600 text-white font-semibold shadow-xs'
                          : 'hover:bg-white text-slate-800 border border-transparent hover:border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="font-bold">{s.first_name} {s.last_name}</div>
                        <div className={`text-[11px] ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                          {s.admission_number} • {cName}
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Student Assessment Performance History Logs */}
            <div className="lg:col-span-2 p-5 space-y-5">
              {selectedStudentObj ? (
                <>
                  {/* Student Header Card */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Individual Student Performance</span>
                      <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                        {selectedStudentObj.first_name} {selectedStudentObj.middle_name ? `${selectedStudentObj.middle_name} ` : ''}{selectedStudentObj.last_name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Adm No: <span className="font-mono font-bold text-slate-800">{selectedStudentObj.admission_number}</span> • Class:{' '}
                        <span className="font-semibold text-slate-800">{classMap.get(selectedStudentObj.current_class_id) || 'Unassigned'}</span>
                      </p>
                    </div>

                    {/* Quick Metric Pills */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="px-3.5 py-2 bg-white rounded-xl border border-slate-200 text-center shadow-2xs">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Student Average</div>
                        <div className="text-lg font-extrabold text-blue-600">{selectedStudentMetrics.studentAverage}%</div>
                      </div>
                      <div className="px-3.5 py-2 bg-white rounded-xl border border-slate-200 text-center shadow-2xs">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Highest Score</div>
                        <div className="text-lg font-extrabold text-emerald-600">{selectedStudentMetrics.highestScore}%</div>
                      </div>
                      <div className="px-3.5 py-2 bg-white rounded-xl border border-slate-200 text-center shadow-2xs">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Lowest Score</div>
                        <div className="text-lg font-extrabold text-rose-600">{selectedStudentMetrics.lowestScore}%</div>
                      </div>
                    </div>
                  </div>

                  {/* Student Assessment History Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
                      Assessment Scores History ({studentHistoryList.length} Records)
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100/60 text-slate-600 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="px-3.5 py-2.5">Subject</th>
                            <th className="px-3.5 py-2.5">Assessment Title</th>
                            <th className="px-3.5 py-2.5">Type</th>
                            <th className="px-3.5 py-2.5">Date</th>
                            <th className="px-3.5 py-2.5 text-center">Score / Max</th>
                            <th className="px-3.5 py-2.5 text-center">Percentage</th>
                            <th className="px-3.5 py-2.5">Teacher Feedback</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {studentHistoryList.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-slate-400">
                                No assessment scores on record for this student.
                              </td>
                            </tr>
                          ) : (
                            studentHistoryList.map((item) => (
                              <tr key={item.score.id} className="hover:bg-slate-50/60 transition">
                                <td className="px-3.5 py-2.5 font-bold text-slate-900">
                                  {item.subject?.name || 'Subject'}
                                </td>
                                <td className="px-3.5 py-2.5 text-slate-700">{item.assessment.title}</td>
                                <td className="px-3.5 py-2.5 capitalize text-slate-600">{item.assessment.assessment_type}</td>
                                <td className="px-3.5 py-2.5 text-slate-500">{item.assessment.assessment_date}</td>
                                <td className="px-3.5 py-2.5 text-center font-mono font-bold text-slate-900">
                                  {item.score.score} / {item.assessment.maximum_score}
                                </td>
                                <td className="px-3.5 py-2.5 text-center">
                                  <span
                                    className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                                      item.percentage >= 70
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : item.percentage >= 50
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}
                                  >
                                    {item.percentage}%
                                  </span>
                                </td>
                                <td className="px-3.5 py-2.5 text-slate-600 italic">
                                  {item.score.feedback || '—'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                  <User className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="text-sm font-medium">Select a student from the left panel to inspect their detailed assessment records.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* View 3: All Assessment Items */}
        {subView === 'all_assessments' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Assessment Title</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-center">Max Score</th>
                  <th className="px-4 py-3 text-center">Scores Graded</th>
                  <th className="px-4 py-3 text-center">Class Average</th>
                  <th className="px-4 py-3 text-center">Highest</th>
                  <th className="px-4 py-3 text-center">Lowest</th>
                  <th className="px-4 py-3">Pass Rate (≥50%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assessmentItemReports.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      No assessments match the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  assessmentItemReports.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3 font-bold text-slate-900">{a.title}</td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{a.className}</td>
                      <td className="px-4 py-3 text-slate-700">{a.subjectName}</td>
                      <td className="px-4 py-3 capitalize text-slate-600">{a.assessment_type}</td>
                      <td className="px-4 py-3 text-center font-mono text-slate-600">{a.maximum_score}</td>
                      <td className="px-4 py-3 text-center font-bold text-slate-900">{a.scoreCount}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                            a.averagePercentage >= 70
                              ? 'bg-emerald-100 text-emerald-800'
                              : a.averagePercentage >= 50
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {a.averageScore} ({a.averagePercentage}%)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-700">{a.highestScore}</td>
                      <td className="px-4 py-3 text-center font-bold text-rose-700">{a.lowestScore}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800">{a.passRate}%</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
