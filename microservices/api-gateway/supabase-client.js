// =============================================================
// CongregaFiel — Cliente Supabase do Gateway
// Conexão com BD e verficação de blacklist com cache
// =============================================================

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn("[supabase-client] Variáveis de ambiente SUPABASE_URL ou SERVICE_KEY não configuradas");
}

// Cliente Supabase com service_role (tem permissões completas)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Cache em memória: token_jti → { revogado: boolean, timestamp: number }
const CACHE_REVOGACAO = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Verifica se um token foi revogado (está na blacklist).
 * Usa cache em memória para reduzir queries ao BD.
 * 
 * @param {string} tokenJti - O JWT ID (claim "jti") do token
 * @returns {Promise<boolean>} true se revogado, false se ainda válido
 */
async function verificarRevogacao(tokenJti) {
  if (!tokenJti) {
    return false; // Token sem jti não pode estar na blacklist
  }

  // Verificar cache
  const cached = CACHE_REVOGACAO.get(tokenJti);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.revogado;
  }

  try {
    // Consultar blacklist no Supabase
    const { data, error } = await supabase
      .from("token_blacklist")
      .select("token_jti")
      .eq("token_jti", tokenJti)
      .maybeSingle();

    if (error) {
      // Se erro ao consultar, assumir que token é válido (falhar aberto)
      console.error("[supabase-client] Erro ao consultar blacklist:", error);
      return false;
    }

    // true se encontrou registro igual, false caso contrário
    const revogado = !!data;

    // Cachear o resultado
    CACHE_REVOGACAO.set(tokenJti, { revogado, timestamp: Date.now() });

    return revogado;
  } catch (err) {
    console.error("[supabase-client] Erro ao verificar revogação:", err);
    return false; // Falhar aberto: assume token válido em caso de erro
  }
}

/**
 * Limpar cache de revogação (para testes ou manual)
 */
function limparCache() {
  CACHE_REVOGACAO.clear();
}

module.exports = {
  supabase,
  verificarRevogacao,
  limparCache,
};
