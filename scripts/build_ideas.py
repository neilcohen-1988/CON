"""Build the sphere from the visually reviewed photo/video selection.

Run independently with: python3 scripts/build_ideas.py
Flat source artwork stays in its original project, outside this selection.
"""
import hashlib
import json
import math
from pathlib import Path

from PIL import Image
from content_exclusions import exclude_media
from idea_mattes import classify_matte


def build_ideas():
    public = Path(__file__).resolve().parents[1] / "public"
    read = lambda path: json.loads(path.read_text())
    selection = read(Path(__file__).with_name("ideas-selection.json"))["media"]
    selected = {entry["src"]: entry["kind"] for entry in selection}
    metadata = read(public / "data/index.json") + read(public / "data/projects.json")
    ideas, seen, found = [], set(), set()

    def media_blocks(value):
        if isinstance(value, dict):
            if value.get("src") and (value.get("type") in ("image", "video") or value.get("width")):
                yield value
            for child in value.values():
                yield from media_blocks(child)
        elif isinstance(value, list):
            for child in value:
                yield from media_blocks(child)

    for meta in metadata:
        folder = public / "data" / ("projects" if meta.get("editorial") else "")
        item = exclude_media(read(folder / (meta["id"] + ".json")))
        for block in media_blocks(item):
            if block["src"] not in selected:
                continue
            found.add(block["src"])
            key = block.get("youtubeId") or block["src"]
            if key in seen:
                continue
            seen.add(key)
            fragment = dict(block)
            fragment.setdefault("type", "image")
            if fragment["type"] == "image" and not fragment.get("thumb"):
                thumb = public / "media" / (Path(fragment["src"]).stem + "-idea.webp")
                if not thumb.exists():
                    with Image.open(public / fragment["src"].lstrip("/")) as original:
                        image = original.convert("RGB")
                        image.thumbnail((560, 560))
                        image.save(thumb, "WEBP", quality=82, method=4)
                fragment["thumb"] = "/" + str(thumb.relative_to(public))
            digest = hashlib.sha1(key.encode()).hexdigest()
            ideas.append(dict(id="idea-" + digest[:12], project=meta, media=fragment,
                              contentKind=selected[block["src"]],
                              matte=classify_matte(fragment, public)))
    missing = set(selected) - found
    if missing:
        raise ValueError("Selected media missing from source projects: " + ", ".join(sorted(missing)))
    ideas.sort(key=lambda item: hashlib.sha1(item["media"]["src"].encode()).hexdigest())
    # Place two moving photographs in the opening view, alongside stills.
    # Their slots use the same golden-angle sphere as the viewer.
    featured = [
        ("/media/projects/otef/otef-01-film.mp4", -.23, .10),
        ("/media/projects/dressed-to-protest/identity-07-silent.mp4", .23, -.10),
    ]
    occupied = set()
    for src, longitude, latitude in featured:
        source = next(i for i, item in enumerate(ideas) if item["media"]["src"] == src)
        def distance(index):
            lat = math.asin(1 - 2 * (index + .5) / len(ideas))
            lon = index * math.pi * (3 - math.sqrt(5))
            return -(math.sin(lat) * math.sin(latitude)
                     + math.cos(lat) * math.cos(latitude) * math.cos(lon - longitude))
        target = min((i for i in range(len(ideas)) if i not in occupied), key=distance)
        ideas[source], ideas[target] = ideas[target], ideas[source]
        occupied.add(target)
    (public / "data/ideas.json").write_text(json.dumps(ideas, ensure_ascii=False))
    return ideas


if __name__ == "__main__":
    ideas = build_ideas()
    print(f"Prepared {len(ideas)} photographs and videos for Ideas.")
