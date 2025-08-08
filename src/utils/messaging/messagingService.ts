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

// Helper function for better error logging
const logError = (operation: string, error: any) => {
  console.error(`❌ MessagingService.${operation}:`, {
    message: (error && (error.message || error.error_description || error.code)) || 'Unknown error',
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    error
  });
};

export class MessagingService {
  // Channel operations
  static async getChannels(userId: string): Promise<Channel[]> {
    try {
      console.log('🔍 MessagingService.getChannels: Starting for user', userId);
      
      const { data, error } = await supabase
        .from('channels')
        .select(`
          *,
          channel_members!inner(user_id, last_read_at)
        `)
        .eq('channel_members.user_id', userId)
        .eq('is_archived', false)
        .order('last_message_at', { ascending: false });

      if (error) {
        logError('getChannels', error);
        
        if (error.code === '42P01') {
          console.error('💡 The messaging tables don\'t exist. Please run the messaging schema first.');
          console.error('💡 Run the messaging_schema_fixed.sql file in your Supabase SQL editor.');
        }
        
        throw error;
      }

      console.log('✅ MessagingService.getChannels: Found', data?.length || 0, 'channels');
      return data || [];
    } catch (error) {
      logError('getChannels', error);
      return [];
    }
  }

  static async createChannel(request: CreateChannelRequest, creatorId: string): Promise<Channel | null> {
    try {
      console.log('🔍 MessagingService.createChannel: Creating channel', request.name);
      
      // Create the channel (compatible with schemas lacking participant_ids/updated_at)
      const { data: channel, error: channelError } = await supabase
        .from('channels')
        .insert({
          name: request.name,
          description: request.description,
          type: request.type,
          created_by: creatorId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (channelError) {
        logError('createChannel', channelError);
        throw channelError;
      }

      // Add participants to channel_members table
      const participants = [creatorId, ...(request.participant_ids || [])];

      const participantInserts = participants.map(userId => ({
        channel_id: channel.id,
        user_id: userId,
        role: userId === creatorId ? 'admin' : 'member',
        joined_at: new Date().toISOString(),
        last_read_at: new Date().toISOString()
      }));

      const { error: participantError } = await supabase
        .from('channel_members')
        .insert(participantInserts);

      if (participantError) {
        logError('createChannel.participants', participantError);
        throw participantError;
      }

      console.log('✅ MessagingService.createChannel: Created channel', channel.id);
      return channel;
    } catch (error) {
      logError('createChannel', error);
      return null;
    }
  }

  static async createDirectMessage(userId1: string, userId2: string): Promise<string | null> {
    try {
      console.log('🔍 MessagingService.createDirectMessage: Creating DM between', userId1, 'and', userId2);
      
      const { data, error } = await supabase.rpc('create_direct_message_channel', {
        user1_id: userId1,
        user2_id: userId2
      });
      
      if (error) {
        logError('createDirectMessage', error);
        throw error;
      }
      
      console.log('✅ MessagingService.createDirectMessage: Created DM channel', data);
      return data;
    } catch (error) {
      logError('createDirectMessage', error);
      return null;
    }
  }

  static async joinChannel(channelId: string, userId: string): Promise<boolean> {
    try {
      console.log('🔍 MessagingService.joinChannel: User', userId, 'joining channel', channelId);
      
      const { error } = await supabase
        .from('channel_members')
        .insert({
          channel_id: channelId,
          user_id: userId,
          role: 'member',
          joined_at: new Date().toISOString(),
          last_read_at: new Date().toISOString()
        });

      if (error) {
        logError('joinChannel', error);
        return false;
      }

      console.log('✅ MessagingService.joinChannel: Successfully joined channel');
      return true;
    } catch (error) {
      logError('joinChannel', error);
      return false;
    }
  }

  static async leaveChannel(channelId: string, userId: string): Promise<boolean> {
    try {
      console.log('🔍 MessagingService.leaveChannel: User', userId, 'leaving channel', channelId);
      
      const { error } = await supabase
        .from('channel_members')
        .delete()
        .eq('channel_id', channelId)
        .eq('user_id', userId);

      if (error) {
        logError('leaveChannel', error);
        return false;
      }

      console.log('✅ MessagingService.leaveChannel: Successfully left channel');
      return true;
    } catch (error) {
      logError('leaveChannel', error);
      return false;
    }
  }

  // Message operations
  static async getMessages(channelId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    try {
      console.log('🔍 MessagingService.getMessages: Getting messages for channel', channelId);
      
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          user:profiles!messages_sender_id_fkey(id, full_name, avatar_url, email),
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

      if (error) {
        logError('getMessages', error);
        throw error;
      }

      console.log('✅ MessagingService.getMessages: Found', data?.length || 0, 'messages');
      return (data || []).reverse(); // Reverse to show oldest first
    } catch (error) {
      logError('getMessages', error);
      return [];
    }
  }

  static async sendMessage(request: SendMessageRequest): Promise<Message | null> {
    try {
      console.log('🔍 MessagingService.sendMessage: Sending message to channel', request.channel_id);
      
      // Get current user ID from auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('❌ MessagingService.sendMessage: User not authenticated');
        throw new Error('User not authenticated');
      }

      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          channel_id: request.channel_id,
          sender_id: user.id, // Use sender_id instead of user_id
          content: request.content,
          message_type: request.message_type || 'text',
          parent_message_id: request.parent_message_id,
          file_url: request.file_url,
          file_name: request.file_name,
          file_size: request.file_size,
          file_type: request.file_type,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select(`
          *,
          user:profiles!messages_sender_id_fkey(id, full_name, avatar_url, email)
        `)
        .single();

      if (messageError) {
        logError('sendMessage', messageError);
        throw messageError;
      }

      // Handle mentions
      if (request.mentioned_user_ids && request.mentioned_user_ids.length > 0) {
        const mentions = request.mentioned_user_ids.map(userId => ({
          message_id: message.id,
          mentioned_user_id: userId
        }));

        const { error: mentionError } = await supabase.from('message_mentions').insert(mentions);
        if (mentionError) {
          logError('sendMessage.mentions', mentionError);
          // Don't fail the message send for mention errors
        }
      }

      // Update channel's updated_at timestamp
      const { error: updateError } = await supabase
        .from('channels')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', request.channel_id);

      if (updateError) {
        logError('sendMessage.updateChannel', updateError);
        // Don't fail the message send for channel update errors
      }

      console.log('✅ MessagingService.sendMessage: Message sent successfully', message.id);
      return message;
    } catch (error) {
      logError('sendMessage', error);
      return null;
    }
  }

  static async editMessage(messageId: string, content: string): Promise<boolean> {
    try {
      console.log('🔍 MessagingService.editMessage: Editing message', messageId);
      
      const { error } = await supabase
        .from('messages')
        .update({ 
          content, 
          is_edited: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) {
        logError('editMessage', error);
        return false;
      }

      console.log('✅ MessagingService.editMessage: Message edited successfully');
      return true;
    } catch (error) {
      logError('editMessage', error);
      return false;
    }
  }

  static async deleteMessage(messageId: string): Promise<boolean> {
    try {
      console.log('🔍 MessagingService.deleteMessage: Deleting message', messageId);
      
      const { error } = await supabase
        .from('messages')
        .update({ is_deleted: true })
        .eq('id', messageId);

      if (error) {
        logError('deleteMessage', error);
        return false;
      }

      console.log('✅ MessagingService.deleteMessage: Message deleted successfully');
      return true;
    } catch (error) {
      logError('deleteMessage', error);
      return false;
    }
  }

  // Reaction operations
  static async addReaction(messageId: string, userId: string, emoji: string): Promise<boolean> {
    try {
      console.log('🔍 MessagingService.addReaction: Adding reaction', emoji, 'to message', messageId);
      
      const { error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: userId,
          emoji
        });

      if (error) {
        logError('addReaction', error);
        return false;
      }

      console.log('✅ MessagingService.addReaction: Reaction added successfully');
      return true;
    } catch (error) {
      logError('addReaction', error);
      return false;
    }
  }

  static async removeReaction(messageId: string, userId: string, emoji: string): Promise<boolean> {
    try {
      console.log('🔍 MessagingService.removeReaction: Removing reaction', emoji, 'from message', messageId);
      
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .eq('emoji', emoji);

      if (error) {
        logError('removeReaction', error);
        return false;
      }

      console.log('✅ MessagingService.removeReaction: Reaction removed successfully');
      return true;
    } catch (error) {
      logError('removeReaction', error);
      return false;
    }
  }

  // Channel participants
  static async getChannelParticipants(channelId: string): Promise<ChannelParticipant[]> {
    try {
      console.log('🔍 MessagingService.getChannelParticipants: Getting participants for channel', channelId);
      
      const { data, error } = await supabase
        .from('channel_members')
        .select(`
          *,
          user:profiles(id, full_name, avatar_url, email, is_active)
        `)
        .eq('channel_id', channelId);

      if (error) {
        logError('getChannelParticipants', error);
        throw error;
      }

      console.log('✅ MessagingService.getChannelParticipants: Found', data?.length || 0, 'participants');
      return data || [];
    } catch (error) {
      logError('getChannelParticipants', error);
      return [];
    }
  }

  // User presence
  static async updatePresence(userId: string, status: UserPresence['status'], customStatus?: string): Promise<boolean> {
    try {
      console.log('🔍 MessagingService.updatePresence: Updating presence for user', userId, 'to', status);
      
      const { error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: userId,
          status,
          custom_status: customStatus,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        logError('updatePresence', error);
        return false;
      }

      console.log('✅ MessagingService.updatePresence: Presence updated successfully');
      return true;
    } catch (error) {
      logError('updatePresence', error);
      return false;
    }
  }

  static async getUsersPresence(userIds: string[]): Promise<UserPresence[]> {
    try {
      console.log('🔍 MessagingService.getUsersPresence: Getting presence for', userIds.length, 'users');
      
      const { data, error } = await supabase
        .from('user_presence')
        .select('*')
        .in('user_id', userIds);

      if (error) {
        logError('getUsersPresence', error);
        throw error;
      }

      console.log('✅ MessagingService.getUsersPresence: Found presence for', data?.length || 0, 'users');
      return data || [];
    } catch (error) {
      logError('getUsersPresence', error);
      return [];
    }
  }

  // File upload
  static async uploadFile(file: File, channelId: string): Promise<FileUploadResponse | null> {
    try {
      console.log('🔍 MessagingService.uploadFile: Uploading file', file.name, 'to channel', channelId);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `messages/${channelId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('message-files')
        .upload(filePath, file);

      if (uploadError) {
        logError('uploadFile', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('message-files')
        .getPublicUrl(filePath);

      console.log('✅ MessagingService.uploadFile: File uploaded successfully');
      return {
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        file_type: fileExt || '',
        mime_type: file.type
      };
    } catch (error) {
      logError('uploadFile', error);
      return null;
    }
  }

  // Search messages
  static async searchMessages(query: string, channelId?: string): Promise<Message[]> {
    try {
      console.log('🔍 MessagingService.searchMessages: Searching for', query);
      
      let queryBuilder = supabase
        .from('messages')
        .select(`
          *,
          user:profiles!messages_sender_id_fkey(id, full_name, avatar_url, email)
        `)
        .textSearch('content', query)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (channelId) {
        queryBuilder = queryBuilder.eq('channel_id', channelId);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        logError('searchMessages', error);
        throw error;
      }

      console.log('✅ MessagingService.searchMessages: Found', data?.length || 0, 'messages');
      return data || [];
    } catch (error) {
      logError('searchMessages', error);
      return [];
    }
  }

  // Mark channel as read
  static async markChannelAsRead(channelId: string, userId: string): Promise<boolean> {
    try {
      console.log('🔍 MessagingService.markChannelAsRead: Marking channel', channelId, 'as read for user', userId);
      
      const { error } = await supabase.rpc('mark_channel_as_read', {
        user_id: userId,
        channel_id: channelId
      });

      if (error) {
        logError('markChannelAsRead', error);
        return false;
      }

      console.log('✅ MessagingService.markChannelAsRead: Channel marked as read');
      return true;
    } catch (error) {
      logError('markChannelAsRead', error);
      return false;
    }
  }

  // Get all users (for mentions and DMs)
  static async getAllUsers(): Promise<ChannelParticipant['user'][]> {
    try {
      console.log('🔍 MessagingService.getAllUsers: Getting all active users');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email, is_active')
        .eq('is_active', true)
        .order('full_name');

      if (error) {
        logError('getAllUsers', error);
        throw error;
      }

      console.log('✅ MessagingService.getAllUsers: Found', data?.length || 0, 'users');
      return data || [];
    } catch (error) {
      logError('getAllUsers', error);
      return [];
    }
  }

  // Real-time subscriptions
  static subscribeToChannel(channelId: string, onMessage: (message: Message) => void) {
    console.log('🔍 MessagingService.subscribeToChannel: Setting up subscription for channel', channelId);
    
    return supabase
      .channel(`messages:${channelId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${channelId}`
      }, (payload) => {
        console.log('📨 MessagingService.subscribeToChannel: New message received', payload.new);
        onMessage(payload.new as Message);
      })
      .subscribe((status) => {
        console.log('🔗 MessagingService.subscribeToChannel: Subscription status', status);
      });
  }

  static subscribeToChannels(userId: string, onChannelUpdate: (channel: Channel) => void) {
    console.log('🔍 MessagingService.subscribeToChannels: Setting up channel subscription for user', userId);
    
    return supabase
      .channel(`user-channels:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'channels'
      }, (payload) => {
        console.log('📢 MessagingService.subscribeToChannels: Channel update received', payload.new);
        onChannelUpdate(payload.new as Channel);
      })
      .subscribe((status) => {
        console.log('🔗 MessagingService.subscribeToChannels: Subscription status', status);
      });
  }

  static subscribeToPresence(onPresenceUpdate: (presence: UserPresence) => void) {
    console.log('🔍 MessagingService.subscribeToPresence: Setting up presence subscription');
    
    return supabase
      .channel('user-presence')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_presence'
      }, (payload) => {
        console.log('👤 MessagingService.subscribeToPresence: Presence update received', payload.new);
        onPresenceUpdate(payload.new as UserPresence);
      })
      .subscribe((status) => {
        console.log('🔗 MessagingService.subscribeToPresence: Subscription status', status);
      });
  }
}