# ReAttempt Testing Report

## Testing scope

The available tests use pytest and isolated in-memory or temporary SQLite databases. They exercise Flask routes, CSRF, SQLAlchemy persistence, authorization, validation, and progress calculations.

## Automated test result

The final test run produced:

```text
8 tests passed
```

The suite includes:

1. Registration, login, logout, dashboard protection, and sample data
2. Duplicate email rejection
3. CSRF rejection for mutations without a token
4. Backlog CRUD and search/status filtering
5. Task CRUD, completion, duration, and progress
6. Material CRUD, URL validation, and ownership
7. Profile, preferences, and password changes
8. User isolation
9. Invalid task date and semester/status handling
10. Database record persistence across a recreated app instance
11. Health endpoint

## Manual browser verification

Browser verification was performed on the Flask application:

- Landing page loaded at `/`
- Login/registration page loaded at `/login.html`
- Registration redirected to `/dashboard.html`
- Dashboard loaded student profile and sample records
- A backlog subject was created and shown in the backlog table
- A study task was created and shown in the weekly timetable and task table
- Logout returned the browser to Login
- Login with the registered account restored dashboard access
- Direct dashboard access redirected to Login after logout
- Profile, password, preferences, and data-clearing views remained reachable

Browser test data was removed after verification.

## Syntax and migration verification

- Python source compilation passed
- JavaScript API and dashboard scripts were audited and browser-tested
- Flask routes registered successfully
- `flask --app app db check` reported no migration drift
- Initial migration was applied to the local SQLite fallback
- No browser JavaScript page errors were observed in the tested registration, dashboard, backlog, task, logout, and login flows

## Responsive verification

The existing CSS includes desktop and mobile breakpoints. Final faculty verification should test at least 360 px, 768 px, 1024 px, and 1440 px viewport widths.

## Remaining manual verification

- Live MySQL connection and migration
- MySQL table inspection and persistence after Flask restart
- Hosted HTTPS and secure cookies
- Mobile browser testing on physical devices
- Full materials/profile/settings and delete-confirmation browser run
- Final screenshots

These items are not reported as passed until they are performed.
