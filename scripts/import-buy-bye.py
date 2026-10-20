"""Import the portfolio's complete Buy Bye gallery into CON.

Usage: python3 scripts/import-buy-bye.py /path/to/Personal-Website
The source files remain untouched. Only this presentation and its translations
are updated; the curated Ideas selection is not regenerated.
"""
import json
from pathlib import Path
import shutil
import sys

portfolio = Path(sys.argv[1])
public = Path(__file__).resolve().parents[1] / "public"
slug = "jdw-buy-bye"
source = json.loads((portfolio / f"projects/new/{slug}/project.json").read_text())
media = json.loads((portfolio / f"src/data/{slug}-media.json").read_text())
destination = public / "media/projects" / slug
destination.mkdir(parents=True, exist_ok=True)


def write(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def paragraph(text):
    return {"type": "p", "text": text}


assets = {}
for key, record in media.items():
    file = portfolio / "public" / record["src"].lstrip("/")
    output = destination / file.name
    shutil.copy2(file, output)
    assets[key] = {
        "type": "image", "src": "/" + str(output.relative_to(public)),
        "width": record["width"], "height": record["height"], "alt": record["alt"]
    }
cover = assets["photo-09"]
small = portfolio / "public" / media["photo-09"]["small"].lstrip("/")
shutil.copy2(small, destination / small.name)
cover["thumb"] = "/" + str((destination / small.name).relative_to(public))

intro = [
    ("Buy Bye was CON’s pop-up shop and installation for Jerusalem Design Week 2024, at Hansen House. A fictional Middle Eastern conglomerate set up shop in preparation for an impending flood or migration, offering a collection that moved between survival gear and luxury goods.",
     "שלם שלום הייתה חנות הפופ־אפ והמיצב של קון בשבוע העיצוב ירושלים 2024, בבית הנסן. קונגלומרט מזרח־תיכוני שלא קיים פתח חנות לקראת מבול או הגירה קרבים, עם אוסף שנע בין ציוד הישרדות למוצרי מותרות."),
    ("Cleaning supplies, clothing, printed cartons and everyday objects became vehicles for marketing, persuasion and casual propaganda. The shop brought CON’s fictional corporate world into a physical space, where familiar products carried unfamiliar promises.",
     "חומרי ניקוי, בגדים, קרטונים מודפסים וחפצים יומיומיים הפכו לאמצעים לשיווק, שכנוע ותעמולה יומיומית. החנות העבירה את העולם התאגידי הבדיוני של קון אל מרחב פיזי, שבו מוצרים מוכרים נשאו הבטחות לא מוכרות.")
]
texts = [
    ("The objects explored the tension between consumerism and crisis: how design, marketing and desire operate in times of uncertainty. Playful and unsettling at once, they asked whether the next thing we consume is a necessity, a reassurance or a facade.",
     "החפצים בחנו את המתח בין צרכנות למשבר: כיצד עיצוב, שיווק ותשוקה פועלים בזמנים של אי־ודאות. משעשעים ומטרידים בעת ובעונה אחת, הם שאלו אם הדבר הבא שנצרוך הוא צורך, הבטחה מרגיעה או מראית עין."),
    ("Survival consumption runs through the collection. Packaging and branding turn national anxiety into things to take home, reflecting the contradictions of a culture that prepares for disaster through the language of abundance.",
     "צריכת הישרדות עוברת כחוט השני באוסף. אריזה ומיתוג הופכים חרדה לאומית לחפצים שאפשר לקחת הביתה, ומשקפים את הסתירות של תרבות המתכוננת לאסון באמצעות שפה של שפע."),
    ("Under the guise of a functioning shop, Buy Bye used design as critique. The tools of branding and marketing were turned back on the visitor, making the act of consumption part of the installation itself.",
     "במסווה של חנות מתפקדת, שלם שלום השתמשה בעיצוב כביקורת. כלי המיתוג והשיווק הופנו בחזרה אל המבקרים, והפכו את פעולת הצריכה לחלק מהמיצב עצמו.")
]

# Follow the portfolio's gallery sequence, placing the object and reception copy
# between the same groups. The cover is already shown above the project text.
groups = [
    ["photo-03", "photo-01", "photo-02", "photo-05", "entrance", "photo-04", "photo-06"],
    ["photo-07", "photo-45", "photo-12", "photo-11", "photo-08", "photo-10",
     "photo-14", "photo-15", "photo-13", "photo-16", "photo-17", "photo-18",
     "photo-19", "photo-39", "photo-40", "photo-41"],
    ["photo-42", "photo-43", "photo-44"]
]
blocks = []
for group, copy in zip(groups, texts):
    blocks.extend(assets[key] for key in group)
    blocks.append(paragraph(copy[0]))
assert {cover["src"], *(b["src"] for b in blocks if "src" in b)} == {a["src"] for a in assets.values()}
blocks.extend([
    {"type": "h3", "text": "Credits"},
    paragraph("Concept & Design — Neil Cohen / CON")
])
item = {
    "id": slug, "displayTitle": "Buy Bye", "title": "Buy Bye", "editorial": True,
    "objectType": "Installation & Pop-Up", "year": int(source["year"]),
    "collaboration": "Con × Jerusalem Design Week", "cover": cover,
    "productImages": [cover], "productDescription": {"blocks": [paragraph(en) for en, he in intro]},
    "projectContent": [{"blocks": blocks}], "additionalPageImages": []
}
write(public / "data/projects" / f"{slug}.json", item)
index_path = public / "data/projects.json"
index = [p for p in json.loads(index_path.read_text()) if p["id"] != slug]
index.append({key: item[key] for key in ("id", "displayTitle", "title", "editorial", "objectType", "year", "collaboration", "cover")})
write(index_path, index)
locales_path = public / "data/locales.json"
locales = json.loads(locales_path.read_text())
locales["projects"][slug] = {
    "en": {"displayTitle": "Buy Bye"},
    "he": {"displayTitle": "שלם שלום", "objectType": "מיצב וחנות פופ־אפ"}
}
for en, he in intro + texts + [
    ("Credits", "קרדיטים"),
    ("Concept & Design — Neil Cohen / CON", "הרעיון והעיצוב — ניל כהן / קון")
]:
    locales["blocks"]["he"][en] = {"text": he}
write(locales_path, locales)
print(f"Imported Buy Bye: {len(assets)} images, bilingual text, {item['year']}.")
