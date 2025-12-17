-- Create document_watermarks table
create table if not exists document_watermarks (
  id uuid default gen_random_uuid() primary key,
  document_id uuid references documents, -- Nullable for template/default watermarks
  user_id uuid references auth.users not null,
  name text not null,
  is_default boolean default false,
  watermark_type text not null check (watermark_type in ('text', 'image', 'pattern')),
  text_content text,
  font_family text default 'Arial',
  font_size integer default 48,
  text_color text default '#00000033',
  rotation integer default -45,
  opacity float default 0.3,
  position text default 'center' check (position in ('center', 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'tile')),
  image_url text,
  include_date boolean default false,
  include_username boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table document_watermarks enable row level security;

create policy "Users can view their own watermarks"
  on document_watermarks for select
  using (auth.uid() = user_id);

create policy "Users can insert their own watermarks"
  on document_watermarks for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own watermarks"
  on document_watermarks for update
  using (auth.uid() = user_id);

create policy "Users can delete their own watermarks"
  on document_watermarks for delete
  using (auth.uid() = user_id);

-- Indexes for performance
create index if not exists idx_watermarks_user_id on document_watermarks(user_id);
create index if not exists idx_watermarks_document_id on document_watermarks(document_id);
