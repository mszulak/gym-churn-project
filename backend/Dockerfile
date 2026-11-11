FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

COPY pyproject.toml uv.lock* ./

RUN uv sync --frozen --no-dev --no-install-project

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app"

COPY ./app ./app

CMD ["fastapi", "dev", "app/main.py", "--port", "8000", "--host", "0.0.0.0"]
