import React, { useState } from 'react';
import { db } from '../../../db/storage';
import { useAuth } from '../../../context/AuthContext';
import { PageHeader } from '../../layout/PageHeader';
import { StatusBadge } from '../../common/Badge';
import { Modal } from '../../common/Modal';
import {
  BookOpen,
  Users,
  CalendarCheck2,
  FileSpreadsheet,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { NavigationTab } from '../../layout/Sidebar';

interface TeacherMyClassesProps {
  onNavigate: (tab: NavigationTab) => void;
  onSelectClassForAttendance: (classId: string) => void;
  onSelectStudent: (studentId: string) => void;
}

export const TeacherMyClasses: React.FC<TeacherMyClassesProps> = ({
  onNavigate,
  onSelectClassForAttendance,
  onSelectStudent,
}) => {
  const { staff, user } = useAuth();
  const teacherId = staff?.id || user?.staff_id || '';

  const assignedClasses = db.getClassesForTeacher(teacherId);
  const [selectedRosterClassId, setSelectedRosterClassId] = useState<string | null>(null);

  const activeRosterClass = assignedClasses.find((c) => c.id === selectedRosterClassId);
  const activeRosterStudents = selectedRosterClassId
    ? db.getStudentsByClass(selectedRosterClassId)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Assigned Classes"
        subtitle="Manage the classroom arms where you are designated as Class Teacher or Subject Instructor."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {assignedClasses.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            No classes currently assigned to your teacher profile.
          </div>
        ) : (
          assignedClasses.map((cls) => {
            const students = db.getStudentsByClass(cls.id);
            const subjects = db.getClassSubjects(cls.id);
            const isClassTeacher = cls.class_teacher_id === teacherId;

            return (
              <div
                key={cls.id}
                className="bg-white rounded-2xl border border-slate-200/80 hover:border-blue-300 shadow-xs hover:shadow-md transition p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                        {cls.level}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-2">{cls.name}</h3>
                      <p className="text-xs text-slate-500">Section {cls.section}</p>
                    </div>
                    {isClassTeacher && (
                      <span className="px-2.5 py-1 text-[10px] font-bold bg-blue-600 text-white rounded-lg shadow-2xs">
                        Class Teacher
                      </span>
                    )}
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span><strong>{students.length}</strong> active learners enrolled</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-slate-400" />
                      <span><strong>{subjects.length}</strong> subjects in syllabus</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedRosterClassId(cls.id)}
                    className="py-2 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200/80 transition text-center"
                  >
                    View Roster
                  </button>
                  <button
                    onClick={() => {
                      onSelectClassForAttendance(cls.id);
                      onNavigate('attendance');
                    }}
                    className="py-2 px-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition text-center flex items-center justify-center gap-1"
                  >
                    <CalendarCheck2 className="w-3.5 h-3.5" />
                    <span>Attendance</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Class Roster Modal */}
      {selectedRosterClassId && activeRosterClass && (
        <Modal
          isOpen={!!selectedRosterClassId}
          onClose={() => setSelectedRosterClassId(null)}
          title={`${activeRosterClass.name} — Student Roster`}
          subtitle={`${activeRosterStudents.length} enrolled students`}
          maxWidth="2xl"
        >
          <div className="space-y-3 max-h-96 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl p-2">
            {activeRosterStudents.map((s) => (
              <div
                key={s.id}
                className="py-2.5 px-2 flex items-center justify-between hover:bg-slate-50 rounded-lg text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center">
                    {s.first_name[0]}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{s.first_name} {s.last_name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{s.admission_number}</div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedRosterClassId(null);
                    onSelectStudent(s.id);
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  View Profile
                </button>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
};
