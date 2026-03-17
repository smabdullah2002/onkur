import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
SUPABASE_DEV_USER_ID = os.getenv("SUPABASE_DEV_USER_ID")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
