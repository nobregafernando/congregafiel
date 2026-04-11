require("dotenv").config();

let createClient;
try {
  ({ createClient } = require("@supabase/supabase-js"));
} catch (erro) {
  createClient = null;
}

function criarClienteSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!createClient || !url || !key) {
    return null;
  }

  return createClient(url, key);
}

const supabase = criarClienteSupabase();

module.exports = {
  supabase,
  criarClienteSupabase,
};
