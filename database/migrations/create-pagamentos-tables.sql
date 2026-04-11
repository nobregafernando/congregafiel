CREATE TABLE IF NOT EXISTS pagamentos_abertos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL,
  valor NUMERIC(10, 2) NOT NULL,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('pix_qr_code', 'pix_copia_cola', 'cartao_credito')),
  mercado_pago_preference_id VARCHAR(100),
  mercado_pago_payment_id VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pendente_confirmacao', 'confirmado', 'recusado')),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  expira_em TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_abertos_usuario_id ON pagamentos_abertos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_abertos_status ON pagamentos_abertos(status);
CREATE INDEX IF NOT EXISTS idx_pagamentos_abertos_preference_id ON pagamentos_abertos(mercado_pago_preference_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_abertos_payment_id ON pagamentos_abertos(mercado_pago_payment_id);

CREATE TABLE IF NOT EXISTS pagamentos_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID,
  valor NUMERIC(10, 2) NOT NULL,
  tipo VARCHAR(50),
  metodo_pagamento VARCHAR(100),
  status VARCHAR(50),
  referencia_mp VARCHAR(100),
  erro_msg TEXT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_log_usuario_id ON pagamentos_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_log_status ON pagamentos_log(status);

ALTER TABLE contribuicoes
  ADD COLUMN IF NOT EXISTS usuario_id UUID,
  ADD COLUMN IF NOT EXISTS metodo_pagamento VARCHAR(100),
  ADD COLUMN IF NOT EXISTS referencia_externa VARCHAR(100),
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'confirmado',
  ADD COLUMN IF NOT EXISTS recebido_em TIMESTAMP DEFAULT NOW();
