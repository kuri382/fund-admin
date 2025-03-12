# ===== Build Stage =====
FROM python:3.11 AS builder
WORKDIR /app

COPY requirements.txt .

RUN python -m venv /venv

RUN --mount=type=cache,target=/root/.cache/pip \
    . /venv/bin/activate && \
    pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ===== Runtime Stage =====
FROM python:3.11-slim
WORKDIR /app

RUN adduser --disabled-password --gecos '' appuser

COPY --from=builder /venv /venv

COPY src/ ./src/
COPY data/ ./data/
COPY bin/start.sh ./bin/start.sh
COPY env.bak ./env.bak

RUN chmod +x ./bin/start.sh

ENV PATH="/venv/bin:$PATH"

USER appuser

CMD ["./bin/start.sh"]
