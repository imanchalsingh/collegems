"""Unit tests for ATS matcher (no PDF required)."""

from services.ats_matcher import score_ats


def test_high_skill_overlap_scores_high():
    result = score_ats(
        requirements=["python", "react", "mongodb"],
        job_text="Full stack engineer Python React MongoDB",
        resume={
            "skills": ["python", "react", "mongodb", "docker"],
            "education": [],
            "experience": [],
            "projects": ["Campus portal with React"],
        },
    )
    assert result["ats_score"] >= 50
    assert "python" in result["matched_skills"]
    assert result["match_level"] in ("low", "medium", "high")


def test_cgpa_eligibility_filter():
    result = score_ats(
        requirements=["java"],
        resume={"skills": ["java"]},
        min_cgpa=7.5,
        student_cgpa=6.0,
        max_backlogs=0,
        student_backlogs=0,
    )
    assert result["eligible"] is False
    assert any("CGPA" in r for r in result["eligibility_reasons"])
