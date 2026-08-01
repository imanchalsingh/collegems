"""
Genetic Algorithm timetable solver.

Hard constraints:
- No teacher double-booking
- No room double-booking
- Room capacity >= expected students
- Teacher unavailable slots respected

Soft constraints:
- Balanced daily teaching load
- Prefer spreading a course across the week
"""

from __future__ import annotations

import random
import time
from collections import defaultdict
from copy import deepcopy
from dataclasses import dataclass
from typing import Any


DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]


@dataclass
class Gene:
    session_id: str
    course_id: str
    teacher_id: str
    room_id: str
    slot_id: str
    section_id: str | None = None
    students: int = 0


def _day_of(slot: dict[str, Any]) -> str:
    return str(slot.get("day") or slot.get("dayOfWeek") or "Monday")


def _index_by_id(items: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {str(i["id"]): i for i in items}


def expand_sessions(courses: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Each course needs `sessions_per_week` (default credits or 3) class meetings."""
    sessions = []
    for course in courses:
        cid = str(course["id"])
        n = int(course.get("sessions_per_week") or course.get("credits") or 3)
        for i in range(max(1, n)):
            sessions.append(
                {
                    "session_id": f"{cid}#{i}",
                    "course_id": cid,
                    "teacher_id": str(course["teacher_id"]),
                    "section_id": course.get("section_id"),
                    "students": int(course.get("students") or course.get("enrolled") or 30),
                    "course_name": course.get("name") or cid,
                    "teacher_name": course.get("teacher_name") or course["teacher_id"],
                }
            )
    return sessions


def random_individual(
    sessions: list[dict[str, Any]],
    rooms: list[dict[str, Any]],
    slots: list[dict[str, Any]],
) -> list[Gene]:
    genes: list[Gene] = []
    for s in sessions:
        suitable = [
            r
            for r in rooms
            if int(r.get("capacity") or 999) >= int(s.get("students") or 0)
        ] or rooms
        room = random.choice(suitable)
        slot = random.choice(slots)
        genes.append(
            Gene(
                session_id=s["session_id"],
                course_id=s["course_id"],
                teacher_id=s["teacher_id"],
                room_id=str(room["id"]),
                slot_id=str(slot["id"]),
                section_id=s.get("section_id"),
                students=int(s.get("students") or 0),
            )
        )
    return genes


def evaluate_fitness(
    individual: list[Gene],
    rooms_by_id: dict[str, dict[str, Any]],
    slots_by_id: dict[str, dict[str, Any]],
    teacher_unavailable: dict[str, set[str]],
) -> tuple[float, dict[str, int]]:
    """Higher is better. Hard conflicts heavily penalized."""
    hard = 0
    soft = 0

    teacher_slots: dict[tuple[str, str], int] = defaultdict(int)
    room_slots: dict[tuple[str, str], int] = defaultdict(int)
    section_slots: dict[tuple[str, str], int] = defaultdict(int)
    course_days: dict[str, set[str]] = defaultdict(set)
    teacher_day_load: dict[tuple[str, str], int] = defaultdict(int)

    for gene in individual:
        slot = slots_by_id.get(gene.slot_id)
        room = rooms_by_id.get(gene.room_id)
        if not slot or not room:
            hard += 5
            continue

        day = _day_of(slot)
        teacher_slots[(gene.teacher_id, gene.slot_id)] += 1
        room_slots[(gene.room_id, gene.slot_id)] += 1
        if gene.section_id:
            section_slots[(str(gene.section_id), gene.slot_id)] += 1
        course_days[gene.course_id].add(day)
        teacher_day_load[(gene.teacher_id, day)] += 1

        if int(room.get("capacity") or 0) < gene.students:
            hard += 1

        unavailable = teacher_unavailable.get(gene.teacher_id, set())
        if gene.slot_id in unavailable:
            hard += 1

    for count in teacher_slots.values():
        if count > 1:
            hard += count - 1
    for count in room_slots.values():
        if count > 1:
            hard += count - 1
    for count in section_slots.values():
        if count > 1:
            hard += count - 1

    # Soft: prefer courses spread across days
    for days in course_days.values():
        if len(days) == 1:
            soft += 1

    # Soft: penalize overloaded teaching days (>3)
    for load in teacher_day_load.values():
        if load > 3:
            soft += load - 3

    # Soft: balance hours across week for each teacher
    by_teacher: dict[str, list[int]] = defaultdict(list)
    for (teacher, _day), load in teacher_day_load.items():
        by_teacher[teacher].append(load)
    for loads in by_teacher.values():
        if not loads:
            continue
        avg = sum(loads) / len(loads)
        variance = sum((x - avg) ** 2 for x in loads) / len(loads)
        soft += variance

    fitness = 1000.0 - (hard * 50.0) - (soft * 2.0)
    return fitness, {"hard": hard, "soft": int(soft)}


def crossover(a: list[Gene], b: list[Gene]) -> tuple[list[Gene], list[Gene]]:
    if len(a) < 2:
        return deepcopy(a), deepcopy(b)
    point = random.randint(1, len(a) - 1)
    child1 = deepcopy(a[:point] + b[point:])
    child2 = deepcopy(b[:point] + a[point:])
    return child1, child2


def mutate(
    individual: list[Gene],
    rooms: list[dict[str, Any]],
    slots: list[dict[str, Any]],
    mutation_rate: float = 0.15,
) -> list[Gene]:
    for i, gene in enumerate(individual):
        if random.random() > mutation_rate:
            continue
        choice = random.random()
        if choice < 0.5 and rooms:
            suitable = [
                r
                for r in rooms
                if int(r.get("capacity") or 999) >= gene.students
            ] or rooms
            gene.room_id = str(random.choice(suitable)["id"])
        else:
            gene.slot_id = str(random.choice(slots)["id"])
        individual[i] = gene
    return individual


def genes_to_assignments(
    individual: list[Gene],
    courses_by_id: dict[str, dict[str, Any]],
    rooms_by_id: dict[str, dict[str, Any]],
    slots_by_id: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    out = []
    for gene in individual:
        course = courses_by_id.get(gene.course_id, {})
        room = rooms_by_id.get(gene.room_id, {})
        slot = slots_by_id.get(gene.slot_id, {})
        out.append(
            {
                "sessionId": gene.session_id,
                "courseId": gene.course_id,
                "courseName": course.get("name") or gene.course_id,
                "teacherId": gene.teacher_id,
                "teacherName": course.get("teacher_name") or gene.teacher_id,
                "roomId": gene.room_id,
                "roomName": room.get("name") or gene.room_id,
                "roomCapacity": room.get("capacity"),
                "slotId": gene.slot_id,
                "day": _day_of(slot),
                "startTime": slot.get("startTime") or slot.get("start"),
                "endTime": slot.get("endTime") or slot.get("end"),
                "sectionId": gene.section_id,
                "students": gene.students,
            }
        )
    # Sort for stable grid rendering
    day_order = {d: i for i, d in enumerate(DAYS)}
    out.sort(
        key=lambda a: (
            day_order.get(str(a.get("day")), 99),
            str(a.get("startTime") or ""),
            str(a.get("courseName") or ""),
        )
    )
    return out


def solve_timetable(
    *,
    courses: list[dict[str, Any]],
    rooms: list[dict[str, Any]],
    slots: list[dict[str, Any]],
    teacher_unavailable: dict[str, list[str]] | None = None,
    population_size: int = 40,
    generations: int = 60,
    crossover_rate: float = 0.8,
    mutation_rate: float = 0.15,
    elite_count: int = 2,
    seed: int | None = None,
) -> dict[str, Any]:
    if seed is not None:
        random.seed(seed)

    if not courses or not rooms or not slots:
        raise ValueError("courses, rooms, and slots are all required")

    started = time.time()
    sessions = expand_sessions(courses)
    rooms_by_id = _index_by_id(rooms)
    slots_by_id = _index_by_id(slots)
    courses_by_id = _index_by_id(courses)
    unavailable = {
        str(k): set(str(x) for x in v)
        for k, v in (teacher_unavailable or {}).items()
    }

    population = [
        random_individual(sessions, rooms, slots) for _ in range(population_size)
    ]

    best: list[Gene] | None = None
    best_fitness = float("-inf")
    best_breakdown = {"hard": 0, "soft": 0}
    history: list[float] = []

    for _gen in range(generations):
        scored = []
        for ind in population:
            fitness, breakdown = evaluate_fitness(
                ind, rooms_by_id, slots_by_id, unavailable
            )
            scored.append((fitness, ind, breakdown))
            if fitness > best_fitness:
                best_fitness = fitness
                best = deepcopy(ind)
                best_breakdown = breakdown

        scored.sort(key=lambda x: x[0], reverse=True)
        history.append(scored[0][0])

        next_pop: list[list[Gene]] = [
            deepcopy(scored[i][1]) for i in range(min(elite_count, len(scored)))
        ]

        while len(next_pop) < population_size:
            # Tournament selection
            contenders = random.sample(scored, k=min(3, len(scored)))
            parent_a = max(contenders, key=lambda x: x[0])[1]
            contenders = random.sample(scored, k=min(3, len(scored)))
            parent_b = max(contenders, key=lambda x: x[0])[1]

            if random.random() < crossover_rate:
                c1, c2 = crossover(parent_a, parent_b)
            else:
                c1, c2 = deepcopy(parent_a), deepcopy(parent_b)

            next_pop.append(mutate(c1, rooms, slots, mutation_rate))
            if len(next_pop) < population_size:
                next_pop.append(mutate(c2, rooms, slots, mutation_rate))

        population = next_pop

    assert best is not None
    assignments = genes_to_assignments(best, courses_by_id, rooms_by_id, slots_by_id)
    elapsed_ms = int((time.time() - started) * 1000)

    return {
        "engine": "genetic-algorithm",
        "fitness": round(best_fitness, 2),
        "conflicts": best_breakdown,
        "feasible": best_breakdown["hard"] == 0,
        "generationTimeMs": elapsed_ms,
        "generations": generations,
        "populationSize": population_size,
        "fitnessHistory": history[-20:],
        "assignments": assignments,
        "grid": build_grid(assignments),
    }


def build_grid(assignments: list[dict[str, Any]]) -> dict[str, dict[str, list[dict[str, Any]]]]:
    """day -> startTime -> cells"""
    grid: dict[str, dict[str, list[dict[str, Any]]]] = {d: {} for d in DAYS}
    for a in assignments:
        day = str(a.get("day") or "Monday")
        start = str(a.get("startTime") or "")
        grid.setdefault(day, {}).setdefault(start, []).append(a)
    return grid


def demo_payload() -> dict[str, Any]:
    """Small demo dataset used by tests / UI demo mode."""
    slots = []
    times = [("09:00", "10:00"), ("10:00", "11:00"), ("11:00", "12:00"), ("14:00", "15:00")]
    sid = 1
    for day in DAYS:
        for start, end in times:
            slots.append(
                {
                    "id": f"slot-{sid}",
                    "day": day,
                    "dayOfWeek": day,
                    "startTime": start,
                    "endTime": end,
                }
            )
            sid += 1

    rooms = [
        {"id": "r1", "name": "LH-101", "capacity": 60},
        {"id": "r2", "name": "LH-102", "capacity": 40},
        {"id": "r3", "name": "Lab-A", "capacity": 30},
    ]
    courses = [
        {
            "id": "c1",
            "name": "Data Structures",
            "teacher_id": "t1",
            "teacher_name": "Dr. Rao",
            "sessions_per_week": 3,
            "students": 45,
            "section_id": "CSE-A",
        },
        {
            "id": "c2",
            "name": "DBMS",
            "teacher_id": "t2",
            "teacher_name": "Prof. Mehta",
            "sessions_per_week": 2,
            "students": 40,
            "section_id": "CSE-A",
        },
        {
            "id": "c3",
            "name": "Operating Systems",
            "teacher_id": "t1",
            "teacher_name": "Dr. Rao",
            "sessions_per_week": 2,
            "students": 35,
            "section_id": "CSE-B",
        },
        {
            "id": "c4",
            "name": "Networks Lab",
            "teacher_id": "t3",
            "teacher_name": "Ms. Iyer",
            "sessions_per_week": 2,
            "students": 28,
            "section_id": "CSE-A",
        },
    ]
    return {
        "courses": courses,
        "rooms": rooms,
        "slots": slots,
        "teacher_unavailable": {"t2": ["slot-1", "slot-2"]},
        "population_size": 30,
        "generations": 40,
        "seed": 42,
    }
