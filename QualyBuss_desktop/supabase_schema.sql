-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- Create Collaborators Table
create table if not exists public.collaborators (
    id uuid default uuid_generate_v4() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    -- Status
    active boolean default true,
    avatar_url text,
    
    -- Personal Info (JSONB for flexibility or structured columns)
    -- Opting for structured columns for easier querying/indexing in an ERP context
    full_name text not null,
    cpf text unique,
    rg text,
    birth_date date,
    marital_status text,
    gender text,
    
    -- Address (Composite or JSON)
    address_street text,
    address_number text,
    address_complement text,
    address_neighborhood text,
    address_city text,
    address_state text,
    address_zip_code text,
    
    -- Contact
    phone text,
    personal_email text,
    
    -- Professional Info
    role text, -- Cargo
    cbo text, -- CBO (Classificação Brasileira de Ocupações) - REQUESTED
    department text,
    manager_id uuid references public.collaborators(id),
    corporate_email text unique,
    admission_date date,
    pis text, -- PIS (Programa de Integração Social) - REQUESTED
    
    -- Contract Info
    contract_type text check (contract_type in ('CLT', 'PJ', 'Estágio')),
    contract_status text default 'Ativo',
    salary numeric(10,2),
    work_regime text check (work_regime in ('Presencial', 'Híbrido', 'Remoto')),
    
    -- History encoded as JSONB allows flexible event logging without strict schema for every event type
    history jsonb default '[]'::jsonb
);

-- Enable Row Level Security (RLS)
alter table public.collaborators enable row level security;

-- Policies (Adjust based on your Auth setup)
-- Allow read for authenticated users
create policy "Enable read access for authenticated users"
on public.collaborators for select
to authenticated
using (true);

-- Allow insert/update/delete for authenticated users (Simpler for now, refine for Admin only later)
create policy "Enable write access for authenticated users"
on public.collaborators for all
to authenticated
using (true)
with check (true);
