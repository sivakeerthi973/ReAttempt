# ReAttempt API Documentation

Base URL for local development: `http://127.0.0.1:5000`

## Common rules

- APIs use JSON requests and responses.
- Authentication uses the signed Flask session cookie.
- State-changing requests require `X-CSRFToken`.
- Obtain a token from `GET /api/auth/csrf-token`.
- Protected endpoints return `401` and `error: "authentication_required"` when no valid session exists.
- Record ownership is determined by the session user; request bodies do not select or authorize another user.
- API errors use JSON fields `error` and `message`.

## Authentication

### `GET /api/auth/csrf-token`

Returns:

```json
{"csrfToken":"token"}
```

### `POST /api/auth/register`

JSON:

```json
{
  "fullName": "Student Name",
  "email": "student@example.edu",
  "password": "StrongPass123",
  "confirmPassword": "StrongPass123",
  "college": "Example Engineering College",
  "course": "B.Tech",
  "department": "Computer Science",
  "year": "3rd year",
  "semester": "Semester 5",
  "remember": true
}
```

Returns `201` and creates account-specific sample backlog, task, material, and preference records.

### `POST /api/auth/login`

JSON:

```json
{"email":"student@example.edu","password":"StrongPass123","remember":true}
```

Returns `200`; incorrect credentials return `401`.

### `POST /api/auth/logout`

Clears the server-side session.

### `GET /api/auth/me`

Returns the current user's profile. It returns `401` without a session.

## Backlogs

### `GET /api/backlogs`

Optional query parameters:

- `search`
- `semester`
- `status`

Response:

```json
{"items":[{"id":1,"name":"Mathematics II","code":"MATH202","semester":"Semester 2","attempts":2,"status":"In progress","progress":65,"examDate":"","topicsDone":[],"topicsPending":[],"sample":true}]}
```

### `POST /api/backlogs`

JSON fields:

- `name`
- `code`
- `semester`
- `attempts`
- `status`
- `progress`
- `examDate`
- `topicsDone`
- `topicsPending`

### `GET /api/backlogs/<id>`

Returns one owned backlog subject.

### `PUT /api/backlogs/<id>`

Replaces the supported subject fields.

### `DELETE /api/backlogs/<id>`

Deletes the owned subject and cascades linked tasks. It does not delete another user's records.

## Study tasks

### `GET /api/tasks`

Optional filters: `date`, `subjectId`, `status`.

Task fields include `id`, `title`, `subjectId`, `subject`, `date`, `start`, `end`, `durationMinutes`, `status`, and `sample`.

### `POST /api/tasks`

```json
{"title":"Review graphs","subjectId":1,"date":"2026-11-18","start":"09:00","end":"10:30","status":"Planned"}
```

Duration is derived from start and end times. End time must be later than start time.

### `PUT /api/tasks/<id>`

Updates one owned task.

### `PATCH /api/tasks/<id>/complete`

Marks one owned task as completed.

### `DELETE /api/tasks/<id>`

Deletes one owned task.

## Study materials

### `GET /api/materials`

Optional filters: `search`, `subjectId`, `type`.

Shared sample resources and the signed-in student's custom resources are included. Custom resources expose `sample: false`.

### `POST /api/materials`

```json
{"title":"Trusted notes","subjectId":1,"type":"Notes","url":"https://example.edu/notes","description":"Lecture revision notes"}
```

Only `http://` and `https://` URLs are accepted. Credentials in URLs are rejected.

### `PUT /api/materials/<id>`

Updates an owned custom resource.

### `DELETE /api/materials/<id>`

Deletes an owned custom resource. Sample resources cannot be modified.

## Profile and preferences

### `GET /api/profile`

Returns profile information.

### `PUT /api/profile`

Updates name, email, college, course, department, year, and semester.

### `POST /api/profile/password`

Requires `currentPassword`, `newPassword`, and `confirmPassword`.

### `GET /api/preferences`

Returns `theme`, `studyReminders`, and `weeklyRecap`.

### `PUT /api/preferences`

Updates the three preference values.

### `DELETE /api/account/data`

Clears all owned subjects, tasks, and custom resources. It leaves the account and base profile active.

## Progress

### `GET /api/progress`

Returns subject totals, completed/pending totals, overall preparation average, task totals, completed study hours, subject-wise rows, and Monday-Sunday weekly completed study minutes/hours.

## Health

### `GET /api/health`

Returns `200` with database status when connected. It returns `503` when the database cannot be reached.

This endpoint is intended for hosting-platform health checks and does not expose credentials or detailed database errors.
