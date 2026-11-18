import pytest

from app import create_app
from extensions import db


@pytest.fixture
def app():
    application = create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "test-key-not-for-production",
            "SQLALCHEMY_DATABASE_URI": "sqlite://",
            "WTF_CSRF_ENABLED": True,
            "SESSION_COOKIE_SECURE": False,
        }
    )
    with application.app_context():
        db.create_all()
    yield application
    with application.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


def csrf_headers(client):
    result = client.get("/api/auth/csrf-token").get_json()
    return {"X-CSRFToken": result["csrfToken"]}


def account_payload(email="student@example.edu", password="StrongPass123"):
    return {
        "fullName": "Test Student",
        "email": email,
        "password": password,
        "confirmPassword": password,
        "college": "Test Engineering College",
        "course": "B.Tech",
        "department": "Computer Science",
        "year": "3rd year",
        "semester": "Semester 5",
        "remember": True,
    }


def register(client, email="student@example.edu", password="StrongPass123"):
    return client.post(
        "/api/auth/register",
        json=account_payload(email, password),
        headers=csrf_headers(client),
    )


@pytest.fixture
def signed_in_client(client):
    response = register(client)
    assert response.status_code == 201
    return client
