# ReAttempt Database Schema

## Database

Production target: MySQL database `reattempt_db`, UTF-8 MB4.

SQLAlchemy models are the source of truth and Flask-Migrate manages schema changes. The initial migration is:

`migrations/versions/25bda3f2ccd3_create_initial_student_planner_schema.py`

SQLite is used for local development fallback and isolated automated tests. It is not the submission's production source of truth.

## `users`

| Column | Type | Constraints |
|---|---|---|
| id | Integer | Primary key |
| full_name | String(120) | Not null |
| email | String(254) | Not null, unique, indexed |
| password_hash | String(512) | Not null |
| college | String(180) | Not null |
| course | String(100) | Not null |
| department | String(120) | Not null |
| year | String(20) | Not null |
| semester | String(20) | Not null |
| created_at | UTC DateTime | Not null |

Password hashes are produced by Werkzeug scrypt, never plaintext.

## `backlogs`

| Column | Type | Constraints |
|---|---|---|
| id | Integer | Primary key |
| user_id | Integer | Foreign key `users.id`, cascade delete |
| subject_name | String(120) | Not null |
| subject_code | String(40) | Not null |
| semester | String(20) | Not null |
| attempts | Integer | Not null, minimum 1 |
| status | String(20) | Not null |
| progress | Integer | 0–100 |
| exam_date | Date | Nullable |
| topics_done | JSON | Not null |
| topics_pending | JSON | Not null |
| is_sample | Boolean | Not null |
| created_at | UTC DateTime | Not null |

Constraints include a user-plus-subject-code unique constraint and indexes for user/semester/status.

## `study_tasks`

| Column | Type | Constraints |
|---|---|---|
| id | Integer | Primary key |
| user_id | Integer | Foreign key `users.id`, cascade delete |
| backlog_id | Integer | Foreign key `backlogs.id`, cascade delete |
| title | String(180) | Not null |
| study_date | Date | Not null |
| start_time | Time | Not null |
| end_time | Time | Not null |
| duration | Integer | Minutes, minimum 1 |
| status | String(20) | Not null |
| is_sample | Boolean | Not null |
| created_at | UTC DateTime | Not null |

An index is maintained on user, study date, and status.

## `study_materials`

| Column | Type | Constraints |
|---|---|---|
| id | Integer | Primary key |
| user_id | Integer | Nullable foreign key `users.id`, cascade delete |
| backlog_id | Integer | Nullable foreign key `backlogs.id` |
| title | String(120) | Not null |
| subject | String(120) | Not null |
| material_type | String(30) | Not null |
| url | String(2048) | Nullable |
| description | String(240) | Not null |
| is_sample | Boolean | Not null |
| created_at | UTC DateTime | Not null |

Shared sample resources have nullable `user_id`. Custom resources belong to one user.

## `user_preferences`

| Column | Type | Constraints |
|---|---|---|
| id | Integer | Primary key |
| user_id | Integer | Foreign key `users.id`, unique |
| dark_theme | Boolean | Not null |
| notifications_enabled | Boolean | Not null |
| weekly_recap | Boolean | Not null |

## Relationships

- One user has many backlogs, tasks, materials, and one preference record.
- One backlog belongs to one user and can have many tasks and materials.
- A task belongs to one user and one backlog.
- A material may belong to one user and optionally one backlog.
- A cascade delete removes account-owned backlogs, tasks, materials, and preferences.

## MySQL setup

```sql
CREATE DATABASE reattempt_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'reattempt_user'@'localhost' IDENTIFIED BY 'replace_this_password';
GRANT ALL PRIVILEGES ON reattempt_db.* TO 'reattempt_user'@'localhost';
FLUSH PRIVILEGES;
```

Configure `.env`:

```dotenv
DATABASE_URL=mysql+pymysql://reattempt_user:replace_this_password@127.0.0.1:3306/reattempt_db?charset=utf8mb4
```

Then run:

```powershell
flask --app app db upgrade
flask --app app db current
flask --app app db check
```

Live MySQL verification remains a manual prerequisite because MySQL was unavailable in the development environment.
