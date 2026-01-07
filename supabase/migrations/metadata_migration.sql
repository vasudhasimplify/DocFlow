-- Custom Metadata Definitions
create table if not exists custom_metadata_definitions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  field_name text not null,
  field_type text not null,
  field_label text not null,
  description text,
  is_required boolean default false,
  default_value text,
  options text[],
  validation_rules jsonb,
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Composite unique key to allow same field name for different users
  unique(user_id, field_name)
);

-- RLS Policies for Definitions
alter table custom_metadata_definitions enable row level security;

create policy "Users can view their own definitions"
  on custom_metadata_definitions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own definitions"
  on custom_metadata_definitions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own definitions"
  on custom_metadata_definitions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own definitions"
  on custom_metadata_definitions for delete
  using (auth.uid() = user_id);

-- Document Custom Metadata
create table if not exists document_custom_metadata (
  id uuid default gen_random_uuid() primary key,
  document_id uuid references documents not null,
  definition_id uuid references custom_metadata_definitions not null,
  user_id uuid references auth.users not null,
  field_value text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  unique(document_id, definition_id)
);

-- RLS Policies for Document Metadata
alter table document_custom_metadata enable row level security;

create policy "Users can view their own document metadata"
  on document_custom_metadata for select
  using (auth.uid() = user_id);

create policy "Users can insert their own document metadata"
  on document_custom_metadata for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own document metadata"
  on document_custom_metadata for update
  using (auth.uid() = user_id);

create policy "Users can delete their own document metadata"
  on document_custom_metadata for delete
  using (auth.uid() = user_id);
