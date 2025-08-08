// Types for the messaging system

export interface Channel {
  id: string;
  name?: string; // null for direct messages
  description?: string;
  type: 'public' | 'private' | 'direct';
  created_by?: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  participant_ids?: string[]; // for direct messages
  unread_count?: number; // calculated field
}

export interface ChannelParticipant {
  id: string;
  channel_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  last_read_at: string;
  is_muted: boolean;
  // Populated from profiles table
  user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    email: string;
    is_active: boolean;
  };
}

export interface Message {
  id: string;
  channel_id: string;
  sender_id: string; // renamed from user_id to reflect DB schema
  content?: string;
  message_type: 'text' | 'file' | 'image' | 'system';
  parent_message_id?: string; // for threading
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  is_deleted: boolean;
  // For file messages
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  // Populated fields
  user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    email: string;
  };
  reactions?: MessageReaction[];
  attachments?: MessageAttachment[];
  mentions?: MessageMention[];
  replies?: Message[]; // for threading
  reply_count?: number;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  // Populated fields
  user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  file_type?: string;
  mime_type?: string;
  uploaded_by?: string;
  created_at: string;
}

export interface MessageMention {
  id: string;
  message_id: string;
  mentioned_user_id: string;
  created_at: string;
  // Populated fields
  mentioned_user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export interface UserPresence {
  user_id: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  last_seen: string;
  custom_status?: string;
  updated_at: string;
}

// UI State Types
export interface MessagingState {
  channels: Channel[];
  activeChannelId?: string;
  messages: Record<string, Message[]>; // channelId -> messages
  participants: Record<string, ChannelParticipant[]>; // channelId -> participants
  userPresence: Record<string, UserPresence>; // userId -> presence
  loading: boolean;
  error?: string;
  searchQuery?: string;
  searchResults?: Message[];
}

// API Response Types
export interface ChannelsResponse {
  data: Channel[];
  error?: string;
}

export interface MessagesResponse {
  data: Message[];
  error?: string;
}

export interface CreateChannelRequest {
  name?: string;
  description?: string;
  type: 'public' | 'private' | 'direct';
  participant_ids?: string[]; // for direct messages and private channels
}

export interface SendMessageRequest {
  channel_id: string;
  content?: string;
  message_type?: 'text' | 'file' | 'image';
  parent_message_id?: string; // for replies
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  mentioned_user_ids?: string[];
}

export interface FileUploadResponse {
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  mime_type: string;
}

// Component Props Types
export interface MessagingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export interface ChannelListProps {
  channels: Channel[];
  activeChannelId?: string;
  onChannelSelect: (channelId: string) => void;
  onCreateChannel: () => void;
  currentUserId: string;
}

export interface MessageListProps {
  messages: Message[];
  channelId: string;
  currentUserId: string;
  onLoadMore?: () => void;
  onReaction: (messageId: string, emoji: string) => void;
  onReply: (message: Message) => void;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
}

export interface MessageInputProps {
  channelId: string;
  currentUserId: string;
  onSendMessage: (request: SendMessageRequest) => void;
  onFileUpload: (files: FileList) => void;
  replyingTo?: Message;
  onCancelReply?: () => void;
}

export interface UserListProps {
  participants: ChannelParticipant[];
  userPresence: Record<string, UserPresence>;
  onStartDM: (userId: string) => void;
  currentUserId: string;
}

// Utility Types
export interface ChannelWithDetails extends Channel {
  participants: ChannelParticipant[];
  last_message?: Message;
  unread_count: number;
}

export interface MessageWithDetails extends Message {
  user: {
    id: string;
    full_name: string;
    avatar_url?: string;
    email: string;
  };
  reactions: MessageReaction[];
  attachments: MessageAttachment[];
  mentions: MessageMention[];
  replies: Message[];
  reply_count: number;
}

// Real-time event types
export interface RealtimeMessageEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: Message;
  old?: Message;
}

export interface RealtimeChannelEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: Channel;
  old?: Channel;
}

export interface RealtimePresenceEvent {
  eventType: 'UPDATE';
  user_id: string;
  status: UserPresence['status'];
  last_seen: string;
}