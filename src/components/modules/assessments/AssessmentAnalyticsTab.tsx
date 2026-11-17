import React, { useMemo } from 'react';
import { db } from '../../../db/storage';
import { SchoolClass, Student } from '../../../types';
import {
  BarChart3,
  TrendingUp,
  Award,
  BookOpen,
  Users,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface AssessmentAnalyticsTabProps {
  availableClasses: SchoolClass[];
  onOpenStudentModal: (student: Student) => void;
}

export const AssessmentAnalyticsTab: React.FC<AssessmentAnalyticsTabProps> = ({
  availableClasses,
  onOpenStudentModal,
}) => {
  const allAssessments = db.getAssessments();
  const allScores = db.getScores();
  const students = db.getStudents().filter((s) => s.student_status === 'active');
  const subjects = db.getSubjects();

  // Class performance comparison
  const classComparison = useMemo(() => {
    return availableClasses.map((cls) => {
      const classAssessments = allAssessments.filter((a) => a.class_id === cls.id);
      let sumPct = 0;
      let scoreCount = 0;

      classAssessments.forEach((a) => {
        const scores = db.getScoresForAssessment(a.id);
        const max = a.maximum_score || 100;
        scores.forEach((s) => {
          if (max > 0) {
            sumPct += (s.score / max) * 100;
            scoreCount++;
          }
        });
      });

      const average = scoreCount > 0 ? Math.round(sumPct / scoreCount) : 0;
      const classStudents = students.filter((s) => s.current_class_id === cls.id);

      return {
        class: cls,
        assessmentCount: classAssessments.length,
        studentCount: classStudents.length,
        scoreCount,
        average,
      };
    }).sort((a, b) => b.average - a.average);
  }, [availableClasses, allAssessments, students]);

  // Overall Grade distribution across all scores
  const gradeDistribution = useMemo(() => {
    let aCount = 0;
    let bCount = 0;
    let cCount = 0;
    let dCount = 0;
    let fCount = 0;

    allScores.forEach((s) => {
      const a = db.getAssessmentById(s.assessment_id);
      if (a && a.maximum_score > 0) {
        const pct = (s.score / a.maximum_score) * 100;
        if (pct >= 80) aCount++;
        else if (pct >= 70) bCount++;
        else if (pct >= 60) cCount++;
        else if (pct >= 50) dCount++;
        else fCount++;
      }
    });

    const total = allScores.length || 1;
    return [
      { grade: 'Grade A (80-100%)', count: aCount, percentage: Math.round((aCount / total) * 100), color: 'bg-emerald-500' },
      { grade: 'Grade B (70-79%)', count: bCount, percentage: Math.round((bCount / total) * 100), color: 'bg-blue-500' },
      { grade: 'Grade C (60-69%)', count: cCount, percentage: Math.round((cCount / total) * 100), color: 'bg-amber-500' },
      { grade: 'Grade D (50-59%)', count: dCount, percentage: Math.round((dCount / total) * 100), color: 'bg-orange-500' },
      { grade: 'Grade F (<50%)', count: fCount, percentage: Math.round((fCount / total) * 100), color: 'bg-rose-500' },
    ];
  }, [allScores]);

  // Subject Performance ranking
  const subjectAnalytics = useMemo(() => {
    return subjects.map((sub) => {
      const subAssessments = allAssessments.filter((a) => a.subject_id === sub.id);
      let sumPct = 0;
      let count = 0;

      subAssessments.forEach((a) => {
        const scores = db.getScoresForAssessment(a.id);
        const max = a.maximum_score || 100;
        scores.forEach((s) => {
          if (max > 0) {
            sumPct += (s.score / max) * 100;
            count++;
          }
        });
      });

      const avg = count > 0 ? Math.round(sumPct / count) : 0;
      return {
        subject: sub,
        assessmentCount: subAssessments.length,
        scoreCount: count,
        average: avg,
      };
    }).filter((s) => s.assessmentCount > 0).sort((a, b) => b.average - a.average);
  }, [subjects, allAssessments]);

  // Top performing students honor roll
  const topStudents = useMemo(() => {
    return students
      .map((student) => {
        const history = db.getScoresForStudent(student.id);
        if (history.length === 0) return null;

        let sum = 0;
        history.forEach(({ score, assessment }) => {
          const max = assessment.maximum_score || 100;
          sum += max > 0 ? (score.score / max) * 100 : 0;
        });

        const avg = Math.round(sum / history.length);
        const cls = student.current_class_id ? db.getClassById(student.current_class_id) : undefined;
        return {
          student,
          class: cls,
          average: avg,
          assessmentsCount: history.length,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => b.average - a.average)
      .slice(0, 5);
  }, [students]);

  return (
    <div className="space-y-6">
      {/* Top Section: Grade Distribution & Class Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Grade Distribution */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Score Grade Distribution</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">{allScores.length} total scores</span>
          </div>

          <div className="space-y-3 pt-2">
            {gradeDistribution.map((item) => (
              <div key={item.grade} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>{item.grade}</span>
                  <span>
                    {item.count} ({item.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{ width: `${Math.max(2, item.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Class Performance Comparison */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Class Average Ranking</h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">Ranked by score mean</span>
          </div>

          <div className="space-y-2.5 pt-2">
            {classComparison.map((item, idx) => (
              <div
                key={item.class.id}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-extrabold text-[11px] flex items-center justify-center">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">{item.class.name}</div>
                    <div className="text-[10px] text-slate-400">
                      {item.studentCount} students • {item.assessmentCount} tests
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-20 bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item.average >= 70 ? 'bg-emerald-500' : item.average >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, item.average)}%` }}
                    />
                  </div>
                  <span className="text-xs font-extrabold text-slate-900 w-10 text-right">
                    {item.average}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subject Performance & Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Subject Performance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Subject Performance Index</h3>
          </div>

          <div className="space-y-2 pt-2">
            {subjectAnalytics.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No subject assessment records found.
              </div>
            ) : (
              subjectAnalytics.map((item) => (
                <div
                  key={item.subject.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      {item.subject.name} ({item.subject.code})
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {item.assessmentCount} assessment{item.assessmentCount > 1 ? 's' : ''} • {item.scoreCount} scores
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-blue-100 text-blue-800 border border-blue-300">
                    {item.average}% Avg
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Performing Students */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Top Performing Students</h3>
          </div>

          <div className="space-y-2 pt-2">
            {topStudents.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No student score records available.
              </div>
            ) : (
              topStudents.map((item, idx) => (
                <div
                  key={item.student.id}
                  onClick={() => onOpenStudentModal(item.student)}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 hover:bg-slate-100/80 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-extrabold text-[11px] flex items-center justify-center border border-amber-200">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {item.student.first_name} {item.student.last_name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {item.class?.name || 'Class'} • {item.assessmentsCount} tests
                      </div>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {item.average}%
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
