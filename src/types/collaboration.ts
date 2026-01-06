// Real-time Collaboration Types

export interface CollaboratorPresence {
  id: string;
  document_id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  avatar_url?: string;
  status: 'viewing' | 'editing' | 'idle' | 'typing' | 'commenting';
  cursor_x?: number;
  cursor_y?: number;
  selection_start?: number;
  selection_end?: number;
  active_field_id?: string;
  typing_indicator?: string;
  color: string;
  last_seen: string;
}

export interface CollaborationSession {
  id: string;
  document_id: string;
  user_id: string;
  started_at: string;
  last_heartbeat: string;
  cursor_position: CursorPosition;
  selection: Selection;
  viewport: Viewport;
  color: string;
  is_active: boolean;
  following_user_id?: string;
  permissions: CollaborationPermission;
}

export type CollaborationPermission = 'viewer' | 'commenter' | 'editor' | 'admin' | 'owner';

export interface CollaborationInvite {
  id: string;
  document_id: string;
  inviter_user_id: string;
  invitee_email: string;
  permission: CollaborationPermission;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expires_at: string;
  created_at: string;
  accepted_at?: string;
  token: string;
}

export interface CursorPosition {
  x: number;
  y: number;
  element_id?: string;
  field_id?: string;
  page?: number;
}

export interface Selection {
  start: number;
  end: number;
  field_id?: string;
  text?: string;
}

export interface Viewport {
  scrollX: number;
  scrollY: number;
  zoom: number;
}

export interface DocumentComment {
  id: string;
  document_id: string;
  user_id: string;
  parent_comment_id?: string;
  content: string;
  selection_start?: number;
  selection_end?: number;
  selection_text?: string;
  anchor_position?: AnchorPosition;
  status: 'open' | 'resolved';
  resolved_at?: string;
  resolved_by?: string;
  created_at: string;
  updated_at: string;
  replies?: DocumentComment[];
  reactions?: CommentReaction[];
  mentions?: CommentMention[];
  user?: {
    email?: string;
    name?: string;
    avatar_url?: string;
  };
  guest_email?: string;
  guest_name?: string;
}

export interface CommentMention {
  id: string;
  comment_id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  notified: boolean;
  created_at: string;
}

export interface AnchorPosition {
  field_id?: string;
  x: number;
  y: number;
  page?: number;
}

export interface CommentReaction {
  id: string;
  comment_id: string;
  user_id: string;
  reaction: string;
  created_at: string;
  guest_email?: string;
  guest_name?: string;
}

export interface DocumentActivity {
  id: string;
  document_id: string;
  user_id: string;
  action_type: ActivityActionType;
  action_details: Record<string, unknown>;
  field_id?: string;
  old_value?: unknown;
  new_value?: unknown;
  created_at: string;
  user?: {
    email?: string;
    name?: string;
    avatar_url?: string;
  };
}

export type ActivityActionType =
  | 'document_opened'
  | 'document_closed'
  | 'field_edited'
  | 'field_created'
  | 'field_deleted'
  | 'comment_added'
  | 'comment_resolved'
  | 'comment_replied'
  | 'version_created'
  | 'version_restored'
  | 'document_locked'
  | 'document_unlocked'
  | 'collaborator_joined'
  | 'collaborator_left'
  | 'follow_started'
  | 'follow_ended'
  | 'mention_created'
  | 'permission_changed'
  | 'invite_sent'
  | 'conflict_detected'
  | 'conflict_resolved';

export interface DocumentOperation {
  id: string;
  document_id: string;
  user_id: string;
  operation_type: OperationType;
  operation_data: OperationData;
  version_number: number;
  parent_version?: number;
  applied_at: string;
  conflict_status?: 'none' | 'detected' | 'resolved' | 'rejected';
}

export type OperationType = 'insert' | 'delete' | 'update' | 'move' | 'format';

export interface OperationData {
  field_id?: string;
  position?: number;
  length?: number;
  content?: string;
  attributes?: Record<string, unknown>;
  old_value?: unknown;
  new_value?: unknown;
}

export interface FollowSession {
  id: string;
  document_id: string;
  follower_user_id: string;
  leader_user_id: string;
  is_active: boolean;
  started_at: string;
  ended_at?: string;
}

export interface EditingConflict {
  id: string;
  document_id: string;
  field_id: string;
  user_ids: string[];
  operation_ids: string[];
  status: 'active' | 'resolved';
  resolved_by?: string;
  resolved_at?: string;
  resolution_type?: 'accept_mine' | 'accept_theirs' | 'merge' | 'manual';
  created_at: string;
}

export interface CollaborationNotification {
  id: string;
  user_id: string;
  document_id: string;
  type: 'mention' | 'comment' | 'reply' | 'invite' | 'conflict' | 'permission';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export interface CollaborationState {
  collaborators: CollaboratorPresence[];
  comments: DocumentComment[];
  activities: DocumentActivity[];
  operations: DocumentOperation[];
  followSessions: FollowSession[];
  conflicts: EditingConflict[];
  notifications: CollaborationNotification[];
  currentUserSession?: CollaborationSession;
  isConnected: boolean;
  lastSyncedVersion: number;
}

export interface TypingIndicator {
  user_id: string;
  user_name?: string;
  field_id?: string;
  started_at: string;
}

export interface ActiveEdit {
  user_id: string;
  user_name?: string;
  user_color: string;
  field_id: string;
  started_at: string;
}

// Predefined collaborator colors
export const COLLABORATOR_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#14B8A6', // Teal
  '#6366F1', // Indigo
];

export const getCollaboratorColor = (index: number): string => {
  return COLLABORATOR_COLORS[index % COLLABORATOR_COLORS.length];
};

export const REACTION_EMOJIS = ['👍', '👎', '❤️', '🎉', '🤔', '👀', '🔥', '✅'];

export const PERMISSION_LEVELS: Record<CollaborationPermission, { label: string; description: string; icon: string }> = {
  viewer: { label: 'Viewer', description: 'Can view document', icon: 'Eye' },
  commenter: { label: 'Commenter', description: 'Can view and comment', icon: 'MessageSquare' },
  editor: { label: 'Editor', description: 'Can edit document', icon: 'Edit' },
  admin: { label: 'Admin', description: 'Can manage permissions', icon: 'Settings' },
  owner: { label: 'Owner', description: 'Full control', icon: 'Crown' },
};
