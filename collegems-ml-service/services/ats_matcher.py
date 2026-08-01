"""
ATS matchmaking: skill-vector cosine similarity between job requirements
and parsed resumes (#707).
"""

from __future__ import annotations

from typing import Any

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from .resume_parser import COMMON_SKILLS


def _normalize_skills(skills: list[str] | None) -> list[str]:
    if not skills:
        return []
    return sorted({s.strip().lower() for s in skills if s and str(s).strip()})


def _job_corpus(requirements: list[str] | None, job_text: str | None) -> str:
    parts = []
    if requirements:
        parts.extend(requirements)
    if job_text:
        parts.append(job_text)
    return " ".join(parts).lower()


def _resume_corpus(resume: dict[str, Any] | None, raw_text: str | None) -> str:
    parts: list[str] = []
    if resume:
        parts.extend(resume.get("skills") or [])
        for edu in resume.get("education") or []:
            if isinstance(edu, dict):
                parts.append(str(edu.get("degree") or ""))
                parts.append(str(edu.get("institution") or ""))
            else:
                parts.append(str(edu))
        for exp in resume.get("experience") or []:
            if isinstance(exp, dict):
                parts.append(str(exp.get("title") or ""))
                parts.append(str(exp.get("org") or ""))
            else:
                parts.append(str(exp))
        parts.extend(resume.get("projects") or [])
    if raw_text:
        parts.append(raw_text)
    return " ".join(parts).lower()


def extract_required_skills(requirements: list[str] | None, job_text: str | None) -> list[str]:
    blob = _job_corpus(requirements, job_text)
    found = []
    for skill in sorted(COMMON_SKILLS, key=len, reverse=True):
        if skill in blob and skill not in found:
            found.append(skill)
    # Also treat short requirement lines as skills
    if requirements:
        for req in requirements:
            token = req.strip().lower()
            if 1 < len(token) < 40 and token not in found:
                found.append(token)
    return found


def score_ats(
    *,
    requirements: list[str] | None = None,
    job_text: str | None = None,
    resume: dict[str, Any] | None = None,
    raw_text: str | None = None,
    min_cgpa: float | None = None,
    max_backlogs: int | None = None,
    student_cgpa: float | None = None,
    student_backlogs: int | None = None,
) -> dict[str, Any]:
    job_doc = _job_corpus(requirements, job_text) or "general"
    resume_doc = _resume_corpus(resume, raw_text) or "empty"

    vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=1, stop_words="english")
    try:
        matrix = vectorizer.fit_transform([job_doc, resume_doc])
        cosine = float(cosine_similarity(matrix[0:1], matrix[1:2])[0][0])
    except ValueError:
        cosine = 0.0

    required = extract_required_skills(requirements, job_text)
    resume_skills = _normalize_skills((resume or {}).get("skills"))
    matched = [s for s in required if s in resume_skills or s in resume_doc]
    missing = [s for s in required if s not in matched]

    skill_ratio = (len(matched) / len(required)) if required else cosine
    ats_score = round(min(100.0, max(0.0, (0.55 * cosine + 0.45 * skill_ratio) * 100)), 2)

    eligibility_ok = True
    eligibility_reasons: list[str] = []
    if min_cgpa is not None and student_cgpa is not None and student_cgpa < min_cgpa:
        eligibility_ok = False
        eligibility_reasons.append(f"CGPA {student_cgpa} < required {min_cgpa}")
    if max_backlogs is not None and student_backlogs is not None and student_backlogs > max_backlogs:
        eligibility_ok = False
        eligibility_reasons.append(
            f"Backlogs {student_backlogs} > allowed {max_backlogs}"
        )

    if ats_score >= 75:
        match_level = "high"
    elif ats_score >= 45:
        match_level = "medium"
    else:
        match_level = "low"

    return {
        "ats_score": ats_score,
        "match_level": match_level,
        "matched_skills": matched,
        "missing_skills": missing,
        "cosine_similarity": round(cosine, 4),
        "eligible": eligibility_ok,
        "eligibility_reasons": eligibility_reasons,
    }
