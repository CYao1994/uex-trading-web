FROM python:3.12-slim

# Install curl (needed by backend for UEX API calls)
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend requirements first (for Docker layer caching)
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code only (frontend is deployed on Cloudflare Pages)
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
