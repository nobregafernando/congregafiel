-- Migração: Adicionar coluna tipo na tabela eventos
-- Para categorizar eventos como culto, estudo bíblico, conferência, etc.

ALTER TABLE eventos ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) DEFAULT 'evento';

COMMENT ON COLUMN eventos.tipo IS 'Tipo do evento: culto, estudo, conferencia, especial, evento';
