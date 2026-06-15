FROM python:3.10-slim

WORKDIR /app

# Install system dependencies required for OpenCV and YOLOv8
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy and install python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source files and AI models
COPY . .

# Ensure uploads folders are created
RUN mkdir -p uploads/ai uploads/heatmaps uploads/emails

# Set environment variables
ENV MONGODB_URI=mongodb://db:27017/smartRoad
ENV PORT=8000

# Expose backend port
EXPOSE 8000

# Start FastAPI application using uvicorn
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
