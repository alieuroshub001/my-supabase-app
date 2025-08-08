-- =====================================================
-- MESSAGING SYSTEM SCHEMA - COMPATIBLE WITH EXISTING DATABASE
-- =====================================================
-- This schema adds missing messaging features to your existing database
-- without conflicting with existing tables

-- =====================================================
-- ADD MISSING COLUMNS TO EXISTING TABLES
-- =====================================================

-- Add missing columns to existing channels table
DO $$ 
BEGIN
    -- Add participant_ids column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channels' AND column_name = 'participant_ids') THEN
        ALTER TABLE channels ADD COLUMN participant_ids UUID[];
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channels' AND column_name = 'updated_at') THEN
        ALTER TABLE channels ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Update the type column to support our messaging types
    -- First check if the enum values exist
    BEGIN
        ALTER TYPE channel_type ADD VALUE IF NOT EXISTS 'direct';
    EXCEPTION 
        WHEN duplicate_object THEN NULL;
    END;
END $$;

-- Add missing columns to existing messages table
DO $$ 
BEGIN
    -- Add parent_message_id column if it doesn't exist (for threading)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'parent_message_id') THEN
        ALTER TABLE messages ADD COLUMN parent_message_id UUID REFERENCES messages(id) ON DELETE CASCADE;
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'updated_at') THEN
        ALTER TABLE messages ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Add is_edited column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'is_edited') THEN
        ALTER TABLE messages ADD COLUMN is_edited BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add file-related columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'file_url') THEN
        ALTER TABLE messages ADD COLUMN file_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'file_name') THEN
        ALTER TABLE messages ADD COLUMN file_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'file_size') THEN
        ALTER TABLE messages ADD COLUMN file_size BIGINT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'file_type') THEN
        ALTER TABLE messages ADD COLUMN file_type TEXT;
    END IF;
END $$;

-- Add missing columns to existing channel_members table
DO $$ 
BEGIN
    -- Add is_muted column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channel_members' AND column_name = 'is_muted') THEN
        ALTER TABLE channel_members ADD COLUMN is_muted BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- =====================================================
-- CREATE NEW TABLES FOR ADDITIONAL MESSAGING FEATURES
-- =====================================================

-- Message reactions table (separate from JSONB for better querying)
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  emoji VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Message attachments table (for detailed file metadata)
CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  mime_type TEXT,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message mentions table (separate from array for better querying)
CREATE TABLE IF NOT EXISTS message_mentions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  mentioned_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, mentioned_user_id)
);

-- User presence/status
CREATE TABLE IF NOT EXISTS user_presence (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline')),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  custom_status TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for existing tables
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_user_id ON channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_channel_id ON channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_channels_type ON channels(type);
CREATE INDEX IF NOT EXISTS idx_messages_parent_message_id ON messages(parent_message_id);

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_mentions_message_id ON message_mentions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_mentions_mentioned_user_id ON message_mentions(mentioned_user_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on existing tables
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Enable RLS on new tables
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Channels policies
DROP POLICY IF EXISTS "Users can view channels they participate in" ON channels;
CREATE POLICY "Users can view channels they participate in" ON channels
  FOR SELECT USING (
    id IN (
      SELECT channel_id FROM channel_members WHERE user_id = auth.uid()
    ) OR type = 'public'
  );

DROP POLICY IF EXISTS "Users can create channels" ON channels;
CREATE POLICY "Users can create channels" ON channels
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Channel creators and admins can update channels" ON channels;
CREATE POLICY "Channel creators and admins can update channels" ON channels
  FOR UPDATE USING (
    auth.uid() = created_by OR 
    auth.uid() IN (
      SELECT user_id FROM channel_members 
      WHERE channel_id = id AND role = 'admin'
    )
  );

-- Channel members policies
DROP POLICY IF EXISTS "Users can view participants of their channels" ON channel_members;
CREATE POLICY "Users can view participants of their channels" ON channel_members
  FOR SELECT USING (
    channel_id IN (
      SELECT channel_id FROM channel_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can join public channels" ON channel_members;
CREATE POLICY "Users can join public channels" ON channel_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND 
    (channel_id IN (SELECT id FROM channels WHERE type = 'public') OR
     channel_id IN (SELECT channel_id FROM channel_members WHERE user_id = auth.uid()))
  );

DROP POLICY IF EXISTS "Users can update their own participation" ON channel_members;
CREATE POLICY "Users can update their own participation" ON channel_members
  FOR UPDATE USING (user_id = auth.uid());

-- Messages policies
DROP POLICY IF EXISTS "Users can view messages in their channels" ON messages;
CREATE POLICY "Users can view messages in their channels" ON messages
  FOR SELECT USING (
    channel_id IN (
      SELECT channel_id FROM channel_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can send messages to their channels" ON messages;
CREATE POLICY "Users can send messages to their channels" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    channel_id IN (
      SELECT channel_id FROM channel_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE USING (sender_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;
CREATE POLICY "Users can delete their own messages" ON messages
  FOR DELETE USING (sender_id = auth.uid());

-- Message reactions policies
DROP POLICY IF EXISTS "Users can view reactions in their channels" ON message_reactions;
CREATE POLICY "Users can view reactions in their channels" ON message_reactions
  FOR SELECT USING (
    message_id IN (
      SELECT id FROM messages WHERE channel_id IN (
        SELECT channel_id FROM channel_members WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can add reactions" ON message_reactions;
CREATE POLICY "Users can add reactions" ON message_reactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can remove their own reactions" ON message_reactions;
CREATE POLICY "Users can remove their own reactions" ON message_reactions
  FOR DELETE USING (user_id = auth.uid());

-- Message attachments policies
DROP POLICY IF EXISTS "Users can view attachments in their channels" ON message_attachments;
CREATE POLICY "Users can view attachments in their channels" ON message_attachments
  FOR SELECT USING (
    message_id IN (
      SELECT id FROM messages WHERE channel_id IN (
        SELECT channel_id FROM channel_members WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can upload attachments" ON message_attachments;
CREATE POLICY "Users can upload attachments" ON message_attachments
  FOR INSERT WITH CHECK (uploaded_by = auth.uid());

-- Message mentions policies
DROP POLICY IF EXISTS "Users can view mentions in their channels" ON message_mentions;
CREATE POLICY "Users can view mentions in their channels" ON message_mentions
  FOR SELECT USING (
    message_id IN (
      SELECT id FROM messages WHERE channel_id IN (
        SELECT channel_id FROM channel_members WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can create mentions" ON message_mentions;
CREATE POLICY "Users can create mentions" ON message_mentions
  FOR INSERT WITH CHECK (
    message_id IN (
      SELECT id FROM messages WHERE sender_id = auth.uid()
    )
  );

-- User presence policies
DROP POLICY IF EXISTS "Users can view all user presence" ON user_presence;
CREATE POLICY "Users can view all user presence" ON user_presence
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update their own presence" ON user_presence;
CREATE POLICY "Users can update their own presence" ON user_presence
  FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- =====================================================

-- Function to create a direct message channel between two users
CREATE OR REPLACE FUNCTION create_direct_message_channel(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
  channel_id UUID;
  existing_channel_id UUID;
  dm_name TEXT;
BEGIN
  -- Check if a DM channel already exists between these users
  SELECT c.id INTO existing_channel_id
  FROM channels c
  WHERE c.type = 'direct' 
    AND c.participant_ids @> ARRAY[user1_id, user2_id]
    AND array_length(c.participant_ids, 1) = 2;
  
  IF existing_channel_id IS NOT NULL THEN
    RETURN existing_channel_id;
  END IF;
  
  -- Generate a deterministic non-null name for DM to satisfy NOT NULL constraint
  dm_name := 'dm:' || substr(user1_id::text, 1, 8) || ':' || substr(user2_id::text, 1, 8);
  
  -- Create new DM channel
  INSERT INTO channels (name, type, created_by, participant_ids, created_at, updated_at)
  VALUES (dm_name, 'direct', user1_id, ARRAY[user1_id, user2_id], NOW(), NOW())
  RETURNING id INTO channel_id;
  
  -- Add both users as participants
  INSERT INTO channel_members (channel_id, user_id, role, joined_at, last_read_at)
  VALUES 
    (channel_id, user1_id, 'member', NOW(), NOW()),
    (channel_id, user2_id, 'member', NOW(), NOW());
  
  RETURN channel_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_count(p_user_id UUID, p_channel_id UUID)
RETURNS INTEGER AS $$
DECLARE
  last_read TIMESTAMP WITH TIME ZONE;
  unread_count INTEGER;
BEGIN
  SELECT last_read_at INTO last_read
  FROM channel_members
  WHERE user_id = p_user_id AND channel_id = p_channel_id;
  
  SELECT COUNT(*) INTO unread_count
  FROM messages
  WHERE channel_id = p_channel_id 
    AND created_at > COALESCE(last_read, '1970-01-01'::timestamp)
    AND sender_id != p_user_id;
  
  RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update last read timestamp
CREATE OR REPLACE FUNCTION mark_channel_as_read(p_user_id UUID, p_channel_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE channel_members
  SET last_read_at = NOW()
  WHERE user_id = p_user_id AND channel_id = p_channel_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS TO UPDATE TIMESTAMPS
-- =====================================================

-- Update trigger for channels
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_channels_updated_at ON channels;
CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_presence_updated_at ON user_presence;
CREATE TRIGGER update_user_presence_updated_at BEFORE UPDATE ON user_presence
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify the setup
DO $$
BEGIN
    RAISE NOTICE 'Messaging schema setup completed successfully!';
    RAISE NOTICE 'Tables created/updated:';
    RAISE NOTICE '- channels (updated with new columns)';
    RAISE NOTICE '- channel_members (updated with new columns)';
    RAISE NOTICE '- messages (updated with new columns)';
    RAISE NOTICE '- message_reactions (new)';
    RAISE NOTICE '- message_attachments (new)';
    RAISE NOTICE '- message_mentions (new)';
    RAISE NOTICE '- user_presence (new)';
    RAISE NOTICE 'Functions created:';
    RAISE NOTICE '- create_direct_message_channel()';
    RAISE NOTICE '- get_unread_count()';
    RAISE NOTICE '- mark_channel_as_read()';
END $$;