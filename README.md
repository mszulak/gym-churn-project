# Gym Churn Prediction System

Analytical system based on Bayesian statistics and machine learning, designed for early detection and prevention of client churn in gyms and fitness clubs. The platform combines a modern Next.js web interface with an asynchronous FastAPI + Celery backend, allowing club owners to upload member data, track prediction uncertainty intervals, and review historical churn analyses.

## Architecture and Tech Stack

The project is built in a monorepo architecture, enforcing a strict separation of concerns between the user interface, REST API, database persistence, and asynchronous ML inference:

- **Frontend:** Next.js (App Router), React, TypeScript & Tailwind CSS (`shadcn/ui`).
- **Backend:** FastAPI / Python 3.12 (REST API, JWT authentication with Argon2 password hashing).
- **Database & ORM:** PostgreSQL 16 with SQLModel (SQLAlchemy 2.0 + Pydantic v2).
- **Task Queue & Broker:** Celery + Redis (asynchronous background processing of CSV uploads and ML inference).
- **Machine Learning:** `scikit-learn` (`joblib`) as the end-to-end pipeline baseline, with prepared schema support (uncertainty intervals & time-to-churn) for the target Bayesian model in **NumPyro**.
- **Environment Management:** `uv` (Rust-based Python package manager).
- **Infrastructure:** Docker & Docker Compose (full multi-container orchestration).

## Project Structure

```text
gym-churn-project/
├── frontend/                  # Next.js web application
│   ├── src/                   # UI components, Server Actions, Route Handlers & auth proxy
│   ├── Dockerfile             # Frontend container definition
│   └── package.json           # Node.js dependencies
├── backend/                   # Analytical server and ML worker environment
│   ├── app/                   # Backend source code
│   │   ├── api/               # REST endpoints (auth, CSV upload, analysis history) & dependencies
│   │   ├── core/              # Settings configuration and security (JWT, Argon2)
│   │   ├── db/                # Database session and SQLModel table/schema definitions
│   │   ├── ml/                # Data validation and serialized ML models
│   │   ├── worker/            # Celery worker configuration and background inference tasks
│   │   └── main.py            # FastAPI application entry point
│   ├── Dockerfile             # Lightweight Python image built with uv
│   ├── pyproject.toml         # Python dependencies definition
│   └── uv.lock                # Lockfile guaranteeing environment reproducibility
├── local_storage/             # Shared volume buffer for temporary CSV file processing
├── notebooks/                 # Jupyter notebooks for EDA, research, and Bayesian prototyping
├── docker-compose.yml         # Multi-container orchestration (db, redis, backend, worker, frontend)
└── README.md                  # Main project documentation
```

## Project Status (Pre-MVP Complete)

Currently implemented:
- **Full Containerized Infrastructure:** Orchestrated PostgreSQL, Redis, FastAPI backend, Celery worker, and Next.js frontend via Docker Compose.
- **Authentication & Multi-Tenancy:** End-to-end registration and login system for gym owners using JWT and `HttpOnly` cookies.
- **Asynchronous Analysis Pipeline:** Non-blocking CSV uploads queued via Redis and processed in the background by Celery workers with automatic temporary file cleanup.
- **Persistence & History Dashboard:** Full database storage of analysis jobs and member-level predictions (probabilities, uncertainty bounds, estimated days to churn) with real-time frontend status polling.

Next steps (Research & Modeling Phase):
- Developing and validating the hierarchical Bayesian / survival churn model in **NumPyro**.
- Replacing the baseline `joblib` estimator in the Celery worker with live MCMC/SVI inference.

## How to Run

### Option 1: Full Docker Stack (Recommended)
To launch the entire system (PostgreSQL, Redis, FastAPI, Celery Worker, and Next.js Frontend) with a single command:

```bash
docker compose up --build
```

Once all containers are running:
- **Web Application (Frontend):** http://localhost:3000
- **API Documentation (Swagger UI):** http://localhost:8000/docs

### Option 2: Hybrid Development Mode (Docker Backend + Local Frontend)
If you want to work on the Next.js frontend locally with instant hot-reload:

1. Start the backend infrastructure in Docker:
   ```bash
   docker compose up -d db redis backend worker
   ```
2. Run the Next.js development server locally:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```