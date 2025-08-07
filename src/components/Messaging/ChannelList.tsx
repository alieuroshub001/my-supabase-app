"use client";

import { useState } from 'react';
import type { ChannelListProps } from '@/types/messaging';

export default function ChannelList({ 
  channels, 
  activeChannelId, 
  onChannelSelect, 
  onCreateChannel, 
  currentUserId 
}: ChannelListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter channels based on search
  const filteredChannels = channels.filter(channel => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    if (channel.name) {
      return channel.name.toLowerCase().includes(query);
    }
    
    // For direct messages, search by participant names
    if (channel.type === 'direct') {
      // This would need participant data to work properly
      return true; // For now, show all DMs
    }
    
    return false;
  });

  // Group channels by type
  const publicChannels = filteredChannels.filter(c => c.type === 'public');
  const privateChannels = filteredChannels.filter(c => c.type === 'private');
  const directMessages = filteredChannels.filter(c => c.type === 'direct');

  const formatChannelName = (channel: any) => {
    if (channel.name) return channel.name;
    
    // For direct messages, show the other participant's name
    if (channel.type === 'direct' && channel.participant_ids) {
      const otherUserId = channel.participant_ids.find((id: string) => id !== currentUserId);
      return `Direct Message`; // Would need user data to show actual name
    }
    
    return 'Unnamed Channel';
  };

  const getChannelIcon = (channel: any) => {
    switch (channel.type) {
      case 'public':
        return '#';
      case 'private':
        return '🔒';
      case 'direct':
        return '💬';
      default:
        return '#';
    }
  };

  const ChannelItem = ({ channel }: { channel: any }) => (
    <button
      onClick={() => onChannelSelect(channel.id)}
      className={`w-full px-3 py-2 rounded-lg flex items-center space-x-3 text-left transition-colors ${
        channel.id === activeChannelId
          ? 'bg-blue-100 text-blue-700'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <span className="text-lg flex-shrink-0">
        {getChannelIcon(channel)}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium truncate">
            {formatChannelName(channel)}
          </span>
          {channel.unread_count > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
              {channel.unread_count > 99 ? '99+' : channel.unread_count}
            </span>
          )}
        </div>
        {channel.description && (
          <p className="text-xs text-gray-500 truncate mt-1">
            {channel.description}
          </p>
        )}
      </div>
    </button>
  );

  const SectionHeader = ({ title, count, onAdd }: { title: string; count: number; onAdd?: () => void }) => (
    <div className="flex items-center justify-between px-3 py-2">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {title} ({count})
      </h3>
      {onAdd && (
        <button
          onClick={onAdd}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          title={`Create ${title.toLowerCase()}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Channel lists */}
      <div className="flex-1 overflow-y-auto px-2 space-y-4">
        {/* Public Channels */}
        {publicChannels.length > 0 && (
          <div>
            <SectionHeader 
              title="Channels" 
              count={publicChannels.length} 
              onAdd={onCreateChannel}
            />
            <div className="space-y-1">
              {publicChannels.map(channel => (
                <ChannelItem key={channel.id} channel={channel} />
              ))}
            </div>
          </div>
        )}

        {/* Private Channels */}
        {privateChannels.length > 0 && (
          <div>
            <SectionHeader 
              title="Private Channels" 
              count={privateChannels.length}
              onAdd={onCreateChannel}
            />
            <div className="space-y-1">
              {privateChannels.map(channel => (
                <ChannelItem key={channel.id} channel={channel} />
              ))}
            </div>
          </div>
        )}

        {/* Direct Messages */}
        {directMessages.length > 0 && (
          <div>
            <SectionHeader 
              title="Direct Messages" 
              count={directMessages.length}
            />
            <div className="space-y-1">
              {directMessages.map(channel => (
                <ChannelItem key={channel.id} channel={channel} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {filteredChannels.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            {searchQuery ? (
              <>
                <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-gray-500 text-sm">No channels found</p>
                <p className="text-gray-400 text-xs mt-1">Try a different search term</p>
              </>
            ) : (
              <>
                <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-gray-500 text-sm">No conversations yet</p>
                <button
                  onClick={onCreateChannel}
                  className="text-blue-600 hover:text-blue-700 text-xs mt-1 underline"
                >
                  Create your first channel
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}