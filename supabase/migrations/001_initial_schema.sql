-- ============================================================
-- Migration: 001_initial_schema.sql
-- Descripción: Crea las tablas users, conversations y progress
-- para el Tutor IA de Estadística Inferencial
-- ============================================================

-- Habilitar extensión para gen_random_uuid() si no existe
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Tabla: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Tabla: conversations
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]'::jsonb,
  material_context TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Índice para búsquedas por user_id
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);

-- ============================================================
-- Tabla: progress
-- ============================================================
CREATE TABLE IF NOT EXISTS progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'no_visto' CHECK (level IN ('no_visto', 'basico', 'intermedio', 'avanzado')),
  exercises_completed INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, topic)
);

-- Habilitar Row Level Security
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;

-- Índice para búsquedas por user_id
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON progress(user_id);

-- ============================================================
-- Políticas RLS básicas (permiten acceso con service_role key)
-- Las políticas granulares se agregan cuando se implemente auth
-- ============================================================

-- Policy: users - permitir operaciones con service role
CREATE POLICY "Service role full access on users"
  ON users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policy: conversations - permitir operaciones con service role
CREATE POLICY "Service role full access on conversations"
  ON conversations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policy: progress - permitir operaciones con service role
CREATE POLICY "Service role full access on progress"
  ON progress
  FOR ALL
  USING (true)
  WITH CHECK (true);
