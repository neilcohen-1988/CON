"""Classify source borders for the black Ideas presentation, without editing media."""
from collections import Counter
import json
from pathlib import Path
from PIL import Image


def classify_matte(media, public):
    path = public / (media.get("thumb") or media.get("poster") or media["src"]).lstrip("/")
    with Image.open(path) as source:
        image = source.convert("RGB")
        w, h = image.size
        edges = (
            list(image.crop((0, 0, w, 2)).getdata())
            + list(image.crop((0, h - 2, w, h)).getdata())
            + list(image.crop((0, 0, 2, h)).getdata())
            + list(image.crop((w - 2, 0, w, h)).getdata())
        )
        color, count = Counter(edges).most_common(1)[0]
        if count / len(edges) >= .5 and max(color) <= 23 and max(color) - min(color) <= 2:
            return "key" if max(color) else "black"
        if sum(max(pixel) <= 23 for pixel in edges) / len(edges) >= .8:
            return "key"
        # Photographs retain their complete content inside a black matte.
        return "frame"


if __name__ == "__main__":
    public = Path(__file__).resolve().parents[1] / "public"
    path = public / "data/ideas.json"
    ideas = json.loads(path.read_text())
    for fragment in ideas:
        fragment["matte"] = classify_matte(fragment["media"], public)
    path.write_text(json.dumps(ideas, ensure_ascii=False))
    print(dict(Counter(fragment["matte"] for fragment in ideas)))
