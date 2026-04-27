# Eventura (An Event Management Platform)

A full stack event management platform for a small business in Coochbehar, West Bengal, supporting customers, event managers, and administrators. Built with Flask and React.


## Project Overview

Eventura allows customers to plan events online through a guided wizard, schedule consultations with event managers, and interact with an AI-powered chatbot. Managers can review bookings and receive AI-generated assessments. Administrators manage venues, themes, and packages.

**Key features:**
- Seven-step event planning wizard (event type, venue, theme, guests, packages)
- AI event recommender to which you can describe your event and get a full recommendation in one step
- RAG-based chatbot grounded in live catalogue data and static business knowledge
- Manager booking review assistant with automatic flag detection
- Full booking lifecycle management with conflict detection
- Admin dashboard with revenue reports and analytics

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3, Flask 3.1 |
| Database | PostgreSQL 17 (NeonDB) |
| ORM / Migrations | SQLAlchemy, Flask-Migrate (Alembic) |
| Authentication | Flask-JWT-Extended |
| AI | Anthropic Claude Haiku, ChromaDB, sentence-transformers |
| Frontend | React 19, Vite 6 |
| Routing | react-router-dom 7 |
| HTTP client | axios |

---

## Prerequisites

Make sure the following are installed on your machine before starting:

- **Python 3.10 or higher** - [python.org](https://www.python.org/downloads/)
- **Node.js 18 or higher** - [nodejs.org](https://nodejs.org/)
- **Git** - [git-scm.com](https://git-scm.com/)
- A **NeonDB account** with two databases created (one for development, one for testing) - [neon.tech](https://neon.tech)
- An **Anthropic API key** - [console.anthropic.com](https://console.anthropic.com)

---

## Project Structure

```
techtonics_se/
├── backend/
│   ├── app/
│   │   ├── models/          # SQLAlchemy models
│   │   ├── routes/          # Flask blueprints (one per resource)
│   │   ├── rag/             # RAG vector store and knowledge base
│   │   ├── utils/           # Shared helpers
│   │   ├── extensions.py    # Flask extension instances
│   │   └── __init__.py      # Application factory
│   ├── migrations/          # Alembic migration files
│   ├── tests/               # pytest test suite
│   ├── swagger/             # OpenAPI YAML documentation
│   ├── config.py            # Environment-based configuration
│   ├── run.py               # Application entry point
│   ├── seed.py              # Seeds staff accounts and event types
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── context/         # AuthContext, WizardContext
    │   ├── pages/           # Customer, manager, and admin pages
    │   ├── components/      # Shared components (ChatWidget etc.)
    │   ├── services/        # api.js — all API calls
    │   └── main.jsx
    ├── package.json
    └── vite.config.js
```

---

## Backend Setup

### 1. Clone the repository

```bash
git clone https://github.com/yuzikage/eventura.git
cd eventura
```

### 2. Create and activate a virtual environment

```bash
cd backend
python -m venv venv

# On macOS/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

### 3. Install Python dependencies

```bash
pip install -r requirements.txt
```

> **Note:** `chromadb` and `sentence-transformers` may take a few minutes to install. `sentence-transformers` will download a small embedding model (~90 MB) automatically on the first server startup but this is normal and only happens once.

### 4. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in all values. See the [Environment Variables Reference](#environment-variables-reference) section below for details on each variable.

To generate secure random keys for `SECRET_KEY` and `JWT_SECRET_KEY`, run:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Run this twice to get two separate keys.

### 5. Set up the database

Run the following commands in order. The `migrations/` folder already exists in the repository so you do **not** need to run `flask db init`.

```bash
flask --app run.py db upgrade
```

This applies all existing migrations and creates the required tables in your NeonDB database.

### 6. Seed initial data

```bash
python seed.py
```

This creates the two staff accounts (manager and admin) and the four event types (Wedding, Birthday, Corporate, Social Event). It is safe to run multiple times since existing records are skipped.

After seeding, you will also need to add at least one venue, theme, and set of packages through the admin dashboard before customers can complete a booking. Log in as admin (see [Default Accounts](#default-accounts)) and use the admin panel to add this content.

---

## Frontend Setup

### 1. Install Node dependencies

```bash
cd frontend
npm install --legacy-peer-deps
```

> The `--legacy-peer-deps` flag is required due to a peer dependency conflict between `@tailwindcss/vite` and the version of Vite used in this project. This does not affect any functionality.

### 2. Configure the API base URL

The frontend calls the backend directly at `http://localhost:5000`. No additional configuration is needed for local development, the base URL is set in `src/services/api.js`.

If you change the backend port, update the base URL in `src/services/api.js` to match.

---

## Running the Application

You need two terminal windows running simultaneously. One for the backend and one for the frontend.

**Terminal 1 - Backend:**

```bash
cd backend
source venv/bin/activate       # skip if already active
flask --app run.py run --debug
```

The API will be available at `http://localhost:5000`

Health check: `GET http://localhost:5000/api/v1/health` returns with `{"status": "ok"}`

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

The application will be available at `http://localhost:5173`

---

## Default Accounts

After running `seed.py`, the following staff accounts are available:

| Role | Email | Password |
|---|---|---|
| Event Manager | manager@eventura.in | manager123 |
| Administrator | admin@eventura.in | admin123 |

Customer accounts are created through the signup page at `/signup`.

> **Important:** Change these passwords before deploying to any environment accessible outside your local machine.

---

## Running Tests

The test suite uses a separate NeonDB test database to keep test data isolated from your development data. Make sure `TEST_DATABASE_URL` is set in your `.env` file before running tests.

```bash
cd backend
source venv/bin/activate
pytest tests/
```

To run a specific test file:

```bash
pytest tests/test_bookings.py
pytest tests/test_ai_recommend.py
```

To run with verbose output:

```bash
pytest tests/ -v
```

**Test database note:** Tests use a transaction-based isolation strategy. Each test runs in a transaction that is rolled back after completion. No data is permanently written to the test database.

**AI tests note:** All tests that touch AI endpoints mock the Anthropic API. No real API calls are made and no API key is consumed during testing.

---

## API Documentation

The full API is documented in OpenAPI 3.0 format. The YAML file is located at:

```
backend/swagger/swagger_api_documentation_v2.yaml
```

To view it interactively, paste the contents into [Swagger Editor](https://editor.swagger.io).

Alternatively, Flasgger provides a built-in Swagger UI when the backend is running:

```
http://localhost:5000/apidocs
```

### API Base URL

All endpoints are prefixed with `/api/v1/`. Example:

```
http://localhost:5000/api/v1/auth/login
http://localhost:5000/api/v1/venues
http://localhost:5000/api/v1/bookings
```

### Authentication

Most endpoints require a Bearer JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

Obtain a token by calling `POST /api/v1/auth/login` with email and password. Store the token and include it in all subsequent requests.

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `FLASK_ENV` | Yes | Environment name. Use `development` for local development. |
| `SECRET_KEY` | Yes | Flask secret key. Generate with `secrets.token_hex(32)`. |
| `JWT_SECRET_KEY` | Yes | Key used to sign JWT tokens. Must be different from `SECRET_KEY`. |
| `DATABASE_URL` | Yes | PostgreSQL connection string for your NeonDB development database. Format: `postgresql://user:password@host.neon.tech/dbname?sslmode=require` |
| `TEST_DATABASE_URL` | Yes (for tests) | PostgreSQL connection string for your NeonDB test database. Should be a separate database from `DATABASE_URL`. |
| `ANTHROPIC_API_KEY` | Yes (for AI features) | Your Anthropic API key from [console.anthropic.com](https://console.anthropic.com). Without this, the chatbot, AI recommender, and booking review endpoints return 503. All other features work normally. |

---

## Troubleshooting

**`ModuleNotFoundError` on startup**
Make sure your virtual environment is activated and you have run `pip install -r requirements.txt`.

**Database connection error**
Check that `DATABASE_URL` in your `.env` is correct and that your NeonDB database is active. NeonDB free tier databases pause after inactivity so you will have to open the NeonDB dashboard to wake it if needed.

**`sentence-transformers` model download on first run**
The first time the backend starts, it downloads the `all-MiniLM-L6-v2` embedding model (~90 MB) for the RAG system. This is automatic and only happens once. Subsequent startups use the cached model. Ensure you have an internet connection for the first run.

**AI features return 503**
Check that `ANTHROPIC_API_KEY` is set correctly in `.env` and that the key is valid and has remaining credits.

**CORS errors in the browser**
The backend is configured to accept requests from `http://localhost:5173` and `http://localhost:3000`. If your frontend runs on a different port, update the `cors.init_app(...)` origins list in `backend/app/__init__.py`.

**Tests fail with database errors**
Ensure `TEST_DATABASE_URL` is set in `.env` and points to a separate database from your development database. Run `flask --app run.py db upgrade` once against the test database URL if the tables do not exist yet.
