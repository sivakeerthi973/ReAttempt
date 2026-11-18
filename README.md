# ReAttempt - One Plan. One Comeback.

ReAttempt is a responsive academic backlog recovery and study-planning application for B.Tech students. Students can register, manage backlog subjects, schedule study sessions, organize trusted study resources, view database-calculated progress, update profile information, and configure preferences.

## Technology stack

- HTML5, CSS3, and vanilla JavaScript
- Python and Flask
- Flask-SQLAlchemy and Flask-Migrate
- Flask-WTF CSRF protection
- Werkzeug password hashing
- MySQL / PyMySQL for the production database
- SQLite for automated tests and local development fallback
- pytest and Gunicorn

## Main features

- Server-side student registration and login
- HTTP-only, signed Flask session cookies
- Protected dashboard routes and account-scoped APIs
- Backlog subject CRUD with search and filters
- Study task CRUD with date, subject, time, status, and duration
- Custom study resource CRUD with URL validation
- Database-derived dashboard and progress calculations
- Profile and password management
- Light/dark appearance and notification preferences
- Responsive landing page and dashboard
- Health endpoint for hosting platforms

## Screenshots

Submission screenshots currently available:

![ReAttempt landing page](screenshots/landing-page.png)

![ReAttempt login page](screenshots/login-page.png)

Additional faculty-demonstration image names:

- `landing-page.png`
- `login-page.png`
- `dashboard-overview.png`
- `backlogs-page.png`
- `study-planner.png`
- `progress-tracker.png`

Then reference them in this section if they are not already present.

## Project structure

```text
ReAttempt/
├── app.py
├── config.py
├── extensions.py
├── requirements.txt
├── Procfile
├── runtime.txt
├── render.yaml
├── .env.example
├── .gitignore
├── index.html
├── login.html
├── dashboard.html
├── css/
├── js/
├── assets/
├── models/
├── routes/
├── services/
├── migrations/
├── tests/
├── PROJECT_REPORT.md
├── API_DOCUMENTATION.md
├── DATABASE_SCHEMA.md
├── TESTING_REPORT.md
└── ReAttempt_Project_Presentation.pptx
```

## Local setup

### 1. Requirements

- Python 3.11 or newer
- MySQL Community Server and optionally MySQL Workbench
- VS Code

### 2. Create environment

```powershell
cd "C:\ReAttempt - one"
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

### 3. Configure MySQL

```sql
CREATE DATABASE reattempt_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

Create a dedicated MySQL account and grant it access to `reattempt_db`. Copy `.env.example` to `.env` and configure:

```dotenv
SECRET_KEY=replace_with_a_unique_random_secret
DATABASE_URL=mysql+pymysql://reattempt_user:password@127.0.0.1:3306/reattempt_db?charset=utf8mb4
FLASK_ENV=development
COOKIE_SECURE=false
TRUST_PROXY=false
SESSION_HOURS=2
FLASK_DEBUG=false
```

Generate a secret:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

URL-encode special characters in MySQL passwords. Never commit `.env`.

### 4. Apply migrations

```powershell
flask --app app db upgrade
```

For model changes:

```powershell
flask --app app db migrate -m "Describe the change"
flask --app app db upgrade
```

### 5. Run locally

```powershell
flask --app app run
```

Open `http://127.0.0.1:5000/`. Run Flask rather than Live Server because Live Server cannot execute the backend APIs.

If MySQL is unavailable, the application uses SQLite only as a local development fallback. SQLite is also used by the automated test suite.

## Production deployment

Set these variables on the hosting platform:

- `SECRET_KEY`: strong random value
- `DATABASE_URL`: MySQL connection URL
- `FLASK_ENV=production`
- `COOKIE_SECURE=true`
- `TRUST_PROXY=true`
- `SESSION_HOURS=2`
- `FLASK_DEBUG=false`

The platform start command is:

```text
gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120
```

Before starting, run `flask --app app db upgrade`. Deploy behind HTTPS. The `render.yaml` file is a deployment template; it must still be connected to a real MySQL database and secrets configured outside source control.

Health endpoint:

```text
GET /api/health
```

No hosting account, domain, database password, or deployment was assumed or configured. Deployment success is not claimed until the hosted application is independently verified.

## Testing

```powershell
python -m pytest -q
python -m compileall -q app.py config.py extensions.py models routes services tests
flask --app app db check
```

See [TESTING_REPORT.md](<TESTING_REPORT.md>) for the actual test scope and verified results.

## API overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `/api/backlogs` and `/api/backlogs/<id>`
- `/api/tasks`, `/api/tasks/<id>`, and `/api/tasks/<id>/complete`
- `/api/materials` and `/api/materials/<id>`
- `GET/PUT /api/profile`
- `POST /api/profile/password`
- `GET/PUT /api/preferences`
- `DELETE /api/account/data`
- `GET /api/progress`
- `GET /api/health`

All state-changing requests require CSRF protection. See [API_DOCUMENTATION.md](<API_DOCUMENTATION.md>) for endpoints and payload examples.

## Security and submission notes

- Passwords are hashed using Werkzeug scrypt; password hashes are not returned to JavaScript.
- Session authorization is server-side. Browser LocalStorage is not used for account data or authentication.
- Every backlog, task, material, profile, preference, and progress operation is scoped to the logged-in user.
- `.env`, virtual environments, SQLite databases, caches, and screenshot files are excluded from Git.
- Password recovery and email verification are UI limitations, not working email services.
- Live MySQL connectivity, hosted deployment, and MySQL persistence could not be verified in the environment where they were unavailable.

## GitHub preparation

Git, if GitHub is used, should not be pushed automatically. The initial repository can be prepared with:

```powershell
git init
git add .
git status
git diff --stat
git commit -m "Complete ReAttempt Flask full-stack application"
```

Do not push or create a remote until repository details and push approval are provided.
