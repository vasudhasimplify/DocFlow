-- Signature Requests Table
create table if not exists signature_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  message text,
  document_name text,
  document_url text,
  status text not null default 'draft' check (status in ('draft', 'pending', 'completed', 'cancelled', 'expired', 'declined')),
  signing_order text default 'parallel' check (signing_order in ('parallel', 'sequential')),
  current_signer_index integer default 0,
  expires_at timestamp with time zone,
  reminder_frequency_days integer default 3,
  is_template boolean default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Signature Signers Table
create table if not exists signature_signers (
  id uuid default gen_random_uuid() primary key,
  request_id uuid references signature_requests on delete cascade not null,
  name text not null,
  email text not null,
  role text default 'signer' check (role in ('signer', 'approver', 'viewer', 'cc')),
  signing_order integer default 0,
  status text default 'pending' check (status in ('pending', 'sent', 'viewed', 'signed', 'declined')),
  access_token uuid default gen_random_uuid(),
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Index for faster lookups
  unique(request_id, email)
);

-- RLS Policies
alter table signature_requests enable row level security;
alter table signature_signers enable row level security;

-- Policies for Request Creators (User who owns the request)
create policy "Users can view their own requests"
  on signature_requests for select
  using (auth.uid() = user_id);

create policy "Users can insert their own requests"
  on signature_requests for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own requests"
  on signature_requests for update
  using (auth.uid() = user_id);

create policy "Users can delete their own requests"
  on signature_requests for delete
  using (auth.uid() = user_id);

-- Policies for Signers (via request ownership for now, complex public access handling comes later)
-- For now, we assume the dashboard is only for the Sender. 
-- Signers would typically access via a public link (access_token) which requires different policies or a service role function.
-- To keep it simple for this dashboard view: we join tables.

create policy "Users can view signers for their requests"
  on signature_signers for select
  using (
    exists (
      select 1 from signature_requests
      where signature_requests.id = signature_signers.request_id
      and signature_requests.user_id = auth.uid()
    )
  );

create policy "Users can insert signers for their requests"
  on signature_signers for insert
  with check (
    exists (
      select 1 from signature_requests
      where signature_requests.id = signature_signers.request_id
      and signature_requests.user_id = auth.uid()
    )
  );
  
create policy "Users can update signers for their requests"
  on signature_signers for update
  using (
    exists (
      select 1 from signature_requests
      where signature_requests.id = signature_signers.request_id
      and signature_requests.user_id = auth.uid()
    )
  );

create policy "Users can delete signers for their requests"
  on signature_signers for delete
  using (
    exists (
      select 1 from signature_requests
      where signature_requests.id = signature_signers.request_id
      and signature_requests.user_id = auth.uid()
    )
  );
