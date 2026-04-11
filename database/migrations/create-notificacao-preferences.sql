-- =============================================================
-- Tabela: notificacao_preferences
-- Sprint 10 — Preferências de Notificação
-- Controla quais tipos de notificações cada usuário deseja receber
-- =============================================================

CREATE TABLE IF NOT EXISTS notificacao_preferences (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  tipo_notificacao TEXT NOT NULL CHECK (tipo_notificacao IN ('contribute', 'event', 'announcement', 'payment', 'system')),
  habilitada BOOLEAN NOT NULL DEFAULT TRUE,
  som BOOLEAN NOT NULL DEFAULT TRUE,
  vibrar BOOLEAN NOT NULL DEFAULT TRUE,
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(usuario_id, tipo_notificacao)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_prefs_usuario ON notificacao_preferences(usuario_id);
CREATE INDEX IF NOT EXISTS idx_prefs_tipo ON notificacao_preferences(tipo_notificacao);

-- Comments
COMMENT ON TABLE notificacao_preferences IS 'Preferências de notificação por tipo e usuário';
COMMENT ON COLUMN notificacao_preferences.habilitada IS 'Se o tipo de notificação está habilitado';
COMMENT ON COLUMN notificacao_preferences.som IS 'Se o som está habilitado para este tipo';
COMMENT ON COLUMN notificacao_preferences.vibrar IS 'Se vibração está habilitada para este tipo';
