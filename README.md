# Gym Churn Prediction System

Analytical system based on Bayesian statistics and machine learning, designed for early detection and prevention of client churn in gyms and fitness clubs. The platform combines a modern Next.js web interface with an asynchronous FastAPI + Celery backend, allowing club owners to upload member data, track prediction uncertainty intervals, and review historical churn analyses.

## Architecture and Tech Stack

The project is built in a monorepo architecture, enforcing a strict separation of concerns between the user interface, REST API, database persistence, and asynchronous ML inference:

- **Frontend:** Next.js (App Router), React, TypeScript & Tailwind CSS (shadcn/ui).
- **Backend:** FastAPI / Python 3.12 (REST API, JWT authentication with Argon2 password hashing).
- **Database & ORM:** PostgreSQL 16 with SQLModel (SQLAlchemy 2.0 + Pydantic v2).
- **Task Queue & Broker:** Celery + Redis (asynchronous background processing of CSV uploads and ML inference).
- **Machine Learning:** Hierarchical Bayesian habit decay model in **NumPyro / JAX** (Zero-Inflated Poisson with SVI inference) combined with a **scikit-learn** contract renewal decision engine.
- **Environment Management:** `uv` (Rust-based Python package manager).
- **Infrastructure:** Docker & Docker Compose (full multi-container orchestration).

## Project Structure

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
    │   │   ├── ml/                # NumPyro SVI habit engine and churn segmentation pipeline
    │   │   ├── worker/            # Celery worker configuration and background inference tasks
    │   │   └── main.py            # FastAPI application entry point
    │   ├── data/
    │   │   └── synthetic_raw/     # Sample relational CSV files (members, contracts, check_ins)
    │   ├── Dockerfile             # Lightweight Python image built with uv
    │   ├── pyproject.toml         # Python dependencies definition
    │   └── uv.lock                # Lockfile guaranteeing environment reproducibility
    ├── local_storage/             # Shared volume buffer for temporary CSV file processing
    ├── notebooks/                 # Jupyter notebooks for EDA, research, and Bayesian prototyping
    ├── docker-compose.yml         # Multi-container orchestration (db, redis, backend, worker, frontend)
    └── README.md                  # Main project documentation

## Project Status (MVP Complete)

Currently implemented:
- **Full Containerized Infrastructure:** Orchestrated PostgreSQL, Redis, FastAPI backend, Celery worker, and Next.js frontend via Docker Compose.
- **Authentication & Multi-Tenancy:** End-to-end registration and login system for gym owners using JWT and HttpOnly cookies.
- **Asynchronous Analysis Pipeline:** Non-blocking 3-file CSV uploads (`members.csv`, `contracts.csv`, `check_ins.csv`) queued via Redis and processed in the background by Celery workers with automatic temporary file cleanup.
- **Hierarchical Bayesian Inference (NumPyro SVI):** Automated gate log cleaning (<45 min filter), weekly attendance grid reconstruction, and live Stochastic Variational Inference (`AutoNormal`) estimating individual habit trajectories (`lambda_base`, `tau`, `gamma`) and club-level anchors/frictions.
- **Operational Retention Dashboard:** Full database storage and interactive visualization of executive KPIs, 4 retention segments (Behavioral Alarm, Hot Window, Zombie Zone, Strong Base), Revenue at Risk (PLN), and individual member habit curves.

Next steps:
- Expanding automated unit and integration test coverage (`pytest` + GitHub Actions CI).
- Temporal backtesting (out-of-time validation) and hyperparameter tuning.

## How to Run

### Option 1: Full Docker Stack (Recommended)

To launch the entire system (PostgreSQL, Redis, FastAPI, Celery Worker, and Next.js Frontend) with a single command:

    docker compose up --build

Once all containers are running:
- **Web Application (Frontend):** http://localhost:3000
- **API Documentation (Swagger UI):** http://localhost:8000/docs

### Option 2: Hybrid Development Mode (Docker Backend + Local Frontend)

If you want to work on the Next.js frontend locally with instant hot-reload:

1. Start the backend infrastructure in Docker:

       docker compose up -d db redis backend worker

2. Run the Next.js development server locally:

       cd frontend
       npm install
       npm run dev

## Testing with Sample Data

The repository includes sample relational data in `backend/data/synthetic_raw/` (`members.csv`, `contracts.csv`, `check_ins.csv`) to test the pipeline out of the box:

1. Open http://localhost:3000, register an account, and log in.
2. Upload `members.csv`, `contracts.csv`, and `check_ins.csv` from `backend/data/synthetic_raw/` into their corresponding slots and click **Run Hierarchical Churn Analysis**.
3. Wait ~30 seconds for the Celery worker to complete the SVI inference and explore the segments and individual habit curves on the dashboard.