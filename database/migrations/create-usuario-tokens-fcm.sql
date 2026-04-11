-- =============================================================
-- Tabela: usuario_tokens_fcm
-- Sprint 10 — FCM Integration
-- Armazena tokens Firebase Cloud Messaging para notificações push
-- =============================================================

CREATE TABLE IF NOT EXISTS usuario_tokens_fcm (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('web', 'ios', 'android')),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(fcm_token)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_fcm_usuario_id ON usuario_tokens_fcm(usuario_id);
CREATE INDEX IF NOT EXISTS idx_fcm_device_type ON usuario_tokens_fcm(device_type);
CREATE INDEX IF NOT EXISTS idx_fcm_atualizado_em ON usuario_tokens_fcm(atualizado_em);

-- Comments para documentação
COMMENT ON TABLE usuario_tokens_fcm IS 'Armazena tokens FCM de usuários para envio de notificações push';
COMMENT ON COLUMN usuario_tokens_fcm.fcm_token IS 'Token único do Firebase Cloud Messaging';
COMMENT ON COLUMN usuario_tokens_fcm.device_type IS 'Tipo de dispositivo: web, ios ou android';
