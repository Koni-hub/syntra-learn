-- Add structured_content column to modules table
-- This stores table data, section headings, and layout info extracted from PDFs

ALTER TABLE modules ADD COLUMN IF NOT EXISTS structured_content JSONB;

-- Update the Module type comment
COMMENT ON COLUMN modules.structured_content IS 'Structured content extracted from PDFs: tables, sections, page count, hasImages, source';
