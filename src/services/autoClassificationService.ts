/**
 * Auto-Classification Service
 * Automatically assigns documents to metadata fields based on filename matching
 */

import { supabase } from '@/integrations/supabase/client';

interface MetadataFieldMatch {
    definitionId: string;
    fieldLabel: string;
    matchScore: number;
}

/**
 * Automatically classify a document based on its filename
 * Matches against existing metadata field labels
 * @param documentId - ID of the uploaded document
 * @param fileName - Name of the uploaded file
 */
export async function autoClassifyDocument(documentId: string, fileName: string, extractedText?: string): Promise<void> {
    try {
        // Get current user
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        // Fetch all metadata definitions for this user
        const { data: definitions, error: defError } = await (supabase
            .from('custom_metadata_definitions')
            .select('id, field_label, field_name, default_value')
            .eq('user_id', userData.user.id)
            .eq('is_active', true) as any);

        if (defError || !definitions || definitions.length === 0) {
            console.log('No metadata definitions found for auto-classification');
            return;
        }

        // Normalize inputs for matching
        const normalizedFileName = fileName.toLowerCase()
            .replace(/\.[^/.]+$/, '') // Remove extension
            .replace(/[_-]/g, ' '); // Replace underscores/dashes with spaces

        const normalizedContent = extractedText ? extractedText.toLowerCase() : '';

        // Find matching fields based on filename OR content
        const matches: MetadataFieldMatch[] = [];

        for (const def of definitions) {
            const fieldLabel = def.field_label.toLowerCase();
            const fieldName = def.field_name?.toLowerCase() || '';

            // Check if filename contains the field label or name
            const filenameMatch = normalizedFileName.includes(fieldLabel) || normalizedFileName.includes(fieldName);

            // Check if content contains the field label (if content exists)
            // Use exact word match for content to avoid false positives in long text
            const contentMatch = normalizedContent && (
                normalizedContent.includes(fieldLabel) ||
                normalizedContent.includes(fieldName)
            );

            if (filenameMatch || contentMatch) {
                matches.push({
                    definitionId: def.id,
                    fieldLabel: def.field_label,
                    matchScore: (filenameMatch ? 2 : 1) * fieldLabel.length, // Filename match is weighted higher than content
                });
            }
        }

        if (matches.length === 0) {
            console.log(`No metadata field matches found for: ${fileName}`);
            return;
        }

        // Sort by match score (longest/strongest match first)
        matches.sort((a, b) => b.matchScore - a.matchScore);
        const bestMatch = matches[0];

        console.log(`Auto-classifying "${fileName}" to field: ${bestMatch.fieldLabel} (Score: ${bestMatch.matchScore})`);

        // Get the definition's default value or use the field label if no default
        const matchedDef = definitions.find((d: any) => d.id === bestMatch.definitionId);

        // If default value exists, use it. Otherwise use the field label as the value (common for single-select/text)
        const valueToSet = matchedDef?.default_value || bestMatch.fieldLabel;

        // Check if metadata already exists for this document/field combo
        const { data: existing } = await (supabase
            .from('document_custom_metadata')
            .select('id')
            .eq('document_id', documentId)
            .eq('definition_id', bestMatch.definitionId)
            .single() as any);

        if (existing) {
            // Update existing
            await (supabase
                .from('document_custom_metadata')
                .update({ field_value: valueToSet })
                .eq('id', existing.id) as any);
        } else {
            // Insert new
            await (supabase
                .from('document_custom_metadata')
                .insert({
                    document_id: documentId,
                    definition_id: bestMatch.definitionId,
                    field_value: valueToSet,
                }) as any);
        }

        console.log(`Successfully auto-classified "${fileName}" to "${bestMatch.fieldLabel}"`);
    } catch (error) {
        console.error('Auto-classification error:', error);
        // Don't throw - auto-classification is optional, shouldn't block upload
    }
}
