import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
  MoreHorizontal, 
  ExternalLink, 
  Share2, 
  Link, 
  Star, 
  FolderPlus, 
  Download,
  Trash2,
  FileEdit,
  Eye,
  Sparkles,
  GitCompare,
  History,
  FileText,
  Lock,
  Shield,
  Pin,
  Link2,
  UserMinus,
  GitBranch,
} from 'lucide-react';

interface Document {
  id: string;
  file_name: string;
  storage_url?: string | null;
}

interface DocumentContextMenuProps {
  document: Document;
  onView: () => void;
  onDownload: () => void;
  onShare: () => void;
  onCopyLink: () => void;
  onFavorite?: () => void;
  onAddToFolder?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onAISummary?: () => void;
  onCompare?: () => void;
  onVersionHistory?: () => void;
  onCheckOut?: () => void;
  onTransferOwnership?: () => void;
  onCompliance?: () => void;
  onCreateShortcut?: () => void;
  onPinToQuickAccess?: () => void;
  onStartWorkflow?: () => void;
  isPinned?: boolean;
}

export const DocumentContextMenu: React.FC<DocumentContextMenuProps> = ({
  document,
  onView,
  onDownload,
  onShare,
  onCopyLink,
  onFavorite,
  onAddToFolder,
  onRename,
  onDelete,
  onAISummary,
  onCompare,
  onVersionHistory,
  onCheckOut,
  onTransferOwnership,
  onCompliance,
  onCreateShortcut,
  onPinToQuickAccess,
  onStartWorkflow,
  isPinned,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="hover:bg-primary/10"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* Open Actions */}
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
          <Eye className="w-4 h-4 mr-3" />
          Open
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
          <ExternalLink className="w-4 h-4 mr-3" />
          Open in new tab
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* AI & Smart Actions */}
        {onAISummary && (
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAISummary(); }}>
            <Sparkles className="w-4 h-4 mr-3 text-primary" />
            AI Summary
          </DropdownMenuItem>
        )}
        {onCompare && (
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCompare(); }}>
            <GitCompare className="w-4 h-4 mr-3" />
            Compare versions
          </DropdownMenuItem>
        )}
        {onVersionHistory && (
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onVersionHistory(); }}>
            <History className="w-4 h-4 mr-3" />
            Version history
          </DropdownMenuItem>
        )}
        
        {(onAISummary || onCompare || onVersionHistory) && <DropdownMenuSeparator />}
        Workflow Actions */}
        {onStartWorkflow && (
          <>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStartWorkflow(); }}>
              <GitBranch className="w-4 h-4 mr-3 text-primary" />
              Start Workflow
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        
        {/* 
        {/* Share & Collaborate */}
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShare(); }}>
          <Share2 className="w-4 h-4 mr-3" />
          Share
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCopyLink(); }}>
          <Link className="w-4 h-4 mr-3" />
          Copy link
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Organize */}
        {onPinToQuickAccess && (
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPinToQuickAccess(); }}>
            <Pin className={`w-4 h-4 mr-3 ${isPinned ? 'text-primary' : ''}`} />
            {isPinned ? 'Unpin from Quick Access' : 'Pin to Quick Access'}
          </DropdownMenuItem>
        )}
        {onFavorite && (
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onFavorite(); }}>
            <Star className="w-4 h-4 mr-3" />
            Add to favorites
          </DropdownMenuItem>
        )}
        {onAddToFolder && (
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAddToFolder(); }}>
            <FolderPlus className="w-4 h-4 mr-3" />
            Add to folder
          </DropdownMenuItem>
        )}
        {onCreateShortcut && (
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCreateShortcut(); }}>
            <Link2 className="w-4 h-4 mr-3" />
            Create shortcut
          </DropdownMenuItem>
        )}
        
        {(onFavorite || onAddToFolder || onPinToQuickAccess || onCreateShortcut) && <DropdownMenuSeparator />}
        
        {/* Document Actions */}
        {onCheckOut && (
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCheckOut(); }}>
            <Lock className="w-4 h-4 mr-3" />
            Check out
          </DropdownMenuItem>
        )}
        {onTransferOwnership && (
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onTransferOwnership(); }}>
            <UserMinus className="w-4 h-4 mr-3" />
            Transfer Ownership
          </DropdownMenuItem>
        )}
        {onCompliance && (
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCompliance(); }}>
            <Shield className="w-4 h-4 mr-3" />
            Compliance labels
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDownload(); }}>
          <Download className="w-4 h-4 mr-3" />
          Download
        </DropdownMenuItem>
        
        {onRename && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(); }}>
              <FileEdit className="w-4 h-4 mr-3" />
              Rename
            </DropdownMenuItem>
          </>
        )}
        
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-3" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
