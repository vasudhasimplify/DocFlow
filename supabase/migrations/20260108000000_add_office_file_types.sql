-- Add support for PowerPoint, additional Office formats, and archives
-- This migration updates the documents bucket to accept more file types

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
    -- PowerPoint (NEW)
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
    'application/gzip',
    -- Rich text
    'application/rtf',
    'text/rtf',
    -- OpenDocument formats
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation',
    -- Code/Data files
    'application/json',
    'text/xml',
    'application/xml',
    'text/html',
    'text/markdown'
  ],
  file_size_limit = 104857600 -- 100MB limit (increased from 50MB)
WHERE id = 'documents';
