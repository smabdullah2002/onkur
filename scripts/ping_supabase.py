import os
import sys

import requests
from dotenv import load_dotenv

ENV_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend", ".env")
OK_STATUSES = (200, 204, 206)


def main() -> int:
    if os.path.isfile(ENV_FILE):
        load_dotenv(ENV_FILE)
        print(f"Loaded env from {ENV_FILE}")
    else:
        print(f"No {ENV_FILE}, using environment variables")

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")

    if not url or not key:
        print("SUPABASE_URL and SUPABASE_KEY must be set")
        return 1

    if not url.startswith(("http://", "https://")):
        print(f"Invalid SUPABASE_URL: {url!r} (did you set the SUPABASE_URL secret?)")
        return 1

    target = f"{url.rstrip('/')}/rest/v1/plants?select=id&limit=1"
    print(f"Pinging {target}")

    try:
        response = requests.get(
            f"{url.rstrip('/')}/rest/v1/plants",
            params={"select": "id", "limit": 1},
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
            },
            timeout=15,
        )
    except requests.RequestException as exc:
        print(f"Supabase ping failed: {exc}")
        return 1

    print(f"Response: HTTP {response.status_code} ({response.elapsed.total_seconds():.2f}s)")

    if response.status_code in OK_STATUSES:
        print("Ping OK")
        return 0

    print(f"Supabase ping failed: HTTP {response.status_code}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
