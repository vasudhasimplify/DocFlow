-- Create Employees Table for Workflow Assignments
-- This table stores employee information for workflow step assignments

CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL, -- 'manager', 'ca', 'accountant', 'clerk', 'reviewer', 'approver', etc.
    department TEXT, -- 'finance', 'hr', 'operations', 'legal', etc.
    phone TEXT,
    employee_code TEXT UNIQUE,
    designation TEXT,
    reporting_manager_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    can_approve BOOLEAN DEFAULT false,
    can_review BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_role ON public.employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_department ON public.employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON public.employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_reporting_manager ON public.employees(reporting_manager_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_employees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_employees_updated_at
    BEFORE UPDATE ON public.employees
    FOR EACH ROW
    EXECUTE FUNCTION update_employees_updated_at();

-- Enable Row Level Security
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users"
    ON public.employees FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert for authenticated users"
    ON public.employees FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
    ON public.employees FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Enable delete for authenticated users"
    ON public.employees FOR DELETE
    TO authenticated
    USING (true);

-- Insert sample employees
INSERT INTO public.employees (email, full_name, role, department, designation, is_active, can_approve, can_review)
VALUES 
    ('manager@company.com', 'John Manager', 'manager', 'finance', 'Finance Manager', true, true, true),
    ('ca@company.com', 'Sarah CA', 'ca', 'finance', 'Chartered Accountant', true, true, true),
    ('accountant@company.com', 'Michael Accountant', 'accountant', 'finance', 'Senior Accountant', true, false, true),
    ('clerk@company.com', 'Emily Clerk', 'clerk', 'operations', 'Data Entry Clerk', true, false, false),
    ('reviewer@company.com', 'David Reviewer', 'reviewer', 'operations', 'Document Reviewer', true, false, true),
    ('hr.manager@company.com', 'Lisa HR', 'manager', 'hr', 'HR Manager', true, true, true),
    ('legal.advisor@company.com', 'Robert Legal', 'legal', 'legal', 'Legal Advisor', true, true, true),
    ('operations.head@company.com', 'Jennifer Ops', 'manager', 'operations', 'Operations Head', true, true, true)
ON CONFLICT (email) DO NOTHING;

-- Add comment
COMMENT ON TABLE public.employees IS 'Stores employee information for workflow step assignments and organizational structure';

-- Create view for quick employee lookup with manager info
CREATE OR REPLACE VIEW public.v_employees_with_manager AS
SELECT 
    e.id,
    e.email,
    e.full_name,
    e.role,
    e.department,
    e.designation,
    e.is_active,
    e.can_approve,
    e.can_review,
    e.phone,
    e.employee_code,
    m.full_name as manager_name,
    m.email as manager_email
FROM public.employees e
LEFT JOIN public.employees m ON e.reporting_manager_id = m.id
WHERE e.is_active = true
ORDER BY e.department, e.role, e.full_name;

-- Verify data
SELECT 
    email,
    full_name,
    role,
    department,
    designation,
    can_approve,
    can_review,
    is_active
FROM public.employees
ORDER BY department, role;
