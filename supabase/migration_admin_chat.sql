-- Migration: Admin-Store Chat System
-- Adds support for admin to chat with stores

-- Add admin chat conversations
CREATE TABLE IF NOT EXISTS admin_chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed')),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message TEXT,
  unread_count_admin INTEGER DEFAULT 0,
  unread_count_store INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add admin chat messages
CREATE TABLE IF NOT EXISTS admin_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES admin_chat_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'store')),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file')),
  content TEXT,
  attachments JSONB DEFAULT '[]',
  read_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_chat_conversations_store ON admin_chat_conversations(store_id);
CREATE INDEX IF NOT EXISTS idx_admin_chat_conversations_admin ON admin_chat_conversations(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_chat_conversations_updated ON admin_chat_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_chat_messages_conversation ON admin_chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_admin_chat_messages_created ON admin_chat_messages(created_at DESC);

-- Trigger to update conversation on new message
CREATE OR REPLACE FUNCTION update_admin_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE admin_chat_conversations
  SET
    last_message_at = NEW.created_at,
    last_message = LEFT(NEW.content, 100),
    updated_at = NOW(),
    unread_count_admin = CASE
      WHEN NEW.sender_type = 'store' THEN unread_count_admin + 1
      ELSE unread_count_admin
    END,
    unread_count_store = CASE
      WHEN NEW.sender_type = 'admin' THEN unread_count_store + 1
      ELSE unread_count_store
    END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_admin_conversation
AFTER INSERT ON admin_chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_admin_conversation_on_message();

-- RLS Policies
ALTER TABLE admin_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_chat_messages ENABLE ROW LEVEL SECURITY;

-- Admin can see all conversations
CREATE POLICY admin_chat_conversations_admin_all ON admin_chat_conversations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Store can see their own conversations
CREATE POLICY admin_chat_conversations_store_own ON admin_chat_conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE id = store_id
      AND user_id = auth.uid()
    )
  );

-- Store can create conversations with admin
CREATE POLICY admin_chat_conversations_store_create ON admin_chat_conversations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE id = store_id
      AND user_id = auth.uid()
    )
  );

-- Admin can see all messages
CREATE POLICY admin_chat_messages_admin_all ON admin_chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Store can see messages from their conversations
CREATE POLICY admin_chat_messages_store_own ON admin_chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_chat_conversations ac
      JOIN stores s ON s.id = ac.store_id
      WHERE ac.id = conversation_id
      AND s.user_id = auth.uid()
    )
  );

-- Store can send messages to their conversations
CREATE POLICY admin_chat_messages_store_create ON admin_chat_messages
  FOR INSERT WITH CHECK (
    sender_type = 'store' AND
    EXISTS (
      SELECT 1 FROM admin_chat_conversations ac
      JOIN stores s ON s.id = ac.store_id
      WHERE ac.id = conversation_id
      AND s.user_id = auth.uid()
      AND sender_id = auth.uid()
    )
  );

COMMENT ON TABLE admin_chat_conversations IS 'Conversations between admin and stores for support/questions';
COMMENT ON TABLE admin_chat_messages IS 'Messages in admin-store conversations';
