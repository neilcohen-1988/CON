"""Usage: python3 scripts/import-archive.py /path/to/squarespace-export
Requires Pillow. Originals remain in the source archive.
"""
import concurrent.futures
import copy
import json
import re
import shutil
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit
from PIL import Image, ImageOps
from content_exclusions import exclude_media

source = Path(sys.argv[1])
root = Path(__file__).resolve().parents[1]
public = root / "public"
media = public / "media"
data = public / "data"
media.mkdir(exist_ok=True)
data.mkdir(exist_ok=True)
catalog = json.loads((source / "catalog.json").read_text())
video_sources = json.loads((root / "scripts/source-video-links.json").read_text())
video_links = {
    unquote(urlsplit(video["posterSource"]).path): video
    for project in video_sources["projects"] for video in project["videos"]
}
# Release years come from explicit project copy, never file timestamps.
types = [
    "Ceramic Hanukkiah", "Screen-printed T-shirt", "Screen-printed T-shirt",
    "Objects & containers", "Screen-printed T-shirt", "Screen-printed T-shirt",
    "Screen-printed T-shirt", "Screen-printed T-shirt", "Screen-printed T-shirt",
    "Screen-printed T-shirt", "Printed T-shirt", "Screen-printed T-shirt",
    "Screen-printed T-shirt", "Screen-printed T-shirt", "Screen-printed T-shirt",
    "Canvas tote", "Nine postcards", "Screen-printed T-shirt", "Printed sweatshirt",
    "Screen-printed T-shirt", "Screen-printed T-shirt", "Printed sweatshirt",
    "Canvas tote", "Embroidered hoodie", "Hoodie & sweatshirt",
    "Screen-printed T-shirt", "Embroidered socks", "Embroidered socks",
    "Hoodie & sweatshirt",
]
paths = set()
def collect(value):
    if isinstance(value, dict):
        if value.get("localPath"):
            paths.add(value["localPath"])
        for item in value.values():
            collect(item)
    elif isinstance(value, list):
        for item in value:
            collect(item)
collect(catalog["products"])
covers = {p["productImages"][0]["localPath"] for p in catalog["products"]}

def convert(path):
    original = source / path
    stem = original.stem
    if original.suffix.lower() == ".gif":
        dest = media / f"{stem}.gif"
        shutil.copyfile(original, dest)
    else:
        dest = media / f"{stem}.webp"
        with Image.open(original) as im:
            im = ImageOps.exif_transpose(im)
            im.thumbnail((1600, 1600))
            im.save(dest, "WEBP", quality=85, method=4)
    with Image.open(original) as im:
        size = im.size
        thumb = None
        if path in covers:
            im = ImageOps.exif_transpose(im).convert("RGB")
            im.thumbnail((640, 640))
            thumb = media / f"{stem}-thumb.webp"
            im.save(thumb, "WEBP", quality=85, method=4)
    return path, {"src": f"/media/{dest.name}", "width": size[0],
                  "height": size[1], "thumb": f"/media/{thumb.name}" if thumb else None}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    assets = dict(pool.map(convert, sorted(paths)))

def rewrite(value):
    if isinstance(value, dict):
        video = video_links.get(unquote(urlsplit(value.get("sourceUrl", "")).path))
        if video:
            value["youtubeId"] = video["youtubeId"]
            value["videoTitle"] = video.get("videoTitle", "")
        if value.get("localPath"):
            value.update(assets[value.pop("localPath")])
        for key in ("sourceUrl", "sourcePage", "videoReference"):
            value.pop(key, None)
        for item in value.values():
            rewrite(item)
    elif isinstance(value, list):
        for item in value:
            rewrite(item)
index = []
for number, original in enumerate(catalog["products"]):
    item = copy.deepcopy(original)
    rewrite(item)
    item = exclude_media(item)
    item["number"] = number + 1
    item["objectType"] = types[number]
    item["year"] = 2024 if "JDW X CON" in item["title"] else None
    item["yearSource"] = "Original project text: Jerusalem Design Week 2024" if item["year"] else None
    item["displayTitle"] = item["title"].split(" - CON X")[0].split(" - JDW X")[0]
    item["collaboration"] = "Con × Hafontia × Dan Reisinger Estate" if "REISINGER" in item["title"] else "Con × Jerusalem Design Week" if "JDW" in item["title"] else ""
    first_story = next((section["text"] for section in item["projectContent"] if section.get("text")), "")
    item["concept"] = first_story.split("\n\n")[0] if first_story else item["productDescription"]["text"].split("\n")[0]
    (data / f'{item["id"]}.json').write_text(json.dumps(item, ensure_ascii=False))
    index.append({key: item[key] for key in ("id", "number", "title", "displayTitle", "objectType", "year", "concept", "collaboration")} | {"cover": item["productImages"][0]})
(data / "index.json").write_text(json.dumps(index, ensure_ascii=False))
print(f"Imported {len(index)} projects, {len(assets)} media files. {sum(p['year'] is not None for p in index)} release years confirmed.")
