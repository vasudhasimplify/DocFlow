-- Fix retention policy template permissions
-- Allow authenticated users to update and insert templates

-- Drop existing policy
DROP POLICY IF EXISTS "All users can view retention templates" ON retention_policy_templates;

-- Add comprehensive policies for templates
CREATE POLICY "All users can view retention templates"
    ON retention_policy_templates FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can create templates"
    ON retention_policy_templates FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Users can update templates"
    ON retention_policy_templates FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Users can delete non-system templates"
    ON retention_policy_templates FOR DELETE
    TO authenticated
    USING (is_system_template = false OR is_system_template IS NULL);
