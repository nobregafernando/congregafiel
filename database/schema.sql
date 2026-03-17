-- =============================================================
-- CongregaFiel — Schema do Banco de Dados (Supabase/PostgreSQL)
-- Execute este arquivo no SQL Editor do Supabase
-- Seguro para re-executar (usa IF NOT EXISTS)
-- =============================================================

-- -------------------- Extensões --------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABELA: igrejas
-- =============================================
CREATE TABLE IF NOT EXISTS igrejas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(200) NOT NULL,
    endereco TEXT DEFAULT '',
    descricao TEXT DEFAULT '',
    codigo VARCHAR(10) UNIQUE NOT NULL,
    nome_pastor VARCHAR(200) DEFAULT '',
    email VARCHAR(200),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    senha_hash TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW(),
    criado_por UUID,
    atualizado_por UUID
);

-- =============================================
-- TABELA: membros
-- =============================================
CREATE TABLE IF NOT EXISTS membros (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_completo VARCHAR(200) NOT NULL,
    email VARCHAR(200),
    telefone VARCHAR(20) DEFAULT '',
    tipo VARCHAR(20) DEFAULT 'membro' CHECK (tipo IN ('pastor', 'membro')),
    senha_hash TEXT,
    igreja_id UUID NOT NULL REFERENCES igrejas(id) ON DELETE CASCADE,
    codigo_igreja VARCHAR(10),
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW(),
    criado_por UUID,
    atualizado_por UUID
);

-- =============================================
-- TABELA: eventos
-- =============================================
CREATE TABLE IF NOT EXISTS eventos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT DEFAULT '',
    data DATE NOT NULL,
    horario VARCHAR(10) DEFAULT '',
    local VARCHAR(300) DEFAULT '',
    igreja_id UUID NOT NULL REFERENCES igrejas(id) ON DELETE CASCADE,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW(),
    criado_por UUID,
    atualizado_por UUID
);

-- =============================================
-- TABELA: contribuicoes
-- =============================================
CREATE TABLE IF NOT EXISTS contribuicoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    membro_id UUID NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
    igreja_id UUID NOT NULL REFERENCES igrejas(id) ON DELETE CASCADE,
    membro_nome VARCHAR(200) DEFAULT '',
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('dizimo', 'oferta', 'doacao', 'outro')),
    valor DECIMAL(10, 2) NOT NULL CHECK (valor > 0),
    data DATE DEFAULT CURRENT_DATE,
    descricao TEXT DEFAULT '',
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW(),
    criado_por UUID,
    atualizado_por UUID
);

-- =============================================
-- TABELA: comunicados
-- =============================================
CREATE TABLE IF NOT EXISTS comunicados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    igreja_id UUID NOT NULL REFERENCES igrejas(id) ON DELETE CASCADE,
    titulo VARCHAR(200) NOT NULL,
    conteudo TEXT NOT NULL,
    prioridade VARCHAR(10) DEFAULT 'normal' CHECK (prioridade IN ('normal', 'urgente')),
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW(),
    criado_por UUID,
    atualizado_por UUID
);

-- =============================================
-- TABELA: pedidos_oracao
-- =============================================
CREATE TABLE IF NOT EXISTS pedidos_oracao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    igreja_id UUID NOT NULL REFERENCES igrejas(id) ON DELETE CASCADE,
    membro_id UUID NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
    membro_nome VARCHAR(200) DEFAULT '',
    pedido TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'orado', 'respondido')),
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW(),
    criado_por UUID,
    atualizado_por UUID
);

-- =============================================
-- ÍNDICES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_membros_igreja_id ON membros(igreja_id);
CREATE INDEX IF NOT EXISTS idx_eventos_igreja_id ON eventos(igreja_id);
CREATE INDEX IF NOT EXISTS idx_eventos_data ON eventos(data);
CREATE INDEX IF NOT EXISTS idx_contribuicoes_igreja_id ON contribuicoes(igreja_id);
CREATE INDEX IF NOT EXISTS idx_contribuicoes_membro_id ON contribuicoes(membro_id);
CREATE INDEX IF NOT EXISTS idx_comunicados_igreja_id ON comunicados(igreja_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_oracao_igreja_id ON pedidos_oracao(igreja_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_oracao_membro_id ON pedidos_oracao(membro_id);
CREATE INDEX IF NOT EXISTS idx_igrejas_localizacao ON igrejas(latitude, longitude);

-- =============================================
-- TRIGGER: atualizar atualizado_em automaticamente
-- =============================================
CREATE OR REPLACE FUNCTION atualizar_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_igrejas_atualizado_em ON igrejas;
CREATE TRIGGER trigger_igrejas_atualizado_em
    BEFORE UPDATE ON igrejas
    FOR EACH ROW EXECUTE FUNCTION atualizar_atualizado_em();

DROP TRIGGER IF EXISTS trigger_membros_atualizado_em ON membros;
CREATE TRIGGER trigger_membros_atualizado_em
    BEFORE UPDATE ON membros
    FOR EACH ROW EXECUTE FUNCTION atualizar_atualizado_em();

DROP TRIGGER IF EXISTS trigger_eventos_atualizado_em ON eventos;
CREATE TRIGGER trigger_eventos_atualizado_em
    BEFORE UPDATE ON eventos
    FOR EACH ROW EXECUTE FUNCTION atualizar_atualizado_em();

DROP TRIGGER IF EXISTS trigger_contribuicoes_atualizado_em ON contribuicoes;
CREATE TRIGGER trigger_contribuicoes_atualizado_em
    BEFORE UPDATE ON contribuicoes
    FOR EACH ROW EXECUTE FUNCTION atualizar_atualizado_em();

DROP TRIGGER IF EXISTS trigger_comunicados_atualizado_em ON comunicados;
CREATE TRIGGER trigger_comunicados_atualizado_em
    BEFORE UPDATE ON comunicados
    FOR EACH ROW EXECUTE FUNCTION atualizar_atualizado_em();

DROP TRIGGER IF EXISTS trigger_pedidos_oracao_atualizado_em ON pedidos_oracao;
CREATE TRIGGER trigger_pedidos_oracao_atualizado_em
    BEFORE UPDATE ON pedidos_oracao
    FOR EACH ROW EXECUTE FUNCTION atualizar_atualizado_em();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE igrejas ENABLE ROW LEVEL SECURITY;
ALTER TABLE membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contribuicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comunicados ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_oracao ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para a service_role (usada pelo backend)
-- O backend usa a SUPABASE_SECRET_KEY que bypassa RLS automaticamente.
-- Caso queira acesso direto do frontend no futuro, adicione políticas específicas aqui.

-- =============================================
-- DADOS INICIAIS DE EXEMPLO
-- =============================================

-- Igrejas
INSERT INTO igrejas (id, nome, endereco, descricao, codigo, nome_pastor, email, latitude, longitude) VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Igreja Batista Central', 'Rua 14 de Julho, 1532 - Centro, Campo Grande/MS', 'Igreja tradicional fundada em 1950', 'CF1234', 'Pastor João Silva', 'central@congregafiel.com', -20.4628, -54.6156),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Comunidade Evangélica Graça', 'Av. Afonso Pena, 2880 - Jardim dos Estados, Campo Grande/MS', 'Comunidade focada em jovens e famílias', 'CF5678', 'Pastor Carlos Souza', 'graca@congregafiel.com', -20.4539, -54.6107)
ON CONFLICT (id) DO NOTHING;

-- Membros
INSERT INTO membros (id, nome_completo, email, telefone, tipo, igreja_id, codigo_igreja) VALUES
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'João Silva', 'joao@email.com', '(11) 99999-1111', 'pastor', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'CF1234'),
    ('d4e5f6a7-b8c9-0123-defa-234567890123', 'Maria Oliveira', 'maria@email.com', '(11) 99999-2222', 'membro', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'CF1234'),
    ('e5f6a7b8-c9d0-1234-efab-345678901234', 'Carlos Souza', 'carlos@email.com', '(21) 99999-3333', 'pastor', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'CF5678'),
    ('f6a7b8c9-d0e1-2345-fabc-456789012345', 'Ana Santos', 'ana@email.com', '(21) 99999-4444', 'membro', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'CF5678')
ON CONFLICT (id) DO NOTHING;

-- Eventos
INSERT INTO eventos (titulo, descricao, data, horario, local, igreja_id) VALUES
    ('Culto de Domingo', 'Culto dominical com louvor e pregação', '2026-03-08', '10:00', 'Templo Principal', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
    ('Estudo Bíblico', 'Estudo do livro de Romanos', '2026-03-11', '19:30', 'Sala 3', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
    ('Encontro de Jovens', 'Louvor, dinâmicas e estudo bíblico', '2026-03-14', '18:00', 'Salão de Eventos', 'b2c3d4e5-f6a7-8901-bcde-f12345678901');

-- Contribuições
INSERT INTO contribuicoes (membro_id, igreja_id, membro_nome, tipo, valor, data, descricao) VALUES
    ('d4e5f6a7-b8c9-0123-defa-234567890123', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Maria Oliveira', 'dizimo', 500.00, '2026-03-01', 'Dízimo de março'),
    ('d4e5f6a7-b8c9-0123-defa-234567890123', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Maria Oliveira', 'oferta', 100.00, '2026-03-02', 'Oferta missionária'),
    ('f6a7b8c9-d0e1-2345-fabc-456789012345', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Ana Santos', 'dizimo', 350.00, '2026-03-01', 'Dízimo de março');

-- Comunicados
INSERT INTO comunicados (igreja_id, titulo, conteudo, prioridade) VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Retiro Espiritual', 'Nosso retiro anual será nos dias 20-22 de março. Inscrições abertas!', 'normal'),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Mutirão de Limpeza', 'Precisamos de voluntários para o mutirão neste sábado às 8h.', 'urgente'),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Campanha do Agasalho', 'Estamos recebendo doações de roupas de inverno até o final do mês.', 'normal');

-- Pedidos de Oração
INSERT INTO pedidos_oracao (igreja_id, membro_id, membro_nome, pedido, status) VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'Maria Oliveira', 'Oração pela saúde da minha mãe que está internada.', 'pendente'),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'Maria Oliveira', 'Agradeço a Deus pela aprovação no concurso!', 'respondido'),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'f6a7b8c9-d0e1-2345-fabc-456789012345', 'Ana Santos', 'Peço oração pelo meu filho que está passando por dificuldades.', 'pendente');
