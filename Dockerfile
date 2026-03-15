# PitchVision AI - Docker Configuration
# Multi-stage build for production deployment

# Stage 1: Base image with CUDA support
FROM nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04 AS base

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# System dependencies
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3.10-venv \
    python3-pip \
    ffmpeg \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

RUN ln -s /usr/bin/python3.10 /usr/bin/python

WORKDIR /app

# Stage 2: Python dependencies
FROM base AS dependencies

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Stage 3: Application
FROM dependencies AS app

COPY src/ ./src/
COPY configs/ ./configs/
COPY scripts/ ./scripts/
COPY data/ ./data/

# Download model weights
RUN mkdir -p models

EXPOSE 8000

# Default: run API server
CMD ["uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "8000"]
