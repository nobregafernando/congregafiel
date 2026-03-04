# =============================================================
# CongregaFiel — Cliente Supabase (FastAPI)
# =============================================================

import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")

if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
    raise RuntimeError("SUPABASE_URL e SUPABASE_SECRET_KEY devem estar definidos no .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)
