// =============================================================
// CongregaFiel — Cliente Supabase (Express)
// =============================================================

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("ERRO: SUPABASE_URL e SUPABASE_SECRET_KEY devem estar definidos no .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Cliente separado para operações de auth (signIn/signUp)
// Evita que signInWithPassword mude a sessão do cliente principal
function criarClienteAuth() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

module.exports = supabase;
module.exports.criarClienteAuth = criarClienteAuth;
