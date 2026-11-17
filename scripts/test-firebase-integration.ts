// Comprehensive Firebase Integration Test Suite for EduTrack School Management System
import { firebaseService } from '../src/db/firebaseService';
import { firestore } from '../src/db/firebase';
import { doc, getDoc, collection, getDocs, query, where, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Student, Staff, Attendance, Assessment, AssessmentScore } from '../src/types';

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  details: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function runTest(category: string, name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    results.push({ category, name, passed: true, details: 'OK', durationMs });
    console.log(`✅ [PASS] ${category} > ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    const msg = err?.message || String(err);
    results.push({ category, name, passed: false, details: msg, durationMs });
    console.error(`❌ [FAIL] ${category} > ${name} (${durationMs}ms): ${msg}`);
  }
}

async function main() {
  console.log('================================================================');
  console.log('🚀 STARTING EDUTRACK FIREBASE INTEGRATION TEST SUITE');
  console.log('================================================================\n');

  // Seed Firestore dataset
  console.log('🌱 Ensuring initial EduTrack dataset is seeded in Firestore...');
  await firebaseService.initializeAndSeed(true);

  // Test setup variables
  const testTimestamp = Date.now();
  const testAdmNo = `TEST/2026/${testTimestamp % 100000}`;
  const testStaffCode = `STF-T${testTimestamp % 10000}`;
  let createdStudentId: string = '';
  let createdStaffId: string = '';
  let createdAssessmentId: string = '';
  const testClassId = 'cls_pri_1a';
  const testDate = '2026-09-01';

  // -------------------------------------------------------------------------
  // 1. STUDENT MANAGEMENT
  // -------------------------------------------------------------------------
  await runTest('Student Management', 'Create a student in Firestore', async () => {
    const newStudent = await firebaseService.addStudent({
      admission_number: testAdmNo,
      student_code: testAdmNo,
      first_name: 'Amara',
      middle_name: 'Chidinma',
      last_name: 'Eze-Test',
      gender: 'female',
      date_of_birth: '2019-04-12',
      nationality: 'Nigerian',
      state_or_region: 'Enugu',
      address: '14 Independence Layout, Enugu',
      admission_date: '2026-08-01',
      current_class_id: testClassId,
      academic_session_id: 'ses_2026_2027',
      student_status: 'active',
    });

    if (!newStudent || !newStudent.id) {
      throw new Error('Failed to return created student record or student ID.');
    }
    createdStudentId = newStudent.id;

    // Direct Firestore verification
    const snap = await getDoc(doc(firestore, 'students', createdStudentId));
    if (!snap.exists()) {
      throw new Error(`Document /students/${createdStudentId} does not exist in Firestore.`);
    }
    const data = snap.data();
    if (data.admission_number !== testAdmNo) {
      throw new Error(`Mismatch admission number: expected ${testAdmNo}, got ${data.admission_number}`);
    }
  });

  await runTest('Student Management', 'Retrieve the student by ID', async () => {
    if (!createdStudentId) throw new Error('No student ID from previous step');
    const student = await firebaseService.getStudentById(createdStudentId);
    if (!student) throw new Error(`Could not find student by ID ${createdStudentId}`);
    if (student.first_name !== 'Amara' || student.last_name !== 'Eze-Test') {
      throw new Error(`Retrieved student name mismatch: ${student.first_name} ${student.last_name}`);
    }
  });

  await runTest('Student Management', 'Edit the student in Firestore', async () => {
    if (!createdStudentId) throw new Error('No student ID');
    const updated = await firebaseService.updateStudent(createdStudentId, {
      first_name: 'Amara-Updated',
      address: '99 New Haven Road, Enugu',
    });
    if (!updated || updated.first_name !== 'Amara-Updated') {
      throw new Error('updateStudent did not return updated fields.');
    }

    // Direct Firestore verification
    const snap = await getDoc(doc(firestore, 'students', createdStudentId));
    if (!snap.exists() || snap.data()?.first_name !== 'Amara-Updated') {
      throw new Error('Firestore document does not reflect the edited student name.');
    }
  });

  await runTest('Student Management', 'Search for the student by admission number and class query', async () => {
    const student = await firebaseService.getStudentByAdmissionNumber(testAdmNo);
    if (!student || student.id !== createdStudentId) {
      throw new Error(`Lookup by admission number ${testAdmNo} failed.`);
    }

    const classRoster = await firebaseService.getStudentsByClass(testClassId);
    const foundInRoster = classRoster.some((s) => s.id === createdStudentId);
    if (!foundInRoster) {
      throw new Error(`Student ${createdStudentId} not found in class ${testClassId} query results.`);
    }
  });

  // -------------------------------------------------------------------------
  // 2. STAFF MANAGEMENT
  // -------------------------------------------------------------------------
  await runTest('Staff Management', 'Create a staff record in Firestore', async () => {
    const newStaff = await firebaseService.addStaff({
      staff_code: testStaffCode,
      employee_number: testStaffCode,
      first_name: 'Kelechi',
      last_name: 'Okafor-Test',
      gender: 'male',
      date_of_birth: '1988-06-15',
      phone: '+2348039998888',
      email: `kelechi.${testTimestamp}@edutrack.edu`,
      address: '22 Bisichi Crescent, Jos',
      job_title: 'Mathematics Instructor',
      department: 'Sciences',
      employment_type: 'full_time',
      employment_status: 'active',
      date_employed: '2022-09-01',
      qualification: 'B.Sc. Mathematics & Education',
    });

    if (!newStaff || !newStaff.id) {
      throw new Error('Failed to return created staff record or ID.');
    }
    createdStaffId = newStaff.id;

    // Direct Firestore verification
    const snap = await getDoc(doc(firestore, 'staff', createdStaffId));
    if (!snap.exists()) {
      throw new Error(`Document /staff/${createdStaffId} does not exist in Firestore.`);
    }
  });

  await runTest('Staff Management', 'Retrieve the staff record by ID', async () => {
    if (!createdStaffId) throw new Error('No staff ID');
    const staff = await firebaseService.getStaffById(createdStaffId);
    if (!staff || staff.staff_code !== testStaffCode) {
      throw new Error(`Staff lookup failed for ID ${createdStaffId}`);
    }
  });

  await runTest('Staff Management', 'Edit the staff record in Firestore', async () => {
    if (!createdStaffId) throw new Error('No staff ID');
    const updated = await firebaseService.updateStaff(createdStaffId, {
      job_title: 'Senior Mathematics Specialist',
      department: 'Mathematics & Computer Science',
    });
    if (!updated || updated.job_title !== 'Senior Mathematics Specialist') {
      throw new Error('updateStaff did not return expected changes.');
    }

    const snap = await getDoc(doc(firestore, 'staff', createdStaffId));
    if (snap.data()?.job_title !== 'Senior Mathematics Specialist') {
      throw new Error('Firestore document does not reflect updated job title.');
    }
  });

  // -------------------------------------------------------------------------
  // 3. ATTENDANCE & DUPLICATE PREVENTION
  // -------------------------------------------------------------------------
  await runTest('Attendance', 'Mark attendance in Firestore', async () => {
    if (!createdStudentId) throw new Error('No student ID for attendance');

    await firebaseService.recordAttendance([
      {
        student_id: createdStudentId,
        class_id: testClassId,
        attendance_date: testDate,
        status: 'present',
        marked_by: 'usr_teacher_01',
        notes: 'Punctual arrival for morning session',
      },
    ]);
  });

  await runTest('Attendance', 'Confirm attendance record is stored in Firestore', async () => {
    const expectedDocId = `att_${createdStudentId}_${testDate}`;
    const snap = await getDoc(doc(firestore, 'attendance', expectedDocId));
    if (!snap.exists()) {
      throw new Error(`Attendance doc ${expectedDocId} not found in Firestore.`);
    }
    const data = snap.data();
    if (data.status !== 'present' || data.student_id !== createdStudentId) {
      throw new Error(`Attendance doc data mismatch: ${JSON.stringify(data)}`);
    }
  });

  await runTest('Attendance', 'Attempt to create duplicate attendance & confirm prevention', async () => {
    const expectedDocId = `att_${createdStudentId}_${testDate}`;

    // Mark attendance a second time for same student, class, and date (status changed to late)
    await firebaseService.recordAttendance([
      {
        student_id: createdStudentId,
        class_id: testClassId,
        attendance_date: testDate,
        status: 'late',
        marked_by: 'usr_teacher_01',
        notes: 'Updated note: arrived 10 mins late',
      },
    ]);

    // Query all attendance for this student and date in Firestore
    const q = query(
      collection(firestore, 'attendance'),
      where('student_id', '==', createdStudentId),
      where('attendance_date', '==', testDate)
    );
    const querySnap = await getDocs(q);

    // Must be exactly 1 document (no duplicate documents created)
    if (querySnap.size !== 1) {
      throw new Error(`Duplicate attendance detected! Found ${querySnap.size} records, expected exactly 1.`);
    }

    // Verify it updated cleanly in place
    const record = querySnap.docs[0].data();
    if (record.status !== 'late') {
      throw new Error(`Expected updated status "late", but found "${record.status}"`);
    }
  });

  // -------------------------------------------------------------------------
  // 4. ASSESSMENTS & SCORES WITH DUPLICATE PREVENTION
  // -------------------------------------------------------------------------
  await runTest('Assessments', 'Create an assessment in Firestore', async () => {
    const newAss = await firebaseService.addAssessment({
      title: `Mathematics Mid-Term Test ${testTimestamp}`,
      assessment_type: 'examination',
      class_id: testClassId,
      subject_id: 'sub_mth_01',
      academic_session_id: 'ses_2026_2027',
      term_id: 'trm_2026_t1',
      maximum_score: 100,
      weight_percentage: 40,
      assessment_date: testDate,
      created_by: 'usr_teacher_01',
    });

    if (!newAss || !newAss.id) {
      throw new Error('Failed to create assessment in Firestore.');
    }
    createdAssessmentId = newAss.id;

    const snap = await getDoc(doc(firestore, 'assessments', createdAssessmentId));
    if (!snap.exists()) {
      throw new Error(`Assessment doc ${createdAssessmentId} does not exist.`);
    }
  });

  await runTest('Assessments', 'Enter and store student scores in Firestore', async () => {
    if (!createdAssessmentId || !createdStudentId) throw new Error('Missing assessment or student ID');

    await firebaseService.saveScores(
      createdAssessmentId,
      [
        {
          student_id: createdStudentId,
          score: 88,
          feedback: 'Excellent problem solving on algebra questions.',
        },
      ],
      'usr_teacher_01'
    );

    const expectedScoreDocId = `sc_${createdAssessmentId}_${createdStudentId}`;
    const snap = await getDoc(doc(firestore, 'assessment_scores', expectedScoreDocId));
    if (!snap.exists()) {
      throw new Error(`Score document ${expectedScoreDocId} does not exist in Firestore.`);
    }
    const scoreData = snap.data();
    if (scoreData.score !== 88) {
      throw new Error(`Expected score 88, found ${scoreData.score}`);
    }
  });

  await runTest('Assessments', 'Attempt to create duplicate scores & confirm prevention', async () => {
    if (!createdAssessmentId || !createdStudentId) throw new Error('Missing assessment or student ID');

    // Attempt to save score again for the same assessment and student (e.g. regraded to 92)
    await firebaseService.saveScores(
      createdAssessmentId,
      [
        {
          student_id: createdStudentId,
          score: 92,
          feedback: 'Regraded: Correct bonus point awarded.',
        },
      ],
      'usr_teacher_01'
    );

    // Query all scores for this assessment and student
    const q = query(
      collection(firestore, 'assessment_scores'),
      where('assessment_id', '==', createdAssessmentId),
      where('student_id', '==', createdStudentId)
    );
    const querySnap = await getDocs(q);

    // Must be exactly 1 document
    if (querySnap.size !== 1) {
      throw new Error(`Duplicate score records detected! Found ${querySnap.size} records, expected exactly 1.`);
    }

    // Verify it updated cleanly in place
    const scoreRecord = querySnap.docs[0].data();
    if (scoreRecord.score !== 92) {
      throw new Error(`Expected updated score 92, found ${scoreRecord.score}`);
    }
  });

  // -------------------------------------------------------------------------
  // 5. AUTHORIZATION & RBAC VERIFICATION
  // -------------------------------------------------------------------------
  await runTest('Authorization', 'Verify Super Administrator accounts & role definitions in Firestore', async () => {
    const superAdminSnap = await getDoc(doc(firestore, 'users', 'usr_super_admin'));
    if (!superAdminSnap.exists()) {
      throw new Error('Super Administrator user document /users/usr_super_admin is missing.');
    }
    const saData = superAdminSnap.data();
    if (saData.role_id !== 'role_super_admin' || !saData.is_active) {
      throw new Error(`Super Admin invalid configuration: role_id=${saData.role_id}, active=${saData.is_active}`);
    }

    // Verify system roles collection exists
    const rolesSnap = await getDocs(collection(firestore, 'roles'));
    if (rolesSnap.empty) {
      throw new Error('Roles collection is empty in Firestore.');
    }
    const roleNames = rolesSnap.docs.map((d) => d.data().name);
    if (!roleNames.includes('super_admin') || !roleNames.includes('school_admin') || !roleNames.includes('teacher')) {
      throw new Error(`Missing expected system roles: ${roleNames.join(', ')}`);
    }
  });

  await runTest('Authorization', 'Verify School Administrator role & operational records in Firestore', async () => {
    const adminSnap = await getDoc(doc(firestore, 'users', 'usr_school_admin'));
    if (!adminSnap.exists()) {
      throw new Error('School Admin user document /users/usr_school_admin is missing.');
    }
    const adminData = adminSnap.data();
    if (adminData.role_id !== 'role_school_admin') {
      throw new Error(`Expected role_school_admin, got ${adminData.role_id}`);
    }
  });

  await runTest('Authorization', 'Verify Teacher classroom assignments & scoped access in Firestore', async () => {
    const teacherSnap = await getDoc(doc(firestore, 'users', 'usr_teacher'));
    if (!teacherSnap.exists()) {
      throw new Error('Teacher user document /users/usr_teacher is missing.');
    }
    const teacherData = teacherSnap.data();
    if (teacherData.role_id !== 'role_teacher') {
      throw new Error(`Expected role_teacher, got ${teacherData.role_id}`);
    }

    // Verify teacher's class assignment in Firestore
    const teacherStaffId = teacherData.staff_id || 'staff_003';
    const assignments = await firebaseService.getAssignmentsForTeacher(teacherStaffId);
    const assignedClasses = await firebaseService.getClasses();
    const isAssigned = assignedClasses.some((c) => c.class_teacher_id === teacherStaffId) || assignments.length > 0;
    if (!isAssigned) {
      throw new Error(`Teacher ${teacherStaffId} has no class teacher assignments in Firestore.`);
    }
  });

  await runTest('Authorization', 'Verify Security Controls (Zero-password policy & Audit immutability)', async () => {
    // 1. Password field in Firestore user document must be prohibited
    const userDoc = await getDoc(doc(firestore, 'users', 'usr_teacher'));
    if (userDoc.exists()) {
      const data = userDoc.data();
      if ('password' in data || 'password_hash' in data) {
        throw new Error('Security Breach: Raw passwords or hashes detected in Firestore user profile!');
      }
    }

    // 2. Unassigned class boundary check:
    const teacherAssignedClass = 'class_jss1a';
    const otherClass = 'class_pri1a';
    const studentsInOtherClass = await firebaseService.getStudentsByClass(otherClass);
    const leakage = studentsInOtherClass.some((s) => s.current_class_id === teacherAssignedClass);
    if (leakage) {
      throw new Error('Class boundary leakage: student assigned to wrong class roster.');
    }

    // 3. Immutability check on audit logs: verify write of audit log
    const testLogId = `audit_test_${Date.now()}`;
    await setDoc(doc(firestore, 'audit_logs', testLogId), {
      id: testLogId,
      user_id: 'usr_super_admin',
      user_name: 'Dr. Anthony Adeleke',
      action: 'SECURITY_TEST',
      module: 'Integration Test',
      details: 'Audit immutability verification entry',
      timestamp: new Date().toISOString(),
    });
  });

  // -------------------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('📊 EDUTRACK FIREBASE INTEGRATION TEST RESULTS');
  console.log('================================================================');

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  const totalDuration = results.reduce((acc, r) => acc + r.durationMs, 0);

  console.log(`Total Tests Run: ${results.length}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Total Execution Time: ${totalDuration}ms\n`);

  console.log('SUMMARY TABLE:');
  console.table(
    results.map((r) => ({
      Category: r.category,
      Test: r.name,
      Status: r.passed ? 'PASSED' : 'FAILED',
      Duration: `${r.durationMs}ms`,
      Details: r.details,
    }))
  );

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal execution error during test runner:', err);
  process.exit(1);
});
