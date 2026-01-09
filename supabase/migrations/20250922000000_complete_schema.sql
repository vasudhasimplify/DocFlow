-- Complete Document Analysis System Schema
-- This migration consolidates all necessary tables and schemas

-- =============================================
-- CORE TABLES
-- =============================================
-- document_templates already created at top

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  original_url TEXT,
  upload_source TEXT DEFAULT 'manual',
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  analysis_result JSONB DEFAULT '{}',
  extracted_text TEXT,
  confidence_score NUMERIC DEFAULT 0,
  template_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Document fields table for storing extracted form fields
CREATE TABLE IF NOT EXISTS public.document_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_type TEXT DEFAULT 'text',
  field_value TEXT,
  confidence NUMERIC DEFAULT 0,
  position JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Document templates table for storing custom templates
CREATE TABLE IF NOT EXISTS public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  fields JSONB NOT NULL DEFAULT '[]',
  field_count INTEGER NOT NULL DEFAULT 0,
  usage_count INTEGER NOT NULL DEFAULT 0,
  accuracy_score NUMERIC DEFAULT 0,
  is_public BOOLEAN DEFAULT false,
  sample_document_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Templates table (separate from document_templates)
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL DEFAULT 'General',
  version TEXT NOT NULL DEFAULT '1.0',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  fields JSONB NOT NULL DEFAULT '[]',
  field_count INTEGER NOT NULL DEFAULT 0,
  usage_count INTEGER NOT NULL DEFAULT 0,
  accuracy_score NUMERIC(5,2) DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT false,
  document_image TEXT, -- Store base64 encoded document image
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key for documents.template_id now that document_templates exists
ALTER TABLE public.documents
  ADD CONSTRAINT documents_template_id_fkey
  FOREIGN KEY (template_id)
  REFERENCES public.document_templates(id);

-- Processed documents table for storing analysis results
CREATE TABLE IF NOT EXISTS public.processed_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  template_id UUID REFERENCES public.document_templates(id),
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  processed_data JSONB DEFAULT '{}',
  confidence_score NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'processing',
  processing_steps JSONB DEFAULT '[]',
  extracted_text TEXT,
  raw_ocr_data JSONB DEFAULT '{}',
  document_metadata JSONB DEFAULT '{}',
  processing_metadata JSONB DEFAULT '{}',
  search_vector tsvector,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Document workflows table for managing document processing workflows
CREATE TABLE IF NOT EXISTS public.document_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  document_id UUID REFERENCES public.processed_documents(id),
  workflow_name TEXT NOT NULL,
  current_step INTEGER DEFAULT 1,
  total_steps INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  assignee TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  workflow_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Template usage logs table for tracking template usage
CREATE TABLE IF NOT EXISTS public.template_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.document_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  document_name TEXT,
  confidence_score NUMERIC,
  fields_matched INTEGER DEFAULT 0,
  total_fields INTEGER DEFAULT 0,
  analysis_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Form submissions table for storing form data
CREATE TABLE IF NOT EXISTS public.form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  template_id UUID,
  form_data JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  form_name TEXT NOT NULL,
  completion_percentage NUMERIC DEFAULT 0
);

-- Public forms table for forms that can be shared publicly
CREATE TABLE IF NOT EXISTS public.public_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  template_id UUID,
  form_config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_auth BOOLEAN NOT NULL DEFAULT false,
  allow_multiple_submissions BOOLEAN NOT NULL DEFAULT true,
  submission_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  form_title TEXT NOT NULL,
  form_description TEXT,
  public_url_slug TEXT UNIQUE,
  success_message TEXT DEFAULT 'Thank you for your submission!'
);

-- Public form submissions table for submissions from public forms
CREATE TABLE IF NOT EXISTS public.public_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_form_id UUID NOT NULL REFERENCES public.public_forms(id) ON DELETE CASCADE,
  user_id UUID, -- Optional, only if user is logged in
  form_data JSONB NOT NULL DEFAULT '{}',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  submitter_email TEXT,
  submitter_name TEXT,
  ip_address INET,
  user_agent TEXT
);

-- Extracted data table for storing field values
CREATE TABLE IF NOT EXISTS public.extracted_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.document_templates(id),
  field_id TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL,
  extracted_value TEXT,
  confidence_score NUMERIC DEFAULT 0,
  position_data JSONB DEFAULT '{}',
  validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'invalid', 'needs_review')),
  manually_corrected BOOLEAN DEFAULT false,
  corrected_value TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_data ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Documents policies
DROP POLICY IF EXISTS "Users can manage their own documents" ON public.documents;
CREATE POLICY "Users can manage their own documents"
ON public.documents
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Document fields policies
DROP POLICY IF EXISTS "Users can manage fields for their documents" ON public.document_fields;
CREATE POLICY "Users can manage fields for their documents"
ON public.document_fields
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.documents 
  WHERE documents.id = document_fields.document_id 
  AND documents.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.documents 
  WHERE documents.id = document_fields.document_id 
  AND documents.user_id = auth.uid()
));

-- Document templates policies
DROP POLICY IF EXISTS "Users can manage their own templates" ON public.document_templates;
DROP POLICY IF EXISTS "Users can view public templates" ON public.document_templates;

CREATE POLICY "Users can manage their own templates"
ON public.document_templates
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view public templates"
ON public.document_templates
FOR SELECT
USING (is_public = true OR auth.uid() = user_id);

-- Templates policies (separate table)
DROP POLICY IF EXISTS "Users can view their own templates" ON public.templates;
DROP POLICY IF EXISTS "Users can create their own templates" ON public.templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON public.templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON public.templates;

CREATE POLICY "Users can view their own templates"
ON public.templates
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own templates"
ON public.templates
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
ON public.templates
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
ON public.templates
FOR DELETE
USING (auth.uid() = user_id);

-- Processed documents policies
DROP POLICY IF EXISTS "Users can manage their own processed documents" ON public.processed_documents;
CREATE POLICY "Users can manage their own processed documents"
ON public.processed_documents
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Document workflows policies
DROP POLICY IF EXISTS "Users can manage their document workflows" ON public.document_workflows;
CREATE POLICY "Users can manage their document workflows"
ON public.document_workflows
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Template usage logs policies
DROP POLICY IF EXISTS "Users can manage their own usage logs" ON public.template_usage_logs;
CREATE POLICY "Users can manage their own usage logs"
ON public.template_usage_logs
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Form submissions policies
DROP POLICY IF EXISTS "Users can view their own form submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Users can create their own form submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Users can update their own form submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Users can delete their own form submissions" ON public.form_submissions;

CREATE POLICY "Users can view their own form submissions"
ON public.form_submissions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own form submissions"
ON public.form_submissions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own form submissions"
ON public.form_submissions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own form submissions"
ON public.form_submissions
FOR DELETE
USING (auth.uid() = user_id);

-- Public forms policies
DROP POLICY IF EXISTS "Users can manage their own public forms" ON public.public_forms;
DROP POLICY IF EXISTS "Anyone can view active public forms" ON public.public_forms;

CREATE POLICY "Users can manage their own public forms"
ON public.public_forms
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view active public forms"
ON public.public_forms
FOR SELECT
USING (is_active = true);

-- Public form submissions policies
DROP POLICY IF EXISTS "Form owners can view submissions to their forms" ON public.public_form_submissions;
DROP POLICY IF EXISTS "Anyone can submit to active public forms" ON public.public_form_submissions;
DROP POLICY IF EXISTS "Logged in users can view their own public form submissions" ON public.public_form_submissions;

CREATE POLICY "Form owners can view submissions to their forms"
ON public.public_form_submissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.public_forms 
    WHERE public.public_forms.id = public_form_submissions.public_form_id 
    AND public.public_forms.user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can submit to active public forms"
ON public.public_form_submissions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.public_forms 
    WHERE public.public_forms.id = public_form_submissions.public_form_id 
    AND public.public_forms.is_active = true
  )
);

CREATE POLICY "Logged in users can view their own public form submissions"
ON public.public_form_submissions
FOR SELECT
USING (auth.uid() = user_id);

-- Extracted data policies
DROP POLICY IF EXISTS "Users can view extracted data from their documents" ON public.extracted_data;
DROP POLICY IF EXISTS "Users can create extracted data for their documents" ON public.extracted_data;
DROP POLICY IF EXISTS "Users can update extracted data from their documents" ON public.extracted_data;
DROP POLICY IF EXISTS "Users can delete extracted data from their documents" ON public.extracted_data;

CREATE POLICY "Users can view extracted data from their documents"
ON public.extracted_data
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = extracted_data.document_id 
    AND documents.user_id = auth.uid()
));

CREATE POLICY "Users can create extracted data for their documents"
ON public.extracted_data
FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = extracted_data.document_id 
    AND documents.user_id = auth.uid()
));

CREATE POLICY "Users can update extracted data from their documents"
ON public.extracted_data
FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = extracted_data.document_id 
    AND documents.user_id = auth.uid()
));

CREATE POLICY "Users can delete extracted data from their documents"
ON public.extracted_data
FOR DELETE
USING (EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = extracted_data.document_id 
    AND documents.user_id = auth.uid()
));

-- =============================================
-- STORAGE CONFIGURATION
-- =============================================

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Update bucket settings for document types and size limits
UPDATE storage.buckets 
SET 
  allowed_mime_types = ARRAY[
    -- PDF
    'application/pdf',
    -- Word
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    -- Excel
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    -- PowerPoint
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    -- Text/CSV
    'text/plain',
    'text/csv',
    -- Images
    'image/jpeg',
    'image/png', 
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'image/svg+xml',
    -- Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    -- Rich text & OpenDocument
    'application/rtf',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation',
    -- Code/Data
    'application/json',
    'text/xml',
    'application/xml'
  ],
  file_size_limit = 104857600 -- 100MB limit
WHERE id = 'documents';

-- Storage policies
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;

CREATE POLICY "Users can upload their own documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own documents"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own documents"
ON storage.objects
FOR DELETE
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update search vector
CREATE OR REPLACE FUNCTION public.update_document_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector = to_tsvector('english', COALESCE(NEW.extracted_text, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update template usage count
CREATE OR REPLACE FUNCTION public.increment_template_usage(template_id_param UUID, confidence_param NUMERIC DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    UPDATE public.document_templates 
    SET usage_count = usage_count + 1,
        accuracy_score = CASE 
            WHEN confidence_param IS NOT NULL THEN 
                ((accuracy_score * usage_count) + confidence_param) / (usage_count + 1)
            ELSE accuracy_score 
        END,
        updated_at = now()
    WHERE id = template_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update field count when template is updated
CREATE OR REPLACE FUNCTION public.update_template_field_count()
RETURNS TRIGGER AS $$
BEGIN
    NEW.field_count = jsonb_array_length(NEW.fields);
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update document templates updated_at
CREATE OR REPLACE FUNCTION public.update_document_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update form submissions updated_at
CREATE OR REPLACE FUNCTION public.update_form_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_documents_updated_at ON public.documents;
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_document_templates_updated_at ON public.document_templates;
CREATE TRIGGER update_document_templates_updated_at
    BEFORE UPDATE ON public.document_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_processed_documents_updated_at ON public.processed_documents;
CREATE TRIGGER update_processed_documents_updated_at
    BEFORE UPDATE ON public.processed_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_document_workflows_updated_at ON public.document_workflows;
CREATE TRIGGER update_document_workflows_updated_at
    BEFORE UPDATE ON public.document_workflows
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_form_submissions_updated_at ON public.form_submissions;
CREATE TRIGGER update_form_submissions_updated_at
    BEFORE UPDATE ON public.form_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_form_submissions_updated_at();

DROP TRIGGER IF EXISTS update_public_forms_updated_at ON public.public_forms;
CREATE TRIGGER update_public_forms_updated_at
    BEFORE UPDATE ON public.public_forms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_extracted_data_updated_at ON public.extracted_data;
CREATE TRIGGER update_extracted_data_updated_at
    BEFORE UPDATE ON public.extracted_data
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_templates_updated_at ON public.templates;
CREATE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON public.templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_document_templates_updated_at_trigger ON public.document_templates;
CREATE TRIGGER update_document_templates_updated_at_trigger
    BEFORE UPDATE ON public.document_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_document_templates_updated_at();

-- Trigger for search vector updates
DROP TRIGGER IF EXISTS trigger_update_document_search_vector ON public.processed_documents;
CREATE TRIGGER trigger_update_document_search_vector
  BEFORE INSERT OR UPDATE OF extracted_text
  ON public.processed_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_document_search_vector();

-- Trigger to automatically update field count for templates
DROP TRIGGER IF EXISTS update_template_field_count_trigger ON public.document_templates;
CREATE TRIGGER update_template_field_count_trigger
    BEFORE UPDATE ON public.document_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_template_field_count();

-- =============================================
-- INDEXES
-- =============================================

-- Index for text search on processed documents
CREATE INDEX IF NOT EXISTS idx_processed_documents_extracted_text 
ON public.processed_documents USING gin(to_tsvector('english', extracted_text));

-- Index for search vector
CREATE INDEX IF NOT EXISTS idx_processed_documents_search_vector 
ON public.processed_documents USING gin(search_vector);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_processing_status ON public.documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_documents_template_id ON public.documents(template_id);
CREATE INDEX IF NOT EXISTS idx_extracted_data_document_id ON public.extracted_data(document_id);
CREATE INDEX IF NOT EXISTS idx_extracted_data_template_id ON public.extracted_data(template_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_user_id ON public.form_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_template_id ON public.form_submissions(template_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_status ON public.form_submissions(status);
CREATE INDEX IF NOT EXISTS idx_public_forms_user_id ON public.public_forms(user_id);
CREATE INDEX IF NOT EXISTS idx_public_forms_active ON public.public_forms(is_active);
CREATE INDEX IF NOT EXISTS idx_public_forms_slug ON public.public_forms(public_url_slug);
CREATE INDEX IF NOT EXISTS idx_public_form_submissions_form_id ON public.public_form_submissions(public_form_id);
CREATE INDEX IF NOT EXISTS idx_public_form_submissions_user_id ON public.public_form_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON public.templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_status ON public.templates(status);
CREATE INDEX IF NOT EXISTS idx_templates_document_type ON public.templates(document_type);