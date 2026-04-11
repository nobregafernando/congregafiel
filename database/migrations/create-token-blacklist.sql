-- =============================================================
-- CongregaFiel — Migração: Criar tabela token_blacklist
-- Armazena tokens revogados para logout e revogação imediata
-- =============================================================

CREATE TABLE IF NOT EXISTS public.token_blacklist (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  token_jti TEXT UNIQUE NOT NULL,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  revogado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  motivo TEXT CHECK (motivo IN ('logout', 'revogacao_admin', 'senha_alterada', 'expiracao_forcada')),
  expira_em TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_token_blacklist_jti ON public.token_blacklist(token_jti);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_usuario ON public.token_blacklist(usuario_id);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_revogado ON public.token_blacklist(revogado_em);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expira ON public.token_blacklist(expira_em);

-- Comentários para documentação
COMMENT ON TABLE public.token_blacklist IS 'Armazena tokens revogados. Consultada pelo Gateway para validação centralizada.';
COMMENT ON COLUMN public.token_blacklist.token_jti IS 'JWT ID (claim jti do token) - única identificação do token';
COMMENT ON COLUMN public.token_blacklist.revogado_em IS 'Timestamp do logout/revogação';
COMMENT ON COLUMN public.token_blacklist.expira_em IS 'Quando remover automaticamente da blacklist';
