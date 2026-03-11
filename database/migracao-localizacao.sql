-- =============================================================
-- CongregaFiel — Migração: Adicionar localização às igrejas
-- Execute no SQL Editor do Supabase
-- Seguro para re-executar (usa IF NOT EXISTS / condicionais)
-- =============================================================

-- 1. Adicionar colunas de coordenadas
ALTER TABLE igrejas ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE igrejas ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 2. Atualizar igrejas de exemplo com coordenadas reais
UPDATE igrejas SET
  latitude = -23.5505,
  longitude = -46.6333
WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  AND latitude IS NULL;

UPDATE igrejas SET
  latitude = -22.9068,
  longitude = -43.1729
WHERE id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
  AND latitude IS NULL;

-- 3. Índice para buscas geográficas
CREATE INDEX IF NOT EXISTS idx_igrejas_localizacao ON igrejas(latitude, longitude);
