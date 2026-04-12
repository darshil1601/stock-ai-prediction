# Use Python 3.10 as base
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PORT 7860
ENV TF_USE_LEGACY_KERAS 1
ENV TF_CPP_MIN_LOG_LEVEL 3

# Working directory inside container
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements first for caching
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend code into the container
COPY backend/ .

# Create models directory
RUN mkdir -p app/models

# Expose port
EXPOSE 7860

# Run the app (main:app assumes main.py is in the root of the copied files)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
