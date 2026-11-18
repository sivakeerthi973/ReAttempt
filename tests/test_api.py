from datetime import date, timedelta

from app import create_app
from extensions import db
from conftest import account_payload, csrf_headers, register


def mutate(client, method, url, json=None):
    return getattr(client, method)(
        url,
        json=json,
        headers=csrf_headers(client),
    )


def test_registration_login_protection_and_logout(client):
    dashboard = client.get("/dashboard.html")
    assert dashboard.status_code == 302
    assert dashboard.headers["Location"].endswith("/login.html")

    response = register(client)
    assert response.status_code == 201
    assert "password_hash" not in response.get_json()["user"]
    assert client.get("/api/auth/me").status_code == 200
    assert len(client.get("/api/backlogs").get_json()["items"]) == 5

    duplicate = register(client)
    assert duplicate.status_code == 409

    assert mutate(client, "post", "/api/auth/logout", json={}).status_code == 200
    bad_login = mutate(
        client,
        "post",
        "/api/auth/login",
        json={"email": "student@example.edu", "password": "incorrect"},
    )
    assert bad_login.status_code == 401
    login = mutate(
        client,
        "post",
        "/api/auth/login",
        json={"email": "student@example.edu", "password": "StrongPass123", "remember": True},
    )
    assert login.status_code == 200
    assert client.get("/dashboard.html").status_code == 200
    assert mutate(client, "post", "/api/auth/logout", json={}).status_code == 200
    assert client.get("/api/backlogs").status_code == 401


def test_csrf_required_for_mutations(client):
    response = client.post("/api/auth/register", json=account_payload())
    assert response.status_code == 400
    assert response.get_json()["error"] == "csrf_failed"


def test_backlog_task_material_crud_and_progress(signed_in_client):
    client = signed_in_client
    backlog_response = mutate(
        client,
        "post",
        "/api/backlogs",
        {
            "name": "Algorithms",
            "code": "CSE499",
            "semester": "Semester 5",
            "attempts": 2,
            "status": "In progress",
            "progress": 40,
            "examDate": "",
            "topicsDone": ["Sorting"],
            "topicsPending": ["Graphs"],
        },
    )
    assert backlog_response.status_code == 201
    backlog = backlog_response.get_json()["item"]
    assert backlog["progress"] == 40

    updated = mutate(
        client,
        "put",
        f"/api/backlogs/{backlog['id']}",
        {
            **backlog,
            "progress": 100,
            "status": "Completed",
            "topicsDone": ["Sorting", "Graphs"],
            "topicsPending": [],
        },
    )
    assert updated.get_json()["item"]["status"] == "Completed"
    assert client.get("/api/backlogs?search=algorithms&status=Completed").get_json()["items"][0]["id"] == backlog["id"]

    study_date = date.today().isoformat()
    task_response = mutate(
        client,
        "post",
        "/api/tasks",
        {
            "title": "Review graph algorithms",
            "subjectId": backlog["id"],
            "date": study_date,
            "start": "09:00",
            "end": "10:30",
            "status": "Completed",
        },
    )
    assert task_response.status_code == 201
    task = task_response.get_json()["item"]
    assert task["durationMinutes"] == 90
    assert mutate(client, "patch", f"/api/tasks/{task['id']}/complete", {}).status_code == 200

    material_response = mutate(
        client,
        "post",
        "/api/materials",
        {
            "title": "Graph reference",
            "subjectId": backlog["id"],
            "type": "Reference",
            "url": "https://example.edu/graphs",
            "description": "A test reference link.",
        },
    )
    assert material_response.status_code == 201
    material = material_response.get_json()["item"]
    assert material["sample"] is False
    assert mutate(client, "put", f"/api/materials/{material['id']}", {
        "title": "Updated graph reference",
        "subjectId": backlog["id"],
        "type": "Reference",
        "url": "https://example.edu/graphs-updated",
        "description": "",
    }).status_code == 200

    progress = client.get("/api/progress").get_json()
    assert progress["stats"]["totalSubjects"] == 6
    assert progress["stats"]["completedSubjects"] == 2
    assert progress["stats"]["completedTasks"] == 4
    assert progress["stats"]["totalStudyHours"] >= 2.5
    assert len(progress["weekly"]) == 7

    assert mutate(client, "delete", f"/api/materials/{material['id']}").status_code == 200
    assert mutate(client, "delete", f"/api/tasks/{task['id']}").status_code == 200
    assert mutate(client, "delete", f"/api/backlogs/{backlog['id']}").status_code == 200


def test_user_ownership_and_invalid_inputs(client):
    first = register(client, "first@example.edu")
    assert first.status_code == 201
    first_subject = client.get("/api/backlogs").get_json()["items"][0]
    mutate(client, "post", "/api/auth/logout", {})
    assert register(client, "second@example.edu").status_code == 201
    assert client.get("/api/backlogs").get_json()["items"][0]["id"] != first_subject["id"]

    assert client.get(f"/api/backlogs/{first_subject['id']}").status_code == 404
    invalid_subject = mutate(
        client,
        "post",
        "/api/backlogs",
        {
            "name": "Invalid",
            "code": "BAD001",
            "semester": "Semester 9",
            "attempts": 0,
            "status": "Unknown",
            "progress": 150,
        },
    )
    assert invalid_subject.status_code == 400

    invalid_url = mutate(
        client,
        "post",
        "/api/materials",
        {
            "title": "Unsafe link",
            "subjectId": client.get("/api/backlogs").get_json()["items"][0]["id"],
            "type": "Notes",
            "url": "javascript:alert(1)",
        },
    )
    assert invalid_url.status_code == 400


def test_profile_preferences_password_and_csrf(signed_in_client):
    client = signed_in_client
    profile = mutate(client, "put", "/api/profile", {
        "fullName": "Updated Student",
        "email": "updated@example.edu",
        "college": "Updated College",
        "course": "B.Tech",
        "department": "Information Technology",
        "year": "4th year",
        "semester": "Semester 7",
    })
    assert profile.status_code == 200
    assert profile.get_json()["profile"]["fullName"] == "Updated Student"

    preferences = mutate(client, "put", "/api/preferences", {
        "theme": "dark",
        "studyReminders": False,
        "weeklyRecap": True,
    })
    assert preferences.get_json()["preferences"]["theme"] == "dark"
    assert preferences.get_json()["preferences"]["studyReminders"] is False

    changed = mutate(client, "post", "/api/profile/password", {
        "currentPassword": "StrongPass123",
        "newPassword": "NewStrongPass456",
        "confirmPassword": "NewStrongPass456",
    })
    assert changed.status_code == 200
    mutate(client, "post", "/api/auth/logout", {})
    assert mutate(client, "post", "/api/auth/login", {
        "email": "updated@example.edu",
        "password": "NewStrongPass456",
    }).status_code == 200


def test_task_filter_and_date_validation(signed_in_client):
    client = signed_in_client
    assert client.get(f"/api/tasks?date={(date.today() - timedelta(days=1)).isoformat()}").status_code == 200
    assert client.get("/api/tasks?date=not-a-date").status_code == 400


def test_database_records_survive_new_app_instance(tmp_path):
    database_uri = f"sqlite:///{(tmp_path / 'reattempt-persistence.db').as_posix()}"
    config = {
        "TESTING": True,
        "SECRET_KEY": "test-key-not-for-production",
        "SQLALCHEMY_DATABASE_URI": database_uri,
        "WTF_CSRF_ENABLED": True,
        "SESSION_COOKIE_SECURE": False,
    }
    first_app = create_app(config)
    with first_app.app_context():
        db.create_all()
    first_client = first_app.test_client()
    assert register(first_client, "persistent@example.edu").status_code == 201
    with first_app.app_context():
        db.session.remove()
        db.engine.dispose()

    restarted_app = create_app(config)
    restarted_client = restarted_app.test_client()
    response = restarted_client.post(
        "/api/auth/login",
        json={"email": "persistent@example.edu", "password": "StrongPass123"},
        headers=csrf_headers(restarted_client),
    )
    assert response.status_code == 200
    assert len(restarted_client.get("/api/backlogs").get_json()["items"]) == 5
    with restarted_app.app_context():
        db.session.remove()
        db.drop_all()


def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.get_json() == {"status": "ok", "database": "connected"}
