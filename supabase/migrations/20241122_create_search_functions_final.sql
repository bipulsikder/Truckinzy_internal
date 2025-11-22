-- Check if search_vector exists and drop it if it's a generated column
ALTER TABLE candidates DROP COLUMN IF EXISTS search_vector;

-- Add search_vector as a regular column
ALTER TABLE candidates ADD COLUMN search_vector tsvector;

-- Create index for full-text search
CREATE INDEX IF NOT EXISTS idx_candidates_search_vector ON candidates USING GIN (search_vector);

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS search_candidates(text);
DROP FUNCTION IF EXISTS search_candidates_by_skills(text[]);

-- Create function for full-text search
CREATE OR REPLACE FUNCTION search_candidates(search_query text)
RETURNS TABLE (
  result_id uuid,
  result_name text,
  result_current_role text,
  result_location text,
  result_technical_skills text[],
  result_rank real
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as result_id,
    c.name as result_name,
    c.current_role as result_current_role,
    c.location as result_location,
    c.technical_skills as result_technical_skills,
    ts_rank(c.search_vector, plainto_tsquery('english', search_query)) as result_rank
  FROM candidates c
  WHERE c.search_vector @@ plainto_tsquery('english', search_query)
  ORDER BY result_rank DESC, c.uploaded_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function for skill-based search
CREATE OR REPLACE FUNCTION search_candidates_by_skills(skills text[])
RETURNS TABLE (
  result_id uuid,
  result_name text,
  result_current_role text,
  result_location text,
  result_technical_skills text[],
  result_skill_matches integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as result_id,
    c.name as result_name,
    c.current_role as result_current_role,
    c.location as result_location,
    c.technical_skills as result_technical_skills,
    (
      SELECT COUNT(DISTINCT skill)
      FROM unnest(skills) AS skill
      WHERE 
        LOWER(skill) = ANY(SELECT LOWER(unnest(c.technical_skills)))
        OR LOWER(c.current_role) LIKE '%' || LOWER(skill) || '%'
        OR LOWER(c.summary) LIKE '%' || LOWER(skill) || '%'
        OR LOWER(c.resume_text) LIKE '%' || LOWER(skill) || '%'
    ) as result_skill_matches
  FROM candidates c
  WHERE (
    SELECT COUNT(DISTINCT skill)
    FROM unnest(skills) AS skill
    WHERE 
      LOWER(skill) = ANY(SELECT LOWER(unnest(c.technical_skills)))
      OR LOWER(c.current_role) LIKE '%' || LOWER(skill) || '%'
      OR LOWER(c.summary) LIKE '%' || LOWER(skill) || '%'
      OR LOWER(c.resume_text) LIKE '%' || LOWER(skill) || '%'
  ) > 0
  ORDER BY result_skill_matches DESC, c.uploaded_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to update search_vector
CREATE OR REPLACE FUNCTION update_candidates_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', 
    COALESCE(NEW.name, '') || ' ' ||
    COALESCE(NEW.current_role, '') || ' ' ||
    COALESCE(NEW.current_company, '') || ' ' ||
    COALESCE(NEW.location, '') || ' ' ||
    COALESCE(NEW.summary, '') || ' ' ||
    COALESCE(NEW.resume_text, '') || ' ' ||
    COALESCE(NEW.technical_skills::text, '') || ' ' ||
    COALESCE(NEW.soft_skills::text, '') || ' ' ||
    COALESCE(NEW.certifications::text, '') || ' ' ||
    COALESCE(NEW.languages_known::text, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_candidates_search_vector ON candidates;

-- Create trigger to automatically update search_vector
CREATE TRIGGER trigger_update_candidates_search_vector
  BEFORE INSERT OR UPDATE ON candidates
  FOR EACH ROW
  EXECUTE FUNCTION update_candidates_search_vector();

-- Grant permissions
GRANT SELECT ON candidates TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_candidates TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_candidates_by_skills TO anon, authenticated;

-- Update existing candidates with search_vector
UPDATE candidates 
SET search_vector = to_tsvector('english', 
  COALESCE(name, '') || ' ' ||
  COALESCE(current_role, '') || ' ' ||
  COALESCE(current_company, '') || ' ' ||
  COALESCE(location, '') || ' ' ||
  COALESCE(summary, '') || ' ' ||
  COALESCE(resume_text, '') || ' ' ||
  COALESCE(technical_skills::text, '') || ' ' ||
  COALESCE(soft_skills::text, '') || ' ' ||
  COALESCE(certifications::text, '') || ' ' ||
  COALESCE(languages_known::text, '')
)
WHERE search_vector IS NULL;