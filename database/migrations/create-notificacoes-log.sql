-- =============================================================
-- Tabela: notificacoes_log
-- Sprint 10 — Auditoria de Notificações
-- Registra tôdas as notificações enviadas
-- =============================================================

CREATE TABLE IF NOT EXISTS notificacoes_log (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  notif_id TEXT NOT NULL UNIQUE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  corpo TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('contribute', 'event', 'announcement', 'payment', 'system')),
  total_enviadas INT DEFAULT 0,
  total_erros INT DEFAULT 0,
  timing_ms INT DEFAULT 0,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notif_usuario ON notificacoes_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notif_tipo ON notificacoes_log(tipo);
CREATE INDEX IF NOT EXISTS idx_notif_criado_em ON notificacoes_log(criado_em);
CREATE INDEX IF NOT EXISTS idx_notif_notif_id ON notificacoes_log(notif_id);

-- Comments
COMMENT ON TABLE notificacoes_log IS 'Auditoria de notificações enviadas via FCM';
COMMENT ON COLUMN notificacoes_log.notif_id IS 'ID único para rastreamento da notificação';
