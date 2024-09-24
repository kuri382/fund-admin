# Build stage: Install python packages
FROM python:3.11 AS builder

# Create virtual environment
RUN python -m venv /venv

# Activate virtual environment and install dependencies
COPY requirements.txt .
RUN . /venv/bin/activate && pip install --no-cache-dir -r requirements.txt

# Runtime stage: Use a smaller base image
FROM python:3.11-slim

# Copy virtual environment from builder stage
COPY --from=builder /venv /venv

# Copy source code and start script
COPY src/ ./src/
COPY data/ ./data/

COPY bin/start.sh ./bin/start.sh
COPY env.bak ./env.bak

# Make the start script executable
RUN chmod +x ./bin/start.sh

# Activate virtual environment
ENV PATH="/venv/bin:$PATH"

# Run start script
CMD ["./bin/start.sh"]
