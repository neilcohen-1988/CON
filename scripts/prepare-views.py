"""Import selected project presentations and build the Ideas media index.

Usage: python3 scripts/prepare-views.py /path/to/Personal-Website /path/to/dudu-geva-site
Optional FFMPEG_PATH points to an installed ffmpeg binary.
"""
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from PIL import Image, ImageOps
from build_ideas import build_ideas

portfolio, dudu = map(Path, sys.argv[1:3])
public = Path(__file__).resolve().parents[1] / "public"
destination = public / "media/projects"
destination.mkdir(parents=True, exist_ok=True)
(public / "data/projects").mkdir(parents=True, exist_ok=True)
ffmpeg = os.environ.get("FFMPEG_PATH", "ffmpeg")
jobs = []


def read(path):
    return json.loads(path.read_text())


def image(path, slug, alt=""):
    folder = destination / slug
    folder.mkdir(exist_ok=True)
    name = path.stem + "-" + hashlib.sha1(str(path).encode()).hexdigest()[:6]
    output, thumb = folder / (name + ".webp"), folder / (name + "-thumb.webp")
    with Image.open(path) as original:
        im = ImageOps.exif_transpose(original).convert("RGB")
        im.thumbnail((1800, 1800))
        width, height = im.size
        if not output.exists():
            im.save(output, "WEBP", quality=86, method=4)
        im.thumbnail((560, 560))
        if not thumb.exists():
            im.save(thumb, "WEBP", quality=82, method=4)
    return dict(type="image", src="/" + str(output.relative_to(public)),
                thumb="/" + str(thumb.relative_to(public)), width=width,
                height=height, alt=alt)


def media(record, slug):
    if record.get("kind") in ("video", "loop"):
        folder = destination / slug
        folder.mkdir(exist_ok=True)
        original = portfolio / "public" / record["src"].lstrip("/")
        output = folder / (original.stem + ".mp4")
        preview = folder / (original.stem + "-preview.mp4")
        poster = image(portfolio / "public" / record["poster"].lstrip("/"), slug, record.get("alt", ""))
        jobs.append((original, output, preview, record.get("preview")))
        return dict(type="video", src="/" + str(output.relative_to(public)),
                    preview="/" + str(preview.relative_to(public)), poster=poster["src"],
                    thumb=poster["thumb"], width=record["width"], height=record["height"],
                    alt=record.get("alt", ""), muted=bool(record.get("muted", False)))
    return image(portfolio / "public" / record["src"].lstrip("/"), slug, record.get("alt", ""))


def paragraphs(text):
    return [dict(type="p", text=p) for p in text.split("\n") if p.strip()]


def project(slug, title, cover_record, records, extra_text=""):
    source = read(portfolio / "projects/new" / slug / "project.json")
    cover = image(portfolio / "public" / cover_record.lstrip("/"), slug, title)
    blocks = []
    if extra_text:
        blocks.extend(paragraphs(extra_text))
    blocks.extend(media(r, slug) for r in records)
    credits = source.get("credits", []) + source.get("additionalCredits", [])
    if credits:
        blocks.append(dict(type="h3", text="Credits"))
        for credit in credits:
            blocks.extend(paragraphs(credit if isinstance(credit, str) else
                                    credit["role"] + " — " + ", ".join(credit["names"])))
    return dict(id=slug, displayTitle=title, title=source["title"], editorial=True,
                objectType=source["category"], year=int(source["year"]), cover=cover,
                collaboration=source.get("client", ""), productImages=[cover],
                productDescription=dict(blocks=paragraphs(source["description"])),
                projectContent=[dict(blocks=blocks)], additionalPageImages=[])


reisinger = read(portfolio / "src/data/reisinger-media.json")
website = read(portfolio / "src/data/reisinger-website.json")
website.update(kind="video", preview="/assets/projects/dan-reisinger-letters/website-preview.mp4", muted=True)
otef = read(portfolio / "src/data/otef-media.json")
shirts = read(portfolio / "src/data/otef-shirts.json")
dressed = read(portfolio / "src/data/dressed-to-protest-media.json")
loops = read(portfolio / "src/data/dressed-to-protest-loops.json")
dressed_copy = read(portfolio / "projects/new/dressed-to-protest/project.json")
presentations = [
    project("dan-reisinger-letters", "אותיות ריזינגר",
            "/assets/projects/dan-reisinger-letters/work-cover-filled.webp",
            [website, *reisinger["research"], *reisinger["merch"]]),
    project("otef", "עוטף", "/assets/projects/otef/shirts/closeups-carosel-03.webp",
            [r for r in otef if r.get("src")] + shirts["shirts"] + shirts["closeups"]),
    project("dressed-to-protest", "לובשים מחאה", dressed["poster-wall"]["src"],
            list(dressed.values()) + loops, "\n\n".join(dressed_copy["texts"].values())),
]
dudu_copy = read(dudu / "public/content.json")
dudu_cover = image(dudu / "assets/images/gallery.png", "dudu-geva-was-here", "עבודות דודו גבע")
dudu_blocks = [image(dudu / "assets/images/slide.png", "dudu-geva-was-here", "מתוך עבודות דודו גבע"),
               dict(type="h3", text="קרדיטים")]
dudu_blocks.extend(paragraphs(dudu_copy["credits_col_a"] + "\n" + dudu_copy["credits_col_b"]))
presentations.append(dict(
    id="dudu-geva-was-here", displayTitle="דודו גבע היה פה", title="דודו גבע היה פה",
    editorial=True, direction="rtl", objectType="Exhibition & visual culture", year=None,
    collaboration="קון × האחים × מוזיאון תל אביב לאמנות", cover=dudu_cover,
    productImages=[dudu_cover], productDescription=dict(blocks=paragraphs(dudu_copy["body_text"])),
    projectContent=[dict(blocks=dudu_blocks)], additionalPageImages=[]))

buy_bye = public / "data/projects/jdw-buy-bye.json"
if buy_bye.exists():
    presentations.append(read(buy_bye))

index = []
project_websites = {
    "dan-reisinger-letters": dict(href="https://reisinger.hafontia.com/", label="Visit Reisinger Letters website"),
    "otef": dict(href="https://otef.shop/", label="Visit Otef website"),
    "dudu-geva-was-here": dict(href="https://group.haachim.co.il/", label="Visit Haachim Group website"),
}
for item in presentations:
    if item["id"] in project_websites:
        item["website"] = project_websites[item["id"]]
    (public / "data/projects" / (item["id"] + ".json")).write_text(json.dumps(item, ensure_ascii=False))
    index.append({k: item[k] for k in ("id", "displayTitle", "title", "editorial", "objectType", "year", "collaboration", "cover")})
(public / "data/projects.json").write_text(json.dumps(index, ensure_ascii=False))

# Reuse the reviewed photography/video selection when rebuilding project imports.
ideas = build_ideas()


def encode(job):
    source, output, preview, existing_preview = job
    if not output.exists():
        subprocess.run([ffmpeg, "-v", "error", "-nostdin", "-y", "-i", str(source),
                        "-vf", "scale=w='min(1280,iw)':h='min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
                        "-c:v", "libx264", "-preset", "veryfast", "-crf", "25", "-pix_fmt", "yuv420p",
                        "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-threads", "2", str(output)], check=True)
    if not preview.exists():
        subprocess.run([ffmpeg, "-v", "error", "-nostdin", "-y", "-i", str(output), "-t", "10",
                        "-vf", "scale=w='min(560,iw)':h='min(400,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
                        "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "27",
                        "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-threads", "2", str(preview)], check=True)
    return output.name


print(f"Prepared {len(index)} presentations and {len(ideas)} Ideas fragments. Encoding {len(jobs)} videos.", flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    for name in pool.map(encode, jobs):
        print("Video ready:", name, flush=True)
