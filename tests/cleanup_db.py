"""Cleanup utilities: delete recent or ALL test artifacts from Supabase."""
import os
import requests
from datetime import datetime, timezone, timedelta
from urllib.parse import quote
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))


def _get_headers() -> dict[str, str] | None:
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_key:
        return None

    return {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }


def _get_owner() -> str | None:
    return os.getenv("NEXT_PUBLIC_V1_USER_UUID")


def cleanup_recent_items(hours: int = 3) -> tuple[int, int]:
    """Delete items and tags created in the last N hours. Returns (items_status, tags_status)."""
    headers = _get_headers()
    owner = _get_owner()
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")

    if not headers or not owner or not supabase_url:
        print("[CLEANUP] SKIP — missing env vars")
        return 0, 0

    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    cutoff_encoded = quote(cutoff, safe="")

    resp_items = requests.delete(
        f"{supabase_url}/rest/v1/items?owner=eq.{owner}&created_at=gt.{cutoff_encoded}",
        headers=headers,
    )
    resp_tags = requests.delete(
        f"{supabase_url}/rest/v1/tags?owner=eq.{owner}&created_at=gt.{cutoff_encoded}",
        headers=headers,
    )
    print(
        f"[CLEANUP] Recent items deleted (status {resp_items.status_code}), "
        f"tags deleted (status {resp_tags.status_code})"
    )
    return resp_items.status_code, resp_tags.status_code


def cleanup_all() -> tuple[int, int]:
    """Delete ALL items and tags for the test owner (versions cascade). Returns (items_status, tags_status)."""
    headers = _get_headers()
    owner = _get_owner()
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")

    if not headers or not owner or not supabase_url:
        print("[CLEANUP] SKIP — missing env vars")
        return 0, 0

    resp_items = requests.delete(
        f"{supabase_url}/rest/v1/items?owner=eq.{owner}",
        headers=headers,
    )
    resp_tags = requests.delete(
        f"{supabase_url}/rest/v1/tags?owner=eq.{owner}",
        headers=headers,
    )
    print(
        f"[CLEANUP] ALL items deleted (status {resp_items.status_code}), "
        f"ALL tags deleted (status {resp_tags.status_code})"
    )
    return resp_items.status_code, resp_tags.status_code


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "--all":
        cleanup_all()
    else:
        hours = int(sys.argv[1]) if len(sys.argv) > 1 else 3
        cleanup_recent_items(hours)
