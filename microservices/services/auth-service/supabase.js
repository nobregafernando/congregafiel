// Microserviço Auth — cliente Supabase
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error("ERRO: SUPABASE_URL e SUPABASE_SECRET_KEY são obrigatórios");
  process.exit(1);
}

const supabase = createClient(url, key);

function criarClienteAuth() {
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

module.exports = { supabase, criarClienteAuth };
