require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error("ERRO: SUPABASE_URL e SUPABASE_SECRET_KEY são obrigatórios");
  process.exit(1);
}

module.exports = createClient(url, key);
