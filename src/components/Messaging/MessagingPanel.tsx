"use client";

import { useState, useEffect } from 'react';
import { useMessaging } from '@/hooks/useMessaging';
import ChannelList from './ChannelList';
import MessageArea from './MessageArea';
import UserList from './UserList';
import CreateChannelModal from './CreateChannelModal';
import type { MessagingPanelProps } from '@/types/messaging';

export default function MessagingPanel({ isOpen, onClose, currentUserId }: MessagingPanelProps) {
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const messaging = useMessaging(currentUserId);

  // Close panel with escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeChannel = messaging.channels.find(c => c.id === messaging.activeChannelId);
  const activeMessages = messaging.activeChannelId ? messaging.messages[messaging.activeChannelId] || [] : [];
  const activeParticipants = messaging.activeChannelId ? messaging.participants[messaging.activeChannelId] || [] : [];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Background overlay */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Messaging panel */}
      <div className="relative ml-auto h-full w-full max-w-6xl bg-white shadow-2xl flex">
        {/* Sidebar */}
        <div className={`${sidebarCollapsed ? 'w-16' : 'w-80'} border-r border-gray-200 flex flex-col transition-all duration-300`}>
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            {!sidebarCollapsed && (
              <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
            )}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d={sidebarCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
                </svg>
              </button>
              {!sidebarCollapsed && (
                <button
                  onClick={onClose}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                  title="Close messages"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Navigation tabs */}
          {!sidebarCollapsed && (
            <div className="p-4 border-b border-gray-200">
              <div className="flex space-x-1">
                <button
                  onClick={() => setShowUserList(false)}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors ${
                    !showUserList 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Channels
                </button>
                <button
                  onClick={() => setShowUserList(true)}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors ${
                    showUserList 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  People
                </button>
              </div>
            </div>
          )}

          {/* Content area */}
          <div className="flex-1 overflow-hidden">
            {sidebarCollapsed ? (
              <div className="p-2 space-y-2">
                {messaging.channels.slice(0, 5).map(channel => (
                  <button
                    key={channel.id}
                    onClick={() => messaging.selectChannel(channel.id)}
                    className={`w-12 h-12 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                      channel.id === messaging.activeChannelId
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    title={channel.name || 'Direct Message'}
                  >
                    {channel.type === 'direct' ? '💬' : '#'}
                  </button>
                ))}
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 border-2 border-dashed border-gray-300"
                  title="Show more"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
              </div>
            ) : (
              <>
                {!showUserList ? (
                  <ChannelList
                    channels={messaging.channels}
                    activeChannelId={messaging.activeChannelId}
                    onChannelSelect={messaging.selectChannel}
                    onCreateChannel={() => setShowCreateChannel(true)}
                    currentUserId={currentUserId}
                  />
                ) : (
                  <UserList
                    participants={activeParticipants}
                    userPresence={messaging.userPresence}
                    onStartDM={messaging.startDirectMessage}
                    currentUserId={currentUserId}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Main message area */}
        <div className="flex-1 flex flex-col">
          {messaging.activeChannelId ? (
            <MessageArea
              channel={activeChannel}
              messages={activeMessages}
              participants={activeParticipants}
              userPresence={messaging.userPresence}
              currentUserId={currentUserId}
              onSendMessage={messaging.sendMessage}
              onEditMessage={messaging.editMessage}
              onDeleteMessage={messaging.deleteMessage}
              onAddReaction={messaging.addReaction}
              onRemoveReaction={messaging.removeReaction}
              onUploadFile={messaging.uploadFile}
              onLoadMore={messaging.loadMoreMessages}
              onStartDM={messaging.startDirectMessage}
              loading={messaging.loading}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                <p className="text-gray-500">Choose from your existing conversations, start a new one, or create a channel.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create channel modal */}
      {showCreateChannel && (
        <CreateChannelModal
          onClose={() => setShowCreateChannel(false)}
          onCreateChannel={messaging.createChannel}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}