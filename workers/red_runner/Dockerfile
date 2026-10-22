FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    iputils-ping \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONPATH=/app
ENV RUNNING_IN_DOCKER=true

EXPOSE 8004

# Run in-container probe server
CMD ["uvicorn", "workers.red_runner.server:app", "--host", "0.0.0.0", "--port", "8004"]
