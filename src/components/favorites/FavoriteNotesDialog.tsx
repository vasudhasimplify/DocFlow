import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StickyNote, Save, X, Edit2 } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';

interface FavoriteNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentName: string;
}

export const FavoriteNotesDialog: React.FC<FavoriteNotesDialogProps> = ({
  open,
  onOpenChange,
  documentId,
  documentName,
}) => {
  const { favorites, updateFavoriteNotes } = useFavorites();
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [savedNotes, setSavedNotes] = useState('');

  useEffect(() => {
    if (open) {
      const favorite = favorites.find(f => f.document_id === documentId);
      const existingNotes = favorite?.notes || '';
      setNotes(existingNotes);
      setSavedNotes(existingNotes);
      // If there are no notes, start in editing mode; otherwise view mode
      setIsEditing(!existingNotes);
    }
  }, [documentId, favorites, open]);

  const handleSave = async () => {
    setSaving(true);
    await updateFavoriteNotes(documentId, notes);
    setSavedNotes(notes);
    setSaving(false);
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (savedNotes) {
      // If there are saved notes, go back to view mode
      setNotes(savedNotes);
      setIsEditing(false);
    } else {
      // If no saved notes, close the dialog
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-yellow-500" />
            Notes for Favorite
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            Document: <span className="font-medium text-foreground">{documentName}</span>
          </div>
          
          {!isEditing && savedNotes ? (
            // Read-only view
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Your Notes</Label>
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit2 className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              </div>
              <div className="bg-muted/50 rounded-md p-3 min-h-[120px]">
                <p className="text-sm whitespace-pre-wrap">{savedNotes}</p>
              </div>
            </div>
          ) : (
            // Editing view
            <div className="space-y-2">
              <Label htmlFor="notes">Your Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add notes about why this document is important, reminders, or any other context..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                className="resize-none"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {notes.length}/500 characters
              </p>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          {!isEditing && savedNotes ? (
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancel}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Notes'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
