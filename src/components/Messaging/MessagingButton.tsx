"use client";

import { useState } from 'react';
import MessagingPanel from './MessagingPanel';

interface MessagingButtonProps {
  currentUserId: string;
  className?: string;
  showBadge?: boolean;
  unreadCount?: number;
}

export default function MessagingButton({ 
  currentUserId, 
  className = '',
  showBadge = true,
  unreadCount = 0
}: MessagingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`relative inline-flex items-center justify-center p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors ${className}`}
        title="Open Messages"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        
        {/* Unread badge */}
        {showBadge && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <MessagingPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        currentUserId={currentUserId}
      />
    </>
  );
}