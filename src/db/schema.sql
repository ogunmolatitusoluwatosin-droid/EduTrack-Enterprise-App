-- ==============================================================================
-- EduTrack School Management System - Relational Database Schema
-- Version: 1.0 (Production / PostgreSQL & Supabase Compatible)
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. ENUMS AND DOMAIN TYPES
-- ==============================================================================
DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('super_admin', 'school_admin', 'teacher', 'staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE gender_enum AS ENUM ('male', 'female', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE employment_status_enum AS ENUM ('active', 'on_leave', 'suspended', 'resigned', 'retired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE employment_type_enum AS ENUM ('full_time', 'part_time', 'contract');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE student_status_enum AS ENUM ('active', 'graduated', 'transferred', 'suspended', 'withdrawn');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE attendance_status_enum AS ENUM ('present', 'absent', 'late', 'excused');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE assessment_type_enum AS ENUM ('assignment', 'quiz', 'test', 'project', 'examination');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE relationship_enum AS ENUM ('father', 'mother', 'guardian', 'uncle', 'aunt', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 2. AUTOMATIC TIMESTAMP TRIGGER FUNCTION
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. CORE RELATIONAL ENTITIES (15 TABLES)
-- ==============================================================================

-- 3.1 ROLES
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(64) PRIMARY KEY,
    name user_role_enum NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3.2 STAFF
CREATE TABLE IF NOT EXISTS staff (
    id VARCHAR(64) PRIMARY KEY,
    staff_code VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    gender gender_enum NOT NULL,
    date_of_birth DATE NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    address TEXT NOT NULL,
    job_title VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    employment_type employment_type_enum NOT NULL DEFAULT 'full_time',
    employment_status employment_status_enum NOT NULL DEFAULT 'active',
    date_employed DATE NOT NULL DEFAULT CURRENT_DATE,
    qualification VARCHAR(255) NOT NULL,
    profile_photo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_staff_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE TRIGGER trg_staff_timestamp
BEFORE UPDATE ON staff
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- 3.3 USERS
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(150) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    role_id VARCHAR(64) REFERENCES roles(id) ON DELETE SET NULL,
    role user_role_enum NOT NULL DEFAULT 'teacher',
    staff_id VARCHAR(64) REFERENCES staff(id) ON DELETE SET NULL,
    password_hash TEXT,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_user_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE TRIGGER trg_users_timestamp
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- 3.4 ACADEMIC SESSIONS
CREATE TABLE IF NOT EXISTS academic_sessions (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE, -- e.g., '2026/2027'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_session_dates CHECK (start_date < end_date)
);

-- 3.5 TERMS
CREATE TABLE IF NOT EXISTS terms (
    id VARCHAR(64) PRIMARY KEY,
    academic_session_id VARCHAR(64) NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- e.g., 'First Term'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_session_term UNIQUE (academic_session_id, name),
    CONSTRAINT chk_term_dates CHECK (start_date < end_date)
);

-- 3.6 CLASSES
CREATE TABLE IF NOT EXISTS classes (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL, -- e.g. 'Primary 1A', 'SS 2 Science'
    level VARCHAR(50) NOT NULL, -- e.g. 'Primary 1', 'JSS 1', 'SS 2'
    section VARCHAR(50) NOT NULL, -- e.g. 'A', 'B', 'Science'
    academic_session_id VARCHAR(64) REFERENCES academic_sessions(id) ON DELETE SET NULL,
    class_teacher_id VARCHAR(64) REFERENCES staff(id) ON DELETE SET NULL,
    capacity INT NOT NULL DEFAULT 35 CHECK (capacity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_class_level_section UNIQUE (level, section, academic_session_id)
);

CREATE TRIGGER trg_classes_timestamp
BEFORE UPDATE ON classes
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- 3.7 STUDENTS
CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(64) PRIMARY KEY,
    student_code VARCHAR(50) NOT NULL UNIQUE,
    admission_number VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    gender gender_enum NOT NULL,
    date_of_birth DATE NOT NULL,
    nationality VARCHAR(100) NOT NULL DEFAULT 'Nigerian',
    state_or_region VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    current_class_id VARCHAR(64) NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    student_status student_status_enum NOT NULL DEFAULT 'active',
    profile_photo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_students_timestamp
BEFORE UPDATE ON students
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- 3.8 GUARDIANS
CREATE TABLE IF NOT EXISTS guardians (
    id VARCHAR(64) PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(150) NOT NULL,
    address TEXT NOT NULL,
    occupation VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_guardian_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE TRIGGER trg_guardians_timestamp
BEFORE UPDATE ON guardians
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- 3.9 STUDENT_GUARDIANS (PIVOT TABLE)
CREATE TABLE IF NOT EXISTS student_guardians (
    id VARCHAR(64) PRIMARY KEY,
    student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    guardian_id VARCHAR(64) NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
    relationship relationship_enum NOT NULL DEFAULT 'parent',
    is_primary_contact BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_student_guardian UNIQUE (student_id, guardian_id)
);

-- 3.10 TEACHER_CLASS_ASSIGNMENTS
CREATE TABLE IF NOT EXISTS teacher_class_assignments (
    id VARCHAR(64) PRIMARY KEY,
    teacher_id VARCHAR(64) NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    class_id VARCHAR(64) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    academic_session_id VARCHAR(64) REFERENCES academic_sessions(id) ON DELETE CASCADE,
    subject_id VARCHAR(64),
    is_primary_teacher BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_teacher_class_session UNIQUE (teacher_id, class_id, academic_session_id)
);

-- 3.11 SUBJECTS
CREATE TABLE IF NOT EXISTS subjects (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(30) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3.12 CLASS_SUBJECTS
CREATE TABLE IF NOT EXISTS class_subjects (
    id VARCHAR(64) PRIMARY KEY,
    class_id VARCHAR(64) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id VARCHAR(64) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id VARCHAR(64) REFERENCES staff(id) ON DELETE SET NULL,
    academic_session_id VARCHAR(64) REFERENCES academic_sessions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_class_subject_session UNIQUE (class_id, subject_id, academic_session_id)
);

-- 3.13 ATTENDANCE (WITH DUPLICATE PREVENTION)
CREATE TABLE IF NOT EXISTS attendance (
    id VARCHAR(64) PRIMARY KEY,
    student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id VARCHAR(64) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status attendance_status_enum NOT NULL DEFAULT 'present',
    marked_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- CRITICAL REQUIREMENT: Prevent duplicate attendance for the same student, class, and date
    CONSTRAINT uq_attendance_student_class_date UNIQUE (student_id, class_id, attendance_date)
);

CREATE TRIGGER trg_attendance_timestamp
BEFORE UPDATE ON attendance
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- 3.14 ASSESSMENTS
CREATE TABLE IF NOT EXISTS assessments (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    assessment_type assessment_type_enum NOT NULL DEFAULT 'test',
    class_id VARCHAR(64) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id VARCHAR(64) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    academic_session_id VARCHAR(64) REFERENCES academic_sessions(id) ON DELETE SET NULL,
    term_id VARCHAR(64) REFERENCES terms(id) ON DELETE SET NULL,
    maximum_score NUMERIC(5, 2) NOT NULL DEFAULT 100.00 CHECK (maximum_score > 0),
    weight_percentage NUMERIC(5, 2) DEFAULT 20.00 CHECK (weight_percentage >= 0 AND weight_percentage <= 100),
    assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_assessments_timestamp
BEFORE UPDATE ON assessments
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- 3.15 ASSESSMENT_SCORES (WITH DUPLICATE PREVENTION & CONSTRAINTS)
CREATE TABLE IF NOT EXISTS assessment_scores (
    id VARCHAR(64) PRIMARY KEY,
    assessment_id VARCHAR(64) NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    score NUMERIC(5, 2) NOT NULL CHECK (score >= 0),
    feedback TEXT,
    recorded_by VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- CRITICAL REQUIREMENT: Prevent duplicate scores for the same student and assessment
    CONSTRAINT uq_assessment_student_score UNIQUE (assessment_id, student_id)
);

CREATE TRIGGER trg_assessment_scores_timestamp
BEFORE UPDATE ON assessment_scores
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ==============================================================================
-- 4. PERFORMANCE B-TREE INDEXES
-- ==============================================================================

-- Users & Roles Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_staff_id ON users(staff_id);

-- Staff Indexes
CREATE INDEX IF NOT EXISTS idx_staff_code ON staff(staff_code);
CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email);
CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(employment_status);
CREATE INDEX IF NOT EXISTS idx_staff_department ON staff(department);

-- Academic Sessions & Terms Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_active ON academic_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_terms_session_id ON terms(academic_session_id);
CREATE INDEX IF NOT EXISTS idx_terms_active ON terms(is_active);

-- Classes Indexes
CREATE INDEX IF NOT EXISTS idx_classes_level ON classes(level);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(class_teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_session ON classes(academic_session_id);

-- Students Indexes
CREATE INDEX IF NOT EXISTS idx_students_admission ON students(admission_number);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(current_class_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(student_status);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(last_name, first_name);

-- Guardians & Pivot Indexes
CREATE INDEX IF NOT EXISTS idx_guardians_phone ON guardians(phone);
CREATE INDEX IF NOT EXISTS idx_student_guardians_student ON student_guardians(student_id);
CREATE INDEX IF NOT EXISTS idx_student_guardians_guardian ON student_guardians(guardian_id);

-- Teacher Class Assignments & Subjects Indexes
CREATE INDEX IF NOT EXISTS idx_tca_teacher ON teacher_class_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_tca_class ON teacher_class_assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_cs_class ON class_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_cs_subject ON class_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_cs_teacher ON class_subjects(teacher_id);

-- Attendance Indexes (Optimized for daily queries & student history)
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance(class_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);

-- Assessments & Scores Indexes (Optimized for gradebook compilation)
CREATE INDEX IF NOT EXISTS idx_assessments_class_subject ON assessments(class_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_assessments_term ON assessments(term_id);
CREATE INDEX IF NOT EXISTS idx_assessment_scores_assessment ON assessment_scores(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_scores_student ON assessment_scores(student_id);

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES FOR SUPABASE / POSTGRESQL
-- ==============================================================================

-- Enable RLS on all 15 tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_class_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_scores ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role in Supabase auth context
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role_enum AS $$
DECLARE
    u_role user_role_enum;
BEGIN
    SELECT role INTO u_role FROM users WHERE id = auth.uid()::text LIMIT 1;
    RETURN COALESCE(u_role, 'staff'::user_role_enum);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.1 Super Admins & School Admins: Full management policies
CREATE POLICY "Admins have full access to all roles" ON roles
    FOR ALL USING (get_current_user_role() IN ('super_admin', 'school_admin'));

CREATE POLICY "Admins have full access to all users" ON users
    FOR ALL USING (get_current_user_role() IN ('super_admin', 'school_admin'));

CREATE POLICY "Admins have full access to all staff" ON staff
    FOR ALL USING (get_current_user_role() IN ('super_admin', 'school_admin'));

CREATE POLICY "Admins have full access to academic sessions" ON academic_sessions
    FOR ALL USING (get_current_user_role() IN ('super_admin', 'school_admin'));

CREATE POLICY "Admins have full access to terms" ON terms
    FOR ALL USING (get_current_user_role() IN ('super_admin', 'school_admin'));

CREATE POLICY "Admins have full access to classes" ON classes
    FOR ALL USING (get_current_user_role() IN ('super_admin', 'school_admin'));

CREATE POLICY "Admins have full access to students" ON students
    FOR ALL USING (get_current_user_role() IN ('super_admin', 'school_admin'));

CREATE POLICY "Admins have full access to guardians" ON guardians
    FOR ALL USING (get_current_user_role() IN ('super_admin', 'school_admin'));

CREATE POLICY "Admins have full access to student_guardians" ON student_guardians
    FOR ALL USING (get_current_user_role() IN ('super_admin', 'school_admin'));

CREATE POLICY "Admins have full access to teacher assignments" ON teacher_class_assignments
    FOR ALL USING (get_current_user_role() IN ('super_admin', 'school_admin'));

CREATE POLICY "Admins have full access to subjects" ON subjects
    FOR ALL USING (get_current_user_role() IN ('super_admin', 'school_admin'));

CREATE POLICY "Admins have full access to class subjects" ON class_subjects
    FOR ALL USING (get_current_user_role() IN ('super_admin', 'school_admin'));

CREATE POLICY "Admins have full access to attendance" ON attendance
    FOR ALL USING (get_current_user_role() IN ('super_admin', 'school_admin'));

CREATE POLICY "Admins have full access to assessments" ON assessments
    FOR ALL USING (get_current_user_role() IN ('super_admin', 'school_admin'));

CREATE POLICY "Admins have full access to assessment scores" ON assessment_scores
    FOR ALL USING (get_current_user_role() IN ('super_admin', 'school_admin'));

-- 5.2 Teachers & Staff Read-Only or Scoped-Access Policies
CREATE POLICY "Authenticated users can view academic sessions and terms" ON academic_sessions
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can view terms" ON terms
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can view classes" ON classes
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can view subjects" ON subjects
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can view students" ON students
    FOR SELECT USING (true);

CREATE POLICY "Teachers can insert/update attendance for classes" ON attendance
    FOR ALL USING (
        get_current_user_role() = 'teacher'
    );

CREATE POLICY "Teachers can insert/update assessments" ON assessments
    FOR ALL USING (
        get_current_user_role() = 'teacher'
    );

CREATE POLICY "Teachers can enter and update assessment scores" ON assessment_scores
    FOR ALL USING (
        get_current_user_role() = 'teacher'
    );

-- ==============================================================================
-- END OF SCHEMA DEFINITION
-- ==============================================================================
