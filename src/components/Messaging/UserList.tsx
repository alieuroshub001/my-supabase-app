"use client";

import type { UserListProps } from '@/types/messaging';

export default function UserList({ 
  participants, 
  userPresence, 
  onStartDM, 
  currentUserId 
}: UserListProps) {
  const getPresenceColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getPresenceText = (status: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'away': return 'Away';
      case 'busy': return 'Busy';
      default: return 'Offline';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-700">Team Members</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 space-y-2">
        {participants.map((participant) => {
          if (participant.user_id === currentUserId) return null;
          
          const presence = userPresence[participant.user_id];
          const user = participant.user;
          
          return (
            <button
              key={participant.id}
              onClick={() => onStartDM(participant.user_id)}
              className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 transition-colors text-left"
            >
              <div className="relative">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                  {user?.full_name?.[0] || '?'}
                </div>
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getPresenceColor(presence?.status || 'offline')}`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.full_name || 'Unknown User'}
                  </p>
                  <span className="text-xs text-gray-500">
                    {getPresenceText(presence?.status || 'offline')}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email}
                </p>
                {presence?.custom_status && (
                  <p className="text-xs text-gray-400 truncate mt-1">
                    {presence.custom_status}
                  </p>
                )}
              </div>
            </button>
          );
        })}
        
        {participants.filter(p => p.user_id !== currentUserId).length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No other team members</p>
          </div>
        )}
      </div>
    </div>
  );
}