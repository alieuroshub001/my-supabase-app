"use client";

import { useState } from 'react';
import type { CreateChannelRequest } from '@/types/messaging';

interface CreateChannelModalProps {
  onClose: () => void;
  onCreateChannel: (request: CreateChannelRequest) => Promise<any>;
  currentUserId: string;
}

export default function CreateChannelModal({ 
  onClose, 
  onCreateChannel, 
  currentUserId 
}: CreateChannelModalProps) {
  const [channelType, setChannelType] = useState<'public' | 'private'>('public');
  const [channelName, setChannelName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim()) {
      setError('Channel name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const request: CreateChannelRequest = {
        name: channelName.trim(),
        description: description.trim() || undefined,
        type: channelType,
        participant_ids: [currentUserId] // Creator is automatically added
      };

      await onCreateChannel(request);
      onClose();
    } catch (err) {
      setError('Failed to create channel. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Create Channel</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Channel Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Channel Type
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="public"
                  checked={channelType === 'public'}
                  onChange={(e) => setChannelType(e.target.value as 'public')}
                  className="mr-2"
                />
                <span className="text-sm">
                  <span className="font-medium">Public</span>
                  <span className="text-gray-500 block">Everyone can join</span>
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="private"
                  checked={channelType === 'private'}
                  onChange={(e) => setChannelType(e.target.value as 'private')}
                  className="mr-2"
                />
                <span className="text-sm">
                  <span className="font-medium">Private</span>
                  <span className="text-gray-500 block">Invite only</span>
                </span>
              </label>
            </div>
          </div>

          {/* Channel Name */}
          <div>
            <label htmlFor="channelName" className="block text-sm font-medium text-gray-700 mb-1">
              Channel Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">#</span>
              </div>
              <input
                type="text"
                id="channelName"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="general"
                className="block w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Use lowercase letters, numbers, and dashes
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-gray-500">(optional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              rows={3}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !channelName.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Channel'}
          </button>
        </div>
      </div>
    </div>
  );
}