"""
Resume PDF parser for CollegeMS placement ATS (#707).

Uses pdfplumber for text extraction and rule-based + optional spaCy/NLTK
pipelines for skills, education, projects, and experience.
"""

from __future__ import annotations

import re
from typing import Any

# Optional heavy deps — degrade gracefully if not installed.
try:
    import pdfplumber
except ImportError:  # pragma: no cover
    pdfplumber = None

try:
    import spacy

    try:
        _nlp = spacy.load("en_core_web_sm")
    except OSError:  # model not downloaded
        _nlp = None
except ImportError:  # pragma: no cover
    spacy = None
    _nlp = None

try:
    import nltk
    from nltk.tokenize import word_tokenize
except ImportError:  # pragma: no cover
    nltk = None
    word_tokenize = None


COMMON_SKILLS = {
    "python",
    "java",
    "javascript",
    "typescript",
    "react",
    "node",
    "nodejs",
    "express",
    "mongodb",
    "sql",
    "mysql",
    "postgresql",
    "aws",
    "azure",
    "docker",
    "kubernetes",
    "git",
    "linux",
    "c++",
    "c#",
    "html",
    "css",
    "tailwind",
    "redux",
    "django",
    "flask",
    "fastapi",
    "spring",
    "machine learning",
    "deep learning",
    "nlp",
    "pandas",
    "numpy",
    "scikit-learn",
    "tensorflow",
    "pytorch",
    "figma",
    "excel",
    "power bi",
    "tableau",
    "rest",
    "graphql",
    "microservices",
    "devops",
    "ci/cd",
    "communication",
    "leadership",
    "teamwork",
}

DEGREE_PATTERN = re.compile(
    r"(?P<degree>B\.?Tech|B\.?E\.?|M\.?Tech|M\.?Sc|B\.?Sc|MBA|MCA|Ph\.?D|"
    r"Bachelor|Master|Diploma)[^\n,]{0,80}",
    re.IGNORECASE,
)

EXPERIENCE_LINE = re.compile(
    r"(?P<title>[A-Za-z][A-Za-z0-9 /&\-]{2,40})\s+(?:at|@|-)\s+"
    r"(?P<org>[A-Za-z0-9 .,&\-]{2,60})",
    re.IGNORECASE,
)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract plain text from a PDF byte stream via pdfplumber."""
    if pdfplumber is None:
        raise RuntimeError("pdfplumber is not installed")

    import io

    chunks: list[str] = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            if text.strip():
                chunks.append(text)
    return "\n".join(chunks).strip()


def extract_text_from_path(path: str) -> str:
    if pdfplumber is None:
        raise RuntimeError("pdfplumber is not installed")
    chunks: list[str] = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            if text.strip():
                chunks.append(text)
    return "\n".join(chunks).strip()


def _tokenize(text: str) -> list[str]:
    lower = text.lower()
    if word_tokenize is not None:
        try:
            return [t.lower() for t in word_tokenize(lower)]
        except LookupError:
            # Auto-download punkt once if missing
            try:
                nltk.download("punkt", quiet=True)
                nltk.download("punkt_tab", quiet=True)
                return [t.lower() for t in word_tokenize(lower)]
            except Exception:
                pass
    return re.findall(r"[a-zA-Z+#.]{2,}", lower)


def extract_skills(text: str) -> list[str]:
    lower = text.lower()
    found: list[str] = []

    # Multi-word skills first
    for skill in sorted(COMMON_SKILLS, key=len, reverse=True):
        if skill in lower and skill not in found:
            found.append(skill)

    # spaCy noun chunks as soft signal
    if _nlp is not None:
        doc = _nlp(text[:8000])
        for chunk in doc.noun_chunks:
            phrase = chunk.text.lower().strip()
            if phrase in COMMON_SKILLS and phrase not in found:
                found.append(phrase)

    return found


def extract_education(text: str) -> list[dict[str, Any]]:
    education: list[dict[str, Any]] = []
    for match in DEGREE_PATTERN.finditer(text):
        snippet = match.group(0).strip()
        year_match = re.search(r"(20\d{2}|19\d{2})", snippet)
        education.append(
            {
                "degree": match.group("degree"),
                "institution": snippet,
                "year": int(year_match.group(1)) if year_match else None,
            }
        )
    # Deduplicate by institution string
    seen = set()
    unique = []
    for row in education:
        key = row["institution"].lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append(row)
    return unique[:8]


def extract_experience(text: str) -> list[dict[str, Any]]:
    experience: list[dict[str, Any]] = []
    for match in EXPERIENCE_LINE.finditer(text):
        experience.append(
            {
                "title": match.group("title").strip(),
                "org": match.group("org").strip(),
                "years": None,
            }
        )
    # Section-based fallback
    section = re.search(
        r"(?:experience|work history|employment)([\s\S]{0,1200})(?:projects|education|skills|$)",
        text,
        re.IGNORECASE,
    )
    if section and not experience:
        lines = [ln.strip("•- \t") for ln in section.group(1).splitlines() if ln.strip()]
        for ln in lines[:6]:
            experience.append({"title": ln[:80], "org": "", "years": None})
    return experience[:10]


def extract_projects(text: str) -> list[str]:
    section = re.search(
        r"(?:projects|personal projects|academic projects)([\s\S]{0,1500})(?:experience|education|skills|certifications|$)",
        text,
        re.IGNORECASE,
    )
    if not section:
        return []
    lines = [ln.strip("•- \t") for ln in section.group(1).splitlines() if len(ln.strip()) > 3]
    return lines[:10]


def parse_resume_text(text: str, student_id: str | None = None) -> dict[str, Any]:
    skills = extract_skills(text)
    return {
        "student_id": student_id,
        "skills": skills,
        "education": extract_education(text),
        "experience": extract_experience(text),
        "projects": extract_projects(text),
        "raw_text_preview": text[:500],
        "token_count": len(_tokenize(text)),
    }


def parse_resume_bytes(file_bytes: bytes, student_id: str | None = None) -> dict[str, Any]:
    text = extract_text_from_pdf(file_bytes)
    if not text:
        raise ValueError("Could not extract text from PDF (empty or image-only)")
    return parse_resume_text(text, student_id=student_id)
