from datetime import date, datetime, time, timedelta, timezone

from extensions import db
from models import Backlog, StudyMaterial, StudyTask, UserPreferences


def seed_account_data(user):
    subjects = [
        ("Mathematics II", "MATH202", "Semester 2", 2, "In progress", 65,
         ["Matrices and rank", "Eigenvalues"], ["Differential equations", "Laplace transforms"]),
        ("Data Structures", "CSE203", "Semester 3", 1, "In progress", 42,
         ["Arrays and linked lists"], ["Trees and traversals", "Graph algorithms"]),
        ("Database Management Systems", "CSE301", "Semester 4", 2, "Completed", 100,
         ["Relational model", "SQL and normalization"], []),
        ("Operating Systems", "CSE302", "Semester 4", 1, "In progress", 25,
         ["Process states"], ["Scheduling", "Memory management"]),
        ("Computer Networks", "CSE401", "Semester 5", 1, "Not started", 0,
         [], ["Network layers", "Routing basics"]),
    ]
    backlogs = [
        Backlog(
            user=user,
            subject_name=name,
            subject_code=code,
            semester=semester,
            attempts=attempts,
            status=status,
            progress=progress,
            topics_done=done,
            topics_pending=pending,
            is_sample=True,
        )
        for name, code, semester, attempts, status, progress, done, pending in subjects
    ]
    db.session.add_all(backlogs)
    db.session.flush()

    today = date.today()
    samples = [
        ("Completed: database normalization review", 2, -1, "09:00", "10:00", "Completed"),
        ("Completed: matrix practice", 0, -2, "15:00", "16:30", "Completed"),
        ("Completed: linked-list revision", 1, -4, "10:00", "11:00", "Completed"),
        ("Review process scheduling", 3, 0, "10:00", "11:30", "In progress"),
        ("Practice tree traversals", 1, 1, "16:00", "17:00", "Planned"),
        ("Revise matrix operations", 0, 3, "09:00", "10:15", "Planned"),
    ]
    for title, subject_index, offset, start, end, status in samples:
        start_time = time.fromisoformat(start)
        end_time = time.fromisoformat(end)
        duration = int((datetime.combine(today, end_time) - datetime.combine(today, start_time)).total_seconds() // 60)
        db.session.add(
            StudyTask(
                user=user,
                backlog=backlogs[subject_index],
                title=title,
                study_date=today + timedelta(days=offset),
                start_time=start_time,
                end_time=end_time,
                duration=duration,
                status=status,
                is_sample=True,
            )
        )

    material_samples = [
        (0, "Matrices & Eigenvalues — revision notes", "Notes", "Sample outline of matrix operations, rank, eigenvalues, and key definitions."),
        (0, "Differential Equations — important topics", "Important topics", "Sample topic checklist for your next revision session."),
        (1, "Data Structures — practice paper", "Question paper", "Sample paper card. No question paper file is attached."),
        (1, "Trees & Graphs — concept notes", "Notes", "Sample prompts for traversals, tree properties, and graph basics."),
        (2, "Database Systems — important topics", "Important topics", "Sample checklist for normalization, transactions, and SQL."),
        (2, "Database Systems — reference guide", "Reference", "Sample description only; no downloadable reference is provided."),
        (3, "Operating Systems — quick notes", "Notes", "Sample revision prompts for processes, scheduling, and memory concepts."),
        (3, "Operating Systems — previous paper", "Question paper", "Sample previous-paper resource; no file is included."),
        (4, "Computer Networks — reference topics", "Reference", "Sample guide outline for network layers and routing fundamentals."),
    ]
    for subject_index, title, material_type, description in material_samples:
        db.session.add(
            StudyMaterial(
                user=user,
                backlog=backlogs[subject_index],
                subject=backlogs[subject_index].subject_name,
                title=title,
                material_type=material_type,
                url=None,
                description=description,
                is_sample=True,
            )
        )

    db.session.add(
        UserPreferences(
            user=user,
            dark_theme=False,
            notifications_enabled=True,
            weekly_recap=True,
        )
    )
