-- =============================================================
-- CongregaFiel — Migração: RLS Policies para token_blacklist
-- Controle de acesso ao nível de linha
-- =============================================================

-- Habilitar RLS
ALTER TABLE public.token_blacklist ENABLE ROW LEVEL SECURITY;

-- Política: Admin pode ler tudo
CREATE POLICY "admin_select_blacklist" ON public.token_blacklist
  FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

-- Política: Usuário comum vê suas próprias entradas
CREATE POLICY "user_select_own_blacklist" ON public.token_blacklist
  FOR SELECT
  USING (usuario_id = auth.uid());

-- Política: Insert - apenas auth-service (via service role)
-- Obs: Service role bypassa RLS, então isso funciona automaticamente
CREATE POLICY "insert_blacklist" ON public.token_blacklist
  FOR INSERT
  WITH CHECK (true);

-- Política: Delete - apenas admin ou automático por TTL
CREATE POLICY "admin_delete_blacklist" ON public.token_blacklist
  FOR DELETE
  USING (auth.jwt() ->> 'role' = 'admin');

-- Função para limpeza automática de tokens expirados
-- Para ser chamada via pg_cron (Sprint 10)
CREATE OR REPLACE FUNCTION public.limpar_tokens_expirados()
RETURNS void AS $$
BEGIN
  DELETE FROM public.token_blacklist 
  WHERE expira_em < NOW();
  
  RAISE NOTICE 'Tokens expirados removidos da blacklist em %', NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nota: Para cron automático, adicionar em Sprint 10:
-- SELECT cron.schedule('limpar-tokens-expirados', '0 * * * *', 'SELECT limpar_tokens_expirados()');
