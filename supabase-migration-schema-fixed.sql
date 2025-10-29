-- =====================================================
-- SUPABASE MIGRATION SCHEMA FOR TRUCKINZY PLATFORM
-- =====================================================
-- This schema migrates from Google Sheets to Supabase
-- Based on ComprehensiveCandidateData interface

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- MAIN CANDIDATES TABLE
-- =====================================================
CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic Information
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer-not-to-say')),
    marital_status TEXT CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed')),
    
    -- Professional Information
    "current_role" TEXT NOT NULL,
    "desired_role" TEXT,
    "current_company" TEXT,
    location TEXT NOT NULL,
    "preferred_location" TEXT,
    "total_experience" TEXT NOT NULL,
    "current_salary" TEXT,
    "expected_salary" TEXT,
    "notice_period" TEXT,
    
    -- Education Details
    highest_qualification TEXT,
    degree TEXT,
    specialization TEXT,
    university TEXT,
    education_year TEXT,
    education_percentage TEXT,
    additional_qualifications TEXT,
    
    -- Skills & Expertise (stored as JSONB for flexibility)
    "technical_skills" JSONB DEFAULT '[]'::jsonb,
    "soft_skills" JSONB DEFAULT '[]'::jsonb,
    "languages_known" JSONB DEFAULT '[]'::jsonb,
    certifications JSONB DEFAULT '[]'::jsonb,
    
    -- Work Experience (structured data)
    "previous_companies" JSONB DEFAULT '[]'::jsonb,
    "job_titles" JSONB DEFAULT '[]'::jsonb,
    "work_duration" JSONB DEFAULT '[]'::jsonb,
    "key_achievements" JSONB DEFAULT '[]'::jsonb,
    
    -- Additional Information
    projects JSONB DEFAULT '[]'::jsonb,
    awards JSONB DEFAULT '[]'::jsonb,
    publications JSONB DEFAULT '[]'::jsonb,
    "references" JSONB DEFAULT '[]'::jsonb,
    "linkedin_profile" TEXT,
    "portfolio_url" TEXT,
    "github_profile" TEXT,
    summary TEXT,
    
    -- File Information
    "resume_text" TEXT,
    "file_name" TEXT,
    "file_url" TEXT, -- Supabase Storage URL
    "file_size" BIGINT,
    "file_type" TEXT,
    
    -- System Fields
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'shortlisted', 'interviewed', 'selected', 'rejected', 'on-hold')),
    tags JSONB DEFAULT '[]'::jsonb,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,
    "uploaded_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "last_contacted" TIMESTAMP WITH TIME ZONE,
    "interview_status" TEXT DEFAULT 'not-scheduled' CHECK ("interview_status" IN ('not-scheduled', 'scheduled', 'completed', 'no-show', 'rescheduled')),
    feedback TEXT,
    
    -- Parsing metadata
    "parsing_method" TEXT, -- 'gemini', 'basic', 'manual'
    "parsing_confidence" DECIMAL(3,2), -- 0.00 to 1.00
    "parsing_errors" JSONB DEFAULT '[]'::jsonb,
    
    -- Search optimization
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE("current_role", '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(location, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE("technical_skills"::text, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE("resume_text", '')), 'C')
    ) STORED
);

-- =====================================================
-- WORK EXPERIENCE DETAILS TABLE
-- =====================================================
CREATE TABLE work_experience (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    company TEXT NOT NULL,
    "role" TEXT NOT NULL,
    duration TEXT NOT NULL,
    location TEXT,
    description TEXT,
    responsibilities TEXT,
    achievements TEXT,
    technologies JSONB DEFAULT '[]'::jsonb,
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- EDUCATION DETAILS TABLE
-- =====================================================
CREATE TABLE education (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    degree TEXT NOT NULL,
    specialization TEXT,
    institution TEXT NOT NULL,
    year TEXT,
    percentage TEXT,
    description TEXT,
    coursework TEXT,
    projects TEXT,
    achievements TEXT,
    is_highest BOOLEAN DEFAULT FALSE,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- FILE STORAGE METADATA TABLE
-- =====================================================
CREATE TABLE file_storage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    storage_provider TEXT DEFAULT 'supabase', -- 'supabase', 'vercel-blob', 'aws-s3'
    original_path TEXT, -- For migration from Vercel Blob
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PARSING JOBS TABLE (for tracking parsing status)
-- =====================================================
CREATE TABLE parsing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    file_id UUID REFERENCES file_storage(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    "parsing_method" TEXT NOT NULL, -- 'gemini', 'basic', 'manual'
    input_tokens INTEGER,
    output_tokens INTEGER,
    cost_usd DECIMAL(10,4),
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Primary search indexes
CREATE INDEX idx_candidates_search_vector ON candidates USING GIN (search_vector);
CREATE INDEX idx_candidates_status ON candidates (status);
CREATE INDEX idx_candidates_location ON candidates (location);
CREATE INDEX idx_candidates_current_role ON candidates ("current_role");
CREATE INDEX idx_candidates_uploaded_at ON candidates ("uploaded_at" DESC);

-- JSONB indexes for array fields
CREATE INDEX idx_candidates_technical_skills ON candidates USING GIN ("technical_skills");
CREATE INDEX idx_candidates_tags ON candidates USING GIN (tags);

-- Foreign key indexes
CREATE INDEX idx_work_experience_candidate_id ON work_experience (candidate_id);
CREATE INDEX idx_education_candidate_id ON education (candidate_id);
CREATE INDEX idx_file_storage_candidate_id ON file_storage (candidate_id);
CREATE INDEX idx_parsing_jobs_candidate_id ON parsing_jobs (candidate_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE education ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsing_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (adjust based on your auth requirements)
-- For now, allowing all operations - customize as needed

-- Candidates policies
CREATE POLICY "Allow all operations on candidates" ON candidates
    FOR ALL USING (true);

-- Work experience policies
CREATE POLICY "Allow all operations on work_experience" ON work_experience
    FOR ALL USING (true);

-- Education policies
CREATE POLICY "Allow all operations on education" ON education
    FOR ALL USING (true);

-- File storage policies
CREATE POLICY "Allow all operations on file_storage" ON file_storage
    FOR ALL USING (true);

-- Parsing jobs policies
CREATE POLICY "Allow all operations on parsing_jobs" ON parsing_jobs
    FOR ALL USING (true);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_candidates_updated_at 
    BEFORE UPDATE ON candidates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEARCH FUNCTIONS
-- =====================================================

-- Function for full-text search
CREATE OR REPLACE FUNCTION search_candidates(search_query TEXT)
RETURNS TABLE (
    id UUID,
    name TEXT,
    "current_role" TEXT,
    location TEXT,
    "technical_skills" JSONB,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c."current_role",
        c.location,
        c."technical_skills",
        ts_rank(c.search_vector, plainto_tsquery('english', search_query)) as rank
    FROM candidates c
    WHERE c.search_vector @@ plainto_tsquery('english', search_query)
    ORDER BY rank DESC;
END;
$$ LANGUAGE plpgsql;

-- Function for skill-based search
CREATE OR REPLACE FUNCTION search_candidates_by_skills(skills TEXT[])
RETURNS TABLE (
    id UUID,
    name TEXT,
    "current_role" TEXT,
    location TEXT,
    "technical_skills" JSONB,
    skill_matches INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c."current_role",
        c.location,
        c."technical_skills",
        (
            SELECT COUNT(*)
            FROM unnest(skills) AS skill
            WHERE c."technical_skills"::text ILIKE '%' || skill || '%'
        ) as skill_matches
    FROM candidates c
    WHERE c."technical_skills" ?| skills
    ORDER BY skill_matches DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ANALYTICS FUNCTIONS
-- =====================================================

-- Function to get candidate statistics
CREATE OR REPLACE FUNCTION get_candidate_stats()
RETURNS TABLE (
    total_candidates BIGINT,
    new_candidates BIGINT,
    reviewed_candidates BIGINT,
    shortlisted_candidates BIGINT,
    selected_candidates BIGINT,
    rejected_candidates BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_candidates,
        COUNT(*) FILTER (WHERE status = 'new') as new_candidates,
        COUNT(*) FILTER (WHERE status = 'reviewed') as reviewed_candidates,
        COUNT(*) FILTER (WHERE status = 'shortlisted') as shortlisted_candidates,
        COUNT(*) FILTER (WHERE status = 'selected') as selected_candidates,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_candidates
    FROM candidates;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SAMPLE DATA (for testing)
-- =====================================================

-- Insert sample candidate
INSERT INTO candidates (
    name, email, phone, "current_role", location, "total_experience",
    "technical_skills", "soft_skills", status
) VALUES (
    'John Doe',
    'john.doe@example.com',
    '+1234567890',
    'Software Engineer',
    'San Francisco, CA',
    '5 years',
    '["JavaScript", "React", "Node.js", "Python"]'::jsonb,
    '["Communication", "Leadership", "Problem Solving"]'::jsonb,
    'new'
);

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE candidates IS 'Main table storing comprehensive candidate information';
COMMENT ON TABLE work_experience IS 'Detailed work experience for each candidate';
COMMENT ON TABLE education IS 'Educational background for each candidate';
COMMENT ON TABLE file_storage IS 'Metadata for uploaded resume files';
COMMENT ON TABLE parsing_jobs IS 'Tracking resume parsing jobs and costs';

COMMENT ON COLUMN candidates.search_vector IS 'Full-text search vector for efficient searching';
COMMENT ON COLUMN candidates.parsing_confidence IS 'Confidence score (0.00-1.00) of the parsing result';
COMMENT ON COLUMN candidates.parsing_errors IS 'Array of parsing errors encountered during processing';
