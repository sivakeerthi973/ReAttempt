# ReAttempt - One Plan. One Comeback.

## Project report

### 1. Introduction

ReAttempt is a full-stack academic backlog recovery and study-planning application developed for B.Tech students. It combines backlog subject organization, realistic task planning, resource management, profile settings, and progress monitoring in a responsive web interface.

### 2. Problem statement

Students handling academic backlogs often need to coordinate subject names, semester information, exam dates, attempts, study time, resources, and preparation status across disconnected tools or handwritten records. This makes it difficult to understand pending work and maintain a consistent study routine. ReAttempt provides one account-based workspace for these activities.

### 3. Objectives

- Reduce confusion about pending backlog subjects
- Organize subject, exam, and attempt information
- Create manageable study sessions
- Track completed work and preparation percentage
- Display subject-wise and weekly progress
- Save custom study resources and personal preferences
- Restrict student records to the owner
- Preserve the existing professional ReAttempt brand and responsive design

### 4. Existing system

The previous frontend-only implementation stored demonstration accounts and planner data in browser LocalStorage. It had useful UI flows but did not provide shared server-side authentication or database ownership. Browser data could be cleared, copied, or altered locally and was not suitable for a centralized student database.

### 5. Proposed system

ReAttempt now uses a Flask backend, SQLAlchemy models, Flask-Migrate, CSRF-protected JSON APIs, signed server-side sessions, and MySQL. The existing HTML, CSS, JavaScript, official logo, dashboard illustration, and page structure are preserved. SQLite is limited to local fallback and automated testing.

### 6. Technologies used

- Frontend: HTML5, CSS3, vanilla JavaScript
- Backend: Python, Flask
- Data access: Flask-SQLAlchemy
- Schema migration: Flask-Migrate / Alembic
- Security: Flask-WTF, Werkzeug password hashing, HTTP-only cookies
- Database: MySQL with SQLite test fallback
- API communication: same-origin JavaScript Fetch
- Testing: pytest
- Production server: Gunicorn

### 7. System architecture

The browser serves static and page routes from Flask. JavaScript obtains a CSRF token and calls account-scoped `/api/*` endpoints. Flask routes validate JSON, obtain the student ID from the signed session, and query SQLAlchemy models. SQLAlchemy executes operations against MySQL or the configured fallback database.

```text
Browser / HTML / CSS / JavaScript
              |
         Fetch API
              |
 Flask routes and validation
              |
 SQLAlchemy and Flask-Migrate
              |
       MySQL database
```

### 8. Database design

Main tables:

- `users`
- `backlogs`
- `study_tasks`
- `study_materials`
- `user_preferences`

Users own backlogs, tasks, and preferences. Backlogs provide the subject relationship for tasks and optional material records. Unique constraints prevent duplicate subject codes within a user's account and duplicate email addresses globally.

See [DATABASE_SCHEMA.md](<DATABASE_SCHEMA.md>) for fields and relationships.

### 9. Module descriptions

#### Authentication

Supports registration, login, logout, session protection, password hashing, duplicate-email checks, password confirmation, and current-password verification.

#### My Backlogs

Supports subject name, code, semester, attempts, status, progress, exam date, completed topics, pending topics, filtering, searching, editing, and deleting.

#### Study Planner

Supports dated study tasks with subject, start time, end time, computed duration, and status. It provides today/upcoming/completed views and date/subject/status filters.

#### Study Materials

Distinguishes sample resources from custom resources. Custom resources require valid HTTP/HTTPS URLs. No fake download links are created.

#### Progress Tracker

Calculates subject totals, completed/pending subjects, average preparation, completed tasks, total and weekly study time, subject-wise progress, and weekly chart data from database rows.

#### Profile

Allows editing name, email, college, course, department, year, and semester.

#### Settings

Supports theme and notification preferences, password changes, logout, and clearing account-owned study records.

### 10. Implementation

The implementation preserves the original landing page and dashboard markup. Flask explicitly serves existing HTML/CSS/JavaScript/assets to retain paths. API data is loaded at dashboard startup and after mutations. JSON validation prevents malformed or unsupported values. Delete operations require browser confirmation and enforce server-side ownership.

CSRF protection is used for state-changing requests. Session cookies are HTTP-only and can be secure over HTTPS. Production mode disables Flask debug mode and adds security headers.

### 11. Testing

Automated pytest coverage uses in-memory or temporary SQLite databases. The final available suite contains 8 passing tests and covers authentication, CSRF, ownership, CRUD operations, validation, preferences, profile changes, password changes, progress calculations, health checking, and persistence across app instances.

Browser testing covered registration, login, logout, dashboard loading, backlog creation, and task creation. Python compilation, migration checks, and route checks were run. Live MySQL and hosted deployment remain manual steps where infrastructure was unavailable.

See [TESTING_REPORT.md](<TESTING_REPORT.md>) for results.

### 12. Results

The submitted application provides:

- A working branded landing page
- Working registration and login
- Server-side session protection
- Account-scoped MySQL-ready CRUD APIs
- Database-derived progress
- Profile and settings operations
- Health and deployment configuration
- Project documentation and presentation assets

### 13. Limitations

- Forgot-password is a demonstration interface; no email is sent
- Email verification is not implemented
- No rate limiting or account lockout is configured
- No public deployment was claimed or verified
- Live MySQL was unavailable in the local environment
- Sample materials are descriptive content rather than downloadable files

### 14. Future scope

- Email verification and password reset
- Real-time notifications
- Exam countdown and calendar integrations
- Mobile application or PWA support
- Bulk subject import
- Advanced preparation analytics
- Admin and faculty reporting
- Rate limiting and audit logs
- Cloud object storage for study resources
- Automated deployment and continuous integration

### 15. Conclusion

ReAttempt demonstrates the complete conversion of an academic planning frontend into a Flask full-stack application. The implementation provides practical backlog and study workflows while retaining the established branding and responsive design.
