-- Messaging System Database Schema
-- This schema supports Slack-like functionality with channels, DMs, file sharing, etc.

-- Channels table - for both public channels and direct messages
CREATE TABLE IF NOT EXISTS channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255), -- null for direct messages
  description TEXT,
  type VARCHAR(20) NOT NULL CHECK (type IN ('public', 'private', 'direct')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT FALSE,
  -- For direct messages, we'll store participant info
  participant_ids UUID[] -- array of user IDs for direct messages
);

-- Channel participants - who has access to which channels
CREATE TABLE IF NOT EXISTS channel_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_muted BOOLEAN DEFAULT FALSE,
  UNIQUE(channel_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'system')),
  parent_message_id UUID REFERENCES messages(id) ON DELETE CASCADE, -- for threading
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  -- For file messages
  file_url TEXT,
  file_name TEXT,
  file_size BIGINT,
  file_type TEXT
);

-- Message reactions (like Slack's emoji reactions)
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  emoji VARCHAR(100) NOT NULL, -- emoji unicode or name
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- File attachments table (for detailed file metadata)
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

-- Message mentions (when users are @mentioned)
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_participants_user_id ON channel_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_participants_channel_id ON channel_participants(channel_id);
CREATE INDEX IF NOT EXISTS idx_channels_type ON channels(type);
CREATE INDEX IF NOT EXISTS idx_messages_parent_message_id ON messages(parent_message_id);

-- RLS (Row Level Security) Policies
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Channels policies
CREATE POLICY "Users can view channels they participate in" ON channels
  FOR SELECT USING (
    id IN (
      SELECT channel_id FROM channel_participants WHERE user_id = auth.uid()
    ) OR type = 'public'
  );

CREATE POLICY "Users can create channels" ON channels
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Channel creators and admins can update channels" ON channels
  FOR UPDATE USING (
    auth.uid() = created_by OR 
    auth.uid() IN (
      SELECT user_id FROM channel_participants 
      WHERE channel_id = id AND role = 'admin'
    )
  );

-- Channel participants policies
CREATE POLICY "Users can view participants of their channels" ON channel_participants
  FOR SELECT USING (
    channel_id IN (
      SELECT channel_id FROM channel_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join public channels" ON channel_participants
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND 
    (channel_id IN (SELECT id FROM channels WHERE type = 'public') OR
     channel_id IN (SELECT channel_id FROM channel_participants WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can update their own participation" ON channel_participants
  FOR UPDATE USING (user_id = auth.uid());

-- Messages policies
CREATE POLICY "Users can view messages in their channels" ON messages
  FOR SELECT USING (
    channel_id IN (
      SELECT channel_id FROM channel_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their channels" ON messages
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    channel_id IN (
      SELECT channel_id FROM channel_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own messages" ON messages
  FOR DELETE USING (user_id = auth.uid());

-- Message reactions policies
CREATE POLICY "Users can view reactions in their channels" ON message_reactions
  FOR SELECT USING (
    message_id IN (
      SELECT id FROM messages WHERE channel_id IN (
        SELECT channel_id FROM channel_participants WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can add reactions" ON message_reactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove their own reactions" ON message_reactions
  FOR DELETE USING (user_id = auth.uid());

-- Message attachments policies
CREATE POLICY "Users can view attachments in their channels" ON message_attachments
  FOR SELECT USING (
    message_id IN (
      SELECT id FROM messages WHERE channel_id IN (
        SELECT channel_id FROM channel_participants WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can upload attachments" ON message_attachments
  FOR INSERT WITH CHECK (uploaded_by = auth.uid());

-- Message mentions policies
CREATE POLICY "Users can view mentions in their channels" ON message_mentions
  FOR SELECT USING (
    message_id IN (
      SELECT id FROM messages WHERE channel_id IN (
        SELECT channel_id FROM channel_participants WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create mentions" ON message_mentions
  FOR INSERT WITH CHECK (
    message_id IN (
      SELECT id FROM messages WHERE user_id = auth.uid()
    )
  );

-- User presence policies
CREATE POLICY "Users can view all user presence" ON user_presence
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own presence" ON user_presence
  FOR ALL USING (user_id = auth.uid());

-- Functions for common operations

-- Function to create a direct message channel between two users
CREATE OR REPLACE FUNCTION create_direct_message_channel(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
  channel_id UUID;
  existing_channel_id UUID;
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
  
  -- Create new DM channel
  INSERT INTO channels (type, created_by, participant_ids)
  VALUES ('direct', user1_id, ARRAY[user1_id, user2_id])
  RETURNING id INTO channel_id;
  
  -- Add both users as participants
  INSERT INTO channel_participants (channel_id, user_id, role)
  VALUES 
    (channel_id, user1_id, 'member'),
    (channel_id, user2_id, 'member');
  
  RETURN channel_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_count(user_id UUID, channel_id UUID)
RETURNS INTEGER AS $$
DECLARE
  last_read TIMESTAMP WITH TIME ZONE;
  unread_count INTEGER;
BEGIN
  SELECT last_read_at INTO last_read
  FROM channel_participants
  WHERE user_id = user_id AND channel_id = channel_id;
  
  SELECT COUNT(*) INTO unread_count
  FROM messages
  WHERE channel_id = channel_id 
    AND created_at > COALESCE(last_read, '1970-01-01'::timestamp)
    AND user_id != user_id;
  
  RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update last read timestamp
CREATE OR REPLACE FUNCTION mark_channel_as_read(user_id UUID, channel_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE channel_participants
  SET last_read_at = NOW()
  WHERE user_id = user_id AND channel_id = channel_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_presence_updated_at BEFORE UPDATE ON user_presence
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();