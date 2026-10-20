"""User-curated exclusions apply to every presentation, not to source archives."""
import json
from pathlib import Path

EXCLUDED_MEDIA = set(json.loads(Path(__file__).with_name("excluded-media.json").read_text()))


def exclude_media(value):
    if isinstance(value, list):
        return [exclude_media(item) for item in value
                if not isinstance(item, dict) or item.get("src") not in EXCLUDED_MEDIA]
    if isinstance(value, dict):
        return {key: exclude_media(item) for key, item in value.items()}
    return value
