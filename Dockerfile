FROM python:3.12-slim

# Install curl (needed by backend for UEX API calls) and Node.js for frontend build
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend requirements first (for Docker layer caching)
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy frontend and build
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm install --legacy-peer-deps

COPY frontend/ ./frontend/
RUN cd frontend && npx vite build

# Copy backend code
COPY backend/ ./backend/

# Environment
ENV PYTHONPATH=/app/backend
ENV PYTHONUNBUFFERED=1

# Railway provides PORT env var; default to 8000 for local Docker
ENV PORT=8000

# Expose port
EXPOSE 8000

# Start server — reads PORT from env
CMD python -m uvicorn main:app --host 0.0.0.0 --port ${PORT}
