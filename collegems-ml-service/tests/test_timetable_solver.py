from services.timetable_solver import demo_payload, solve_timetable


def test_ga_solver_produces_assignments():
    payload = demo_payload()
    result = solve_timetable(**payload)
    assert result["engine"] == "genetic-algorithm"
    assert len(result["assignments"]) > 0
    assert "fitness" in result
    assert "grid" in result


def test_ga_solver_prefers_feasible_schedule():
    payload = demo_payload()
    payload["generations"] = 80
    payload["population_size"] = 50
    result = solve_timetable(**payload)
    # With the demo dataset, GA should usually eliminate hard conflicts
    assert result["conflicts"]["hard"] <= 2
    assert result["fitness"] > 0
