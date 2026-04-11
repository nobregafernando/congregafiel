-- =============================================================
-- CongregaFiel — Migração: Criar tabela refresh_tokens
-- Armazena refresh tokens para renovação de sessão
-- =============================================================

CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  token_jti TEXT UNIQUE NOT NULL,
  refresh_token TEXT UNIQUE NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  expira_em TIMESTAMP NOT NULL,
  revogado_em TIMESTAMP,
  dispositivo TEXT,
  ip_address TEXT
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON public.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_jti ON public.refresh_tokens(token_jti);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expira ON public.refresh_tokens(expira_em);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revogado ON public.refresh_tokens(revogado_em);

-- Comentários
COMMENT ON TABLE public.refresh_tokens IS 'Armazena refresh tokens para renovação de JWT sem novo login';
COMMENT ON COLUMN public.refresh_tokens.token_jti IS 'JWT ID do access token original';
COMMENT ON COLUMN public.refresh_tokens.refresh_token IS 'Token para renovar o acesso (signed JWT)';
COMMENT ON COLUMN public.refresh_tokens.expira_em IS 'Quando este refresh token inválida (ex: 30 dias)';
COMMENT ON COLUMN public.refresh_tokens.dispositivo IS 'User-Agent do cliente para auditoria';
COMMENT ON COLUMN public.refresh_tokens.ip_address IS 'IP do cliente para segurança';
