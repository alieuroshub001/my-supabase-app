"use client";

import { useState, useRef, useEffect } from 'react';
import type { Channel, Message, ChannelParticipant, UserPresence } from '@/types/messaging';

interface MessageAreaProps {
  channel?: Channel;
  messages: Message[];
  participants: ChannelParticipant[];
  userPresence: Record<string, UserPresence>;
  currentUserId: string;
  onSendMessage: (request: any) => void;
  onEditMessage: (messageId: string, content: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  onUploadFile: (file: File) => void;
  onLoadMore: () => void;
  onStartDM: (userId: string) => void;
  loading: boolean;
}

export default function MessageArea({
  channel,
  messages,
  participants,
  userPresence,
  currentUserId,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onAddReaction,
  onRemoveReaction,
  onUploadFile,
  onLoadMore,
  onStartDM,
  loading
}: MessageAreaProps) {
  const [messageInput, setMessageInput] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    await onSendMessage({
      content: messageInput.trim(),
      message_type: 'text'
    });

    setMessageInput('');
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editContent.trim()) return;
    
    await onEditMessage(messageId, editContent.trim());
    setEditingMessageId(null);
    setEditContent('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onUploadFile(files[0]);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString();
  };

  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Select a channel to start messaging</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {channel.type === 'direct' ? '💬 Direct Message' : `# ${channel.name}`}
            </h2>
            {channel.description && (
              <p className="text-sm text-gray-500 mt-1">{channel.description}</p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {participants.length} member{participants.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {loading && messages.length === 0 ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const showDate = index === 0 || 
                formatDate(messages[index - 1].created_at) !== formatDate(message.created_at);
              
              return (
                <div key={message.id}>
                  {showDate && (
                    <div className="flex justify-center my-4">
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {formatDate(message.created_at)}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex space-x-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {message.user?.full_name?.[0] || '?'}
                      </div>
                    </div>
                    
                    {/* Message content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline space-x-2">
                        <span className="text-sm font-medium text-gray-900">
                          {message.user?.full_name || 'Unknown User'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTime(message.created_at)}
                        </span>
                        {message.is_edited && (
                          <span className="text-xs text-gray-400">(edited)</span>
                        )}
                      </div>
                      
                      {editingMessageId === message.id ? (
                        <div className="mt-1">
                          <input
                            type="text"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleEditMessage(message.id);
                              } else if (e.key === 'Escape') {
                                setEditingMessageId(null);
                                setEditContent('');
                              }
                            }}
                            className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                            autoFocus
                          />
                          <div className="mt-1 flex space-x-2">
                            <button
                              onClick={() => handleEditMessage(message.id)}
                              className="text-xs text-blue-600 hover:text-blue-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingMessageId(null);
                                setEditContent('');
                              }}
                              className="text-xs text-gray-500 hover:text-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1">
                          <p className="text-sm text-gray-900">{message.content}</p>
                          
                          {/* Message actions */}
                          {message.sender_id === currentUserId && (
                            <div className="mt-1 flex space-x-2">
                              <button
                                onClick={() => {
                                  setEditingMessageId(message.id);
                                  setEditContent(message.content || '');
                                }}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => onDeleteMessage(message.id)}
                                className="text-xs text-red-500 hover:text-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message input */}
      <div className="px-6 py-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder={`Message ${channel.type === 'direct' ? 'direct message' : `#${channel.name}`}`}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          {/* File upload */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            title="Attach file"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          
          {/* Send button */}
          <button
            type="submit"
            disabled={!messageInput.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,application/pdf,.doc,.docx,.txt"
        />
      </div>
    </div>
  );
}