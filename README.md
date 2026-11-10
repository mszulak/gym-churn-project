# Gym Churn Prediction System

Analytical system based on Bayesian statistics and machine learning, designed to early detect and prevent client rotation (churn) in gyms and fitness clubs. The project connects a modern web interface with an efficient backend, allowing for seamless upload of tabular data and real-time risk analysis.

## Architecture and Tech Stack

The project is developed in a monorepo architecture, enforcing a strict separation of concerns between the user interface and the analytical core:

*   **Frontend:** Next.js & React (User interface and data visualization).
*   **Backend:** FastAPI / Python 3.12 (REST API, file validation, routing).
*   **Machine Learning:** NumPyro as the final probabilistic target, with scikit-learn used as a lightweight baseline for the MVP development stage.
*   **Environment Management:** `uv` (Deterministic and lightning-fast Python package manager).
*   **Infrastructure:** Docker & Docker Compose (Containerization).

*In upcoming iterations, the architecture will be extended with a PostgreSQL database and an asynchronous task queue (Celery + Redis) to handle computationally heavy Bayesian inferences.*

## Project Structure

```text
gym-churn-project/
├── frontend/            # Next.js web application
├── backend/             # Analytical server and ML environment
│   ├── app/             # API source code (Separation of Concerns)
│   │   ├── api/         # Endpoints and HTTP communication logic
│   │   ├── core/        # Environment configuration and security
│   │   ├── ml/          # Data validation and ML models
│   │   └── main.py      # Main entry point and application definition
│   ├── Dockerfile       # Lightweight image built with uv
│   ├── pyproject.toml   # Python dependencies definition
│   └── uv.lock          # Guarantee of environment reproducibility
├── notebooks/           # Jupyter notebooks for EDA, research, and model prototyping
├── docker-compose.yml   # Services orchestration setup
└── README.md            # Main documentation
```

## Project Status (MVP Phase)

The project is currently in the active development phase of the Minimum Viable Product.

**Currently implemented:**
* Monorepo architecture setup (FastAPI backend + Next.js frontend).
* Core API infrastructure with initial data upload and processing capabilities.
* First iteration of the user interface.

**Next steps:**
* Connecting the Next.js frontend with the FastAPI backend.
* Training and integrating the baseline predictive model (scikit-learn).
* Finalizing the Docker environment for the frontend app.

## How to Run

*Section in preparation. Full startup instructions (both local and Docker-based) will be added upon completion of the Next.js development setup.*

