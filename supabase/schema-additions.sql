-- =====================================================
-- 법률AI 플랫폼 - Feature 추가 마이그레이션
-- Supabase SQL 편집기에서 실행하세요
-- =====================================================

-- 1) lawyers 테이블 컬럼 추가
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS one_liner text DEFAULT '';
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS consultation_methods text[] DEFAULT '{}';
ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS base_fee_manwon integer DEFAULT 0;

-- 2) matchings 테이블 컬럼 추가
ALTER TABLE matchings ADD COLUMN IF NOT EXISTS case_summary jsonb;
ALTER TABLE matchings ADD COLUMN IF NOT EXISTS fee_min integer DEFAULT 50000;
ALTER TABLE matchings ADD COLUMN IF NOT EXISTS fee_max integer DEFAULT 200000;
ALTER TABLE matchings ADD COLUMN IF NOT EXISTS consultation_method text DEFAULT 'phone';

-- 3) chat_rooms 테이블
CREATE TABLE IF NOT EXISTS chat_rooms (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matching_id   uuid REFERENCES matchings(id) ON DELETE SET NULL,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lawyer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lawyer_id     uuid NOT NULL REFERENCES lawyers(id) ON DELETE CASCADE,
  created_at    timestamptz DEFAULT now(),
  last_message_at timestamptz DEFAULT now()
);

-- 4) messages 테이블
CREATE TABLE IF NOT EXISTS messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     text NOT NULL DEFAULT '',
  file_name   text,
  file_data   text,  -- base64 (소용량 첨부파일용)
  file_type   text,
  file_size   integer,
  is_read     boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- 5) 인덱스
CREATE INDEX IF NOT EXISTS idx_messages_room_created   ON messages(room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_user         ON chat_rooms(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_lawyer_user  ON chat_rooms(lawyer_user_id);
CREATE INDEX IF NOT EXISTS idx_matchings_status        ON matchings(status, created_at);
CREATE INDEX IF NOT EXISTS idx_proposals_matching      ON proposals(matching_id, created_at);
CREATE INDEX IF NOT EXISTS idx_lawyers_status_specialty ON lawyers(status);

-- 6) RLS 활성화
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages   ENABLE ROW LEVEL SECURITY;

-- matchings: 본인 + 승인된 변호사(오픈 매칭 조회)
DROP POLICY IF EXISTS "matchings_user_own"         ON matchings;
DROP POLICY IF EXISTS "matchings_lawyers_open"     ON matchings;
DROP POLICY IF EXISTS "matchings_user_insert"      ON matchings;
DROP POLICY IF EXISTS "matchings_user_update"      ON matchings;

CREATE POLICY "matchings_user_insert" ON matchings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "matchings_user_update" ON matchings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "matchings_select" ON matchings
  FOR SELECT USING (
    auth.uid() = user_id
    OR (
      status = 'matching'
      AND EXISTS (
        SELECT 1 FROM lawyers WHERE user_id = auth.uid() AND status = 'approved'
      )
    )
  );

-- proposals
DROP POLICY IF EXISTS "proposals_select"     ON proposals;
DROP POLICY IF EXISTS "proposals_insert"     ON proposals;
DROP POLICY IF EXISTS "proposals_update"     ON proposals;

CREATE POLICY "proposals_select" ON proposals
  FOR SELECT USING (
    matching_id IN (SELECT id FROM matchings WHERE user_id = auth.uid())
    OR lawyer_id IN (SELECT id FROM lawyers WHERE user_id = auth.uid())
  );

CREATE POLICY "proposals_insert" ON proposals
  FOR INSERT WITH CHECK (
    lawyer_id IN (SELECT id FROM lawyers WHERE user_id = auth.uid() AND status = 'approved')
  );

CREATE POLICY "proposals_update" ON proposals
  FOR UPDATE USING (
    matching_id IN (SELECT id FROM matchings WHERE user_id = auth.uid())
  );

-- chat_rooms
DROP POLICY IF EXISTS "chat_rooms_select" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_insert" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_update" ON chat_rooms;

CREATE POLICY "chat_rooms_select" ON chat_rooms
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = lawyer_user_id);

CREATE POLICY "chat_rooms_insert" ON chat_rooms
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = lawyer_user_id);

CREATE POLICY "chat_rooms_update" ON chat_rooms
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = lawyer_user_id);

-- messages
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_update" ON messages;

CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (
    room_id IN (
      SELECT id FROM chat_rooms WHERE user_id = auth.uid() OR lawyer_user_id = auth.uid()
    )
  );

CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    room_id IN (
      SELECT id FROM chat_rooms WHERE user_id = auth.uid() OR lawyer_user_id = auth.uid()
    )
  );

CREATE POLICY "messages_update" ON messages
  FOR UPDATE USING (
    room_id IN (
      SELECT id FROM chat_rooms WHERE user_id = auth.uid() OR lawyer_user_id = auth.uid()
    )
  );

-- 7) Realtime 활성화 (proposals + messages)
ALTER PUBLICATION supabase_realtime ADD TABLE proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;
