import { useState, useEffect, useCallback, useRef } from 'react';
import { MessagingService } from '@/utils/messaging/messagingService';
import type { 
  MessagingState, 
  Channel, 
  Message, 
  SendMessageRequest,
  CreateChannelRequest,
  ChannelParticipant,
  UserPresence
} from '@/types/messaging';

export function useMessaging(currentUserId: string) {
  const [state, setState] = useState<MessagingState>({
    channels: [],
    activeChannelId: undefined,
    messages: {},
    participants: {},
    userPresence: {},
    loading: true,
    error: undefined,
    searchQuery: undefined,
    searchResults: undefined
  });

  const subscriptions = useRef<any[]>([]);

  // Load messages for a channel
  const loadChannelMessages = useCallback(async (channelId: string, offset: number = 0) => {
    try {
      const messages = await MessagingService.getMessages(channelId, 50, offset);
      
      setState(prev => ({
        ...prev,
        messages: {
          ...prev.messages,
          [channelId]: offset === 0 ? messages : [...(prev.messages[channelId] || []), ...messages]
        }
      }));

      // Mark channel as read
      await MessagingService.markChannelAsRead(channelId, currentUserId);

    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [currentUserId]);

  // Load participants for a channel
  const loadChannelParticipants = useCallback(async (channelId: string) => {
    try {
      const participants = await MessagingService.getChannelParticipants(channelId);
      
      setState(prev => ({
        ...prev,
        participants: {
          ...prev.participants,
          [channelId]: participants
        }
      }));

      // Load presence for participants
      const userIds = participants.map(p => p.user_id);
      const presenceData = await MessagingService.getUsersPresence(userIds);
      
      const presenceMap = presenceData.reduce((acc, presence) => {
        acc[presence.user_id] = presence;
        return acc;
      }, {} as Record<string, UserPresence>);

      setState(prev => ({
        ...prev,
        userPresence: { ...prev.userPresence, ...presenceMap }
      }));

    } catch (error) {
      console.error('Error loading participants:', error);
    }
  }, []);

  // Set up real-time subscriptions
  const setupSubscriptions = useCallback(() => {
    // Clean up existing subscriptions
    subscriptions.current.forEach(sub => sub?.unsubscribe());
    subscriptions.current = [];

    // Subscribe to channels updates
    const channelSub = MessagingService.subscribeToChannels(currentUserId, (channel) => {
      setState(prev => ({
        ...prev,
        channels: prev.channels.map(c => c.id === channel.id ? channel : c)
      }));
    });
    subscriptions.current.push(channelSub);

    // Subscribe to presence updates
    const presenceSub = MessagingService.subscribeToPresence((presence) => {
      setState(prev => ({
        ...prev,
        userPresence: {
          ...prev.userPresence,
          [presence.user_id]: presence
        }
      }));
    });
    subscriptions.current.push(presenceSub);

    // Subscribe to messages for active channel
    if (state.activeChannelId) {
      const messageSub = MessagingService.subscribeToChannel(state.activeChannelId, (message) => {
        setState(prev => ({
          ...prev,
          messages: {
            ...prev.messages,
            [message.channel_id]: [...(prev.messages[message.channel_id] || []), message]
          }
        }));
      });
      subscriptions.current.push(messageSub);
    }
  }, [currentUserId, state.activeChannelId]);

  // Initialize messaging data (moved below dependencies to avoid TDZ)
  const initialize = useCallback(async () => {
    if (!currentUserId) return; // wait for a valid user id
    try {
      setState(prev => ({ ...prev, loading: true, error: undefined }));

      // Load channels
      const channels = await MessagingService.getChannels(currentUserId);
      
      // Set first channel as active if none selected
      const activeChannelId = state.activeChannelId || channels[0]?.id;

      setState(prev => ({
        ...prev,
        channels,
        activeChannelId,
        loading: false
      }));

      // Load messages for active channel
      if (activeChannelId) {
        await loadChannelMessages(activeChannelId);
        await loadChannelParticipants(activeChannelId);
      }

      // Update user presence
      await MessagingService.updatePresence(currentUserId, 'online');

      // Set up real-time subscriptions
      setupSubscriptions();

    } catch (error) {
      console.error('Error initializing messaging:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load messaging data'
      }));
    }
  }, [currentUserId, state.activeChannelId, loadChannelMessages, loadChannelParticipants, setupSubscriptions]);

  // Channel operations
  const selectChannel = useCallback(async (channelId: string) => {
    setState(prev => ({ ...prev, activeChannelId: channelId }));
    
    // Load messages if not already loaded
    if (!state.messages[channelId]) {
      await loadChannelMessages(channelId);
    }
    
    // Load participants if not already loaded
    if (!state.participants[channelId]) {
      await loadChannelParticipants(channelId);
    }

    // Mark as read
    await MessagingService.markChannelAsRead(channelId, currentUserId);
  }, [state.messages, state.participants, loadChannelMessages, loadChannelParticipants, currentUserId]);

  const createChannel = useCallback(async (request: CreateChannelRequest) => {
    try {
      const channel = await MessagingService.createChannel(request, currentUserId);
      if (channel) {
        setState(prev => ({
          ...prev,
          channels: [channel, ...prev.channels],
          activeChannelId: channel.id
        }));
        
        await loadChannelMessages(channel.id);
        await loadChannelParticipants(channel.id);
        return channel;
      }
    } catch (error) {
      console.error('Error creating channel:', error);
    }
    return null;
  }, [currentUserId, loadChannelMessages, loadChannelParticipants]);

  const startDirectMessage = useCallback(async (otherUserId: string) => {
    try {
      const channelId = await MessagingService.createDirectMessage(currentUserId, otherUserId);
      if (channelId) {
        // Check if channel already exists in our list
        const existingChannel = state.channels.find(c => c.id === channelId);
        if (existingChannel) {
          await selectChannel(channelId);
        } else {
          // Reload channels to get the new DM
          await initialize();
          setState(prev => ({ ...prev, activeChannelId: channelId }));
        }
        return channelId;
      }
    } catch (error) {
      console.error('Error starting direct message:', error);
    }
    return null;
  }, [currentUserId, state.channels, selectChannel, initialize]);

  const joinChannel = useCallback(async (channelId: string) => {
    try {
      const success = await MessagingService.joinChannel(channelId, currentUserId);
      if (success) {
        await initialize(); // Reload to get updated channels
      }
      return success;
    } catch (error) {
      console.error('Error joining channel:', error);
      return false;
    }
  }, [currentUserId, initialize]);

  const leaveChannel = useCallback(async (channelId: string) => {
    try {
      const success = await MessagingService.leaveChannel(channelId, currentUserId);
      if (success) {
        setState(prev => ({
          ...prev,
          channels: prev.channels.filter(c => c.id !== channelId),
          activeChannelId: prev.activeChannelId === channelId ? prev.channels[0]?.id : prev.activeChannelId
        }));
      }
      return success;
    } catch (error) {
      console.error('Error leaving channel:', error);
      return false;
    }
  }, [currentUserId]);

  // Message operations
  const sendMessage = useCallback(async (request: Omit<SendMessageRequest, 'channel_id'>) => {
    if (!state.activeChannelId) return null;

    try {
      const fullRequest: SendMessageRequest = {
        ...request,
        channel_id: state.activeChannelId
      };

      // Fix the user_id in the service call
      const message = await MessagingService.sendMessage({
        ...fullRequest,
        // The service should use currentUserId, not channel_id
      });

      if (message) {
        // Optimistically add message to UI
        setState(prev => ({
          ...prev,
          messages: {
            ...prev.messages,
            [state.activeChannelId!]: [...(prev.messages[state.activeChannelId!] || []), message]
          }
        }));
      }

      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  }, [state.activeChannelId]);

  const editMessage = useCallback(async (messageId: string, content: string) => {
    try {
      const success = await MessagingService.editMessage(messageId, content);
      if (success && state.activeChannelId) {
        setState(prev => ({
          ...prev,
          messages: {
            ...prev.messages,
            [state.activeChannelId!]: prev.messages[state.activeChannelId!]?.map(m => 
              m.id === messageId ? { ...m, content, is_edited: true } : m
            ) || []
          }
        }));
      }
      return success;
    } catch (error) {
      console.error('Error editing message:', error);
      return false;
    }
  }, [state.activeChannelId]);

  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      const success = await MessagingService.deleteMessage(messageId);
      if (success && state.activeChannelId) {
        setState(prev => ({
          ...prev,
          messages: {
            ...prev.messages,
            [state.activeChannelId!]: prev.messages[state.activeChannelId!]?.filter(m => m.id !== messageId) || []
          }
        }));
      }
      return success;
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  }, [state.activeChannelId]);

  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      return await MessagingService.addReaction(messageId, currentUserId, emoji);
    } catch (error) {
      console.error('Error adding reaction:', error);
      return false;
    }
  }, [currentUserId]);

  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      return await MessagingService.removeReaction(messageId, currentUserId, emoji);
    } catch (error) {
      console.error('Error removing reaction:', error);
      return false;
    }
  }, [currentUserId]);

  // File operations
  const uploadFile = useCallback(async (file: File) => {
    if (!state.activeChannelId) return null;

    try {
      return await MessagingService.uploadFile(file, state.activeChannelId);
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  }, [state.activeChannelId]);

  // Search
  const searchMessages = useCallback(async (query: string) => {
    try {
      setState(prev => ({ ...prev, searchQuery: query }));
      const results = await MessagingService.searchMessages(query, state.activeChannelId);
      setState(prev => ({ ...prev, searchResults: results }));
      return results;
    } catch (error) {
      console.error('Error searching messages:', error);
      return [];
    }
  }, [state.activeChannelId]);

  const clearSearch = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      searchQuery: undefined, 
      searchResults: undefined 
    }));
  }, []);

  // Presence
  const updatePresence = useCallback(async (status: UserPresence['status'], customStatus?: string) => {
    try {
      return await MessagingService.updatePresence(currentUserId, status, customStatus);
    } catch (error) {
      console.error('Error updating presence:', error);
      return false;
    }
  }, [currentUserId]);

  // Load more messages (pagination)
  const loadMoreMessages = useCallback(async () => {
    if (!state.activeChannelId) return;
    
    const currentMessages = state.messages[state.activeChannelId] || [];
    await loadChannelMessages(state.activeChannelId, currentMessages.length);
  }, [state.activeChannelId, state.messages, loadChannelMessages]);

  // Initialize on mount
  useEffect(() => {
    initialize();

    // Cleanup subscriptions on unmount
    return () => {
      subscriptions.current.forEach(sub => sub?.unsubscribe());
    };
  }, [initialize]);

  // Update presence to offline on unmount
  useEffect(() => {
    if (!currentUserId) return;
    const handleBeforeUnload = () => {
      MessagingService.updatePresence(currentUserId, 'offline');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      MessagingService.updatePresence(currentUserId, 'offline');
    };
  }, [currentUserId]);

  return {
    // State
    ...state,
    
    // Channel operations
    selectChannel,
    createChannel,
    startDirectMessage,
    joinChannel,
    leaveChannel,
    
    // Message operations
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    loadMoreMessages,
    
    // File operations
    uploadFile,
    
    // Search
    searchMessages,
    clearSearch,
    
    // Presence
    updatePresence,
    
    // Utility
    refresh: initialize
  };
}