"""Produce a public copy of the CV with private details truly removed (not just covered).

Usage: python scripts/redact_cv.py [source.pdf] [output.pdf]
"""
import re
import sys
from pathlib import Path

import fitz  # PyMuPDF

SOURCE = Path(sys.argv[1] if len(sys.argv) > 1 else r"E:\02_Midhun_Rajeev_CV.pdf")
OUTPUT = Path(sys.argv[2] if len(sys.argv) > 2 else Path(__file__).parent.parent / "site/assets/cv/Midhun_Rajeev_CV.pdf")

# Whole lines to remove, with optional replacement text drawn in their place.
LINE_RULES = [
    (re.compile(r"Stra(ß|ss)e.*\d{5}"), "Landshut, Germany"),
    (re.compile(r"\+49[\d ]{8,}"), "midhunr2015@gmail.com"),
    (re.compile(r"^Nationality"), None),
    (re.compile(r"^Date of birth"), None),
]
FORBIDDEN = [r"\+49", r"70599", r"Schoch", r"84036", r"1996", r"Nationality", r"Date of birth"]
# The CV is set in Charter; XCharter is its open-licensed twin, so redrawn lines match.
MATCHING_FONT = Path(__file__).parent / "XCharter-Roman.otf"
# Header rows stop short of the photo on the right; personal-detail rows span the page.
HEADER_ROW_WIDTH_RATIO = 0.68


def iter_lines(page):
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            text = "".join(span["text"] for span in line["spans"]).strip()
            if text:
                yield text, fitz.Rect(line["bbox"]), line["spans"][0]


def row_rect(page, line_rect, width_ratio=1.0):
    """Extend a line's rect horizontally so every run on that row (label, value, separators) is removed."""
    return fitz.Rect(0, line_rect.y0 - 0.5, page.rect.width * width_ratio, line_rect.y1 + 0.5)


def redact_page(page):
    replacements = []
    for text, rect, span in iter_lines(page):
        for pattern, replacement in LINE_RULES:
            if not pattern.search(text):
                continue
            ratio = HEADER_ROW_WIDTH_RATIO if replacement else 1.0
            page.add_redact_annot(row_rect(page, rect, ratio), fill=(1, 1, 1))
            if replacement:
                replacements.append((span["origin"], replacement, span["size"], span["color"]))
    page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)
    font_kwargs = {"fontname": "xcharter", "fontfile": str(MATCHING_FONT)} if MATCHING_FONT.exists() else {"fontname": "tiro"}
    for (x, y), text, size, color in replacements:
        rgb = tuple(((color >> shift) & 0xFF) / 255 for shift in (16, 8, 0))
        page.insert_text((x, y), text, fontsize=size, color=rgb, **font_kwargs)


def verify(path):
    text = "\n".join(page.get_text() for page in fitz.open(path))
    leaks = [pattern for pattern in FORBIDDEN if re.search(pattern, text)]
    if leaks:
        raise SystemExit(f"Redaction failed, still present: {leaks}")


def main():
    if not SOURCE.exists():
        raise SystemExit(f"Source CV not found: {SOURCE}")
    doc = fitz.open(SOURCE)
    for page in doc:
        redact_page(page)
    doc.set_metadata({})
    doc.del_xml_metadata()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc.save(OUTPUT, garbage=4, deflate=True, clean=True)
    verify(OUTPUT)
    print(f"Wrote redacted CV to {OUTPUT}")


if __name__ == "__main__":
    main()
