import { createClient } from '@/utils/supabase/client';
import type { 
  Channel, 
  Message, 
  ChannelParticipant, 
  CreateChannelRequest, 
  SendMessageRequest,
  MessageReaction,
  UserPresence,
  FileUploadResponse
} from '@/types/messaging';

const supabase = createClient();

export class MessagingService {
  // Channel operations
  static async getChannels(userId: string): Promise<Channel[]> {
    try {
      const { data, error } = await supabase
        .from('channels')
        .select(`
          *,
          channel_participants!inner(user_id, last_read_at)
        `)
        .eq('channel_participants.user_id', userId)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching channels:', error);
      return [];
    }
  }

  static async createChannel(request: CreateChannelRequest, creatorId: string): Promise<Channel | null> {
    try {
      // Create the channel
      const { data: channel, error: channelError } = await supabase
        .from('channels')
        .insert({
          name: request.name,
          description: request.description,
          type: request.type,
          created_by: creatorId,
          participant_ids: request.type === 'direct' ? request.participant_ids : undefined
        })
        .select()
        .single();

      if (channelError) throw channelError;

      // Add participants
      const participants = request.type === 'direct' 
        ? request.participant_ids || []
        : [creatorId, ...(request.participant_ids || [])];

      const participantInserts = participants.map(userId => ({
        channel_id: channel.id,
        user_id: userId,
        role: userId === creatorId ? 'admin' : 'member'
      }));

      const { error: participantError } = await supabase
        .from('channel_participants')
        .insert(participantInserts);

      if (participantError) throw participantError;

      return channel;
    } catch (error) {
      console.error('Error creating channel:', error);
      return null;
    }
  }

  static async createDirectMessage(userId1: string, userId2: string): Promise<string | null> {
    try {
      const { data } = await supabase.rpc('create_direct_message_channel', {
        user1_id: userId1,
        user2_id: userId2
      });
      
      return data;
    } catch (error) {
      console.error('Error creating direct message:', error);
      return null;
    }
  }

  static async joinChannel(channelId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('channel_participants')
        .insert({
          channel_id: channelId,
          user_id: userId,
          role: 'member'
        });

      return !error;
    } catch (error) {
      console.error('Error joining channel:', error);
      return false;
    }
  }

  static async leaveChannel(channelId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('channel_participants')
        .delete()
        .eq('channel_id', channelId)
        .eq('user_id', userId);

      return !error;
    } catch (error) {
      console.error('Error leaving channel:', error);
      return false;
    }
  }

  // Message operations
  static async getMessages(channelId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          user:profiles(id, full_name, avatar_url, email),
          reactions:message_reactions(
            id, emoji, user_id,
            user:profiles(id, full_name, avatar_url)
          ),
          attachments:message_attachments(*),
          mentions:message_mentions(
            id, mentioned_user_id,
            mentioned_user:profiles(id, full_name, avatar_url)
          )
        `)
        .eq('channel_id', channelId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return (data || []).reverse(); // Reverse to show oldest first
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  static async sendMessage(request: SendMessageRequest): Promise<Message | null> {
    try {
      // Get current user ID from auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          channel_id: request.channel_id,
          user_id: user.id, // Use the authenticated user's ID
          content: request.content,
          message_type: request.message_type || 'text',
          parent_message_id: request.parent_message_id,
          file_url: request.file_url,
          file_name: request.file_name,
          file_size: request.file_size,
          file_type: request.file_type
        })
        .select(`
          *,
          user:profiles(id, full_name, avatar_url, email)
        `)
        .single();

      if (messageError) throw messageError;

      // Handle mentions
      if (request.mentioned_user_ids && request.mentioned_user_ids.length > 0) {
        const mentions = request.mentioned_user_ids.map(userId => ({
          message_id: message.id,
          mentioned_user_id: userId
        }));

        await supabase.from('message_mentions').insert(mentions);
      }

      // Update channel's updated_at timestamp
      await supabase
        .from('channels')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', request.channel_id);

      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  }

  static async editMessage(messageId: string, content: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ 
          content, 
          is_edited: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId);

      return !error;
    } catch (error) {
      console.error('Error editing message:', error);
      return false;
    }
  }

  static async deleteMessage(messageId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_deleted: true })
        .eq('id', messageId);

      return !error;
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  }

  // Reaction operations
  static async addReaction(messageId: string, userId: string, emoji: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: userId,
          emoji
        });

      return !error;
    } catch (error) {
      console.error('Error adding reaction:', error);
      return false;
    }
  }

  static async removeReaction(messageId: string, userId: string, emoji: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .eq('emoji', emoji);

      return !error;
    } catch (error) {
      console.error('Error removing reaction:', error);
      return false;
    }
  }

  // Channel participants
  static async getChannelParticipants(channelId: string): Promise<ChannelParticipant[]> {
    try {
      const { data, error } = await supabase
        .from('channel_participants')
        .select(`
          *,
          user:profiles(id, full_name, avatar_url, email, is_active)
        `)
        .eq('channel_id', channelId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching participants:', error);
      return [];
    }
  }

  // User presence
  static async updatePresence(userId: string, status: UserPresence['status'], customStatus?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: userId,
          status,
          custom_status: customStatus,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      return !error;
    } catch (error) {
      console.error('Error updating presence:', error);
      return false;
    }
  }

  static async getUsersPresence(userIds: string[]): Promise<UserPresence[]> {
    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select('*')
        .in('user_id', userIds);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching presence:', error);
      return [];
    }
  }

  // File upload
  static async uploadFile(file: File, channelId: string): Promise<FileUploadResponse | null> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `messages/${channelId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('message-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('message-files')
        .getPublicUrl(filePath);

      return {
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        file_type: fileExt || '',
        mime_type: file.type
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  }

  // Search messages
  static async searchMessages(query: string, channelId?: string): Promise<Message[]> {
    try {
      let queryBuilder = supabase
        .from('messages')
        .select(`
          *,
          user:profiles(id, full_name, avatar_url, email)
        `)
        .textSearch('content', query)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (channelId) {
        queryBuilder = queryBuilder.eq('channel_id', channelId);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching messages:', error);
      return [];
    }
  }

  // Mark channel as read
  static async markChannelAsRead(channelId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('mark_channel_as_read', {
        user_id: userId,
        channel_id: channelId
      });

      return !error;
    } catch (error) {
      console.error('Error marking channel as read:', error);
      return false;
    }
  }

  // Get all users (for mentions and DMs)
  static async getAllUsers(): Promise<ChannelParticipant['user'][]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email, is_active')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  // Real-time subscriptions
  static subscribeToChannel(channelId: string, onMessage: (message: Message) => void) {
    return supabase
      .channel(`messages:${channelId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${channelId}`
      }, (payload) => {
        onMessage(payload.new as Message);
      })
      .subscribe();
  }

  static subscribeToChannels(userId: string, onChannelUpdate: (channel: Channel) => void) {
    return supabase
      .channel(`user-channels:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'channels'
      }, (payload) => {
        onChannelUpdate(payload.new as Channel);
      })
      .subscribe();
  }

  static subscribeToPresence(onPresenceUpdate: (presence: UserPresence) => void) {
    return supabase
      .channel('user-presence')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_presence'
      }, (payload) => {
        onPresenceUpdate(payload.new as UserPresence);
      })
      .subscribe();
  }
}