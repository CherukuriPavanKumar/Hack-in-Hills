FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONPATH=/app
ENV RUNNING_IN_DOCKER=true

EXPOSE 8002

CMD ["uvicorn", "services.gateway.server:app", "--host", "0.0.0.0", "--port", "8002"]
