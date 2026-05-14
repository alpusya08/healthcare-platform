# Healthcare Platform

AI-Powered Healthcare Web Platform — дипломный проект.

Три сервиса в монорепо:
- **`backend/`** — Java 21 + Spring Boot 3.3 + PostgreSQL (REST API, авторизация, бизнес-логика)
- **`ai-service/`** — Python 3.11 + FastAPI (AI-движок, ML-модели, LLM)
- **`frontend/`** — React 18 + TypeScript + Vite + Tailwind + shadcn/ui (порталы: Пациент / Врач / Админ)

---

## Быстрый старт

```bash
# 1. Создай .env файл на основе примера
cp .env.example .env
# Заполни JWT_SECRET и ANTHROPIC_API_KEY

# 2. Подними все сервисы через Docker Compose
docker compose up -d

# 3. Проверь работу
curl http://localhost:8080/api/v1/health    # backend
curl http://localhost:8000/health           # ai-service
open http://localhost:5173                  # frontend
open http://localhost:9001                  # MinIO (minioadmin / minioadmin_secret)
open http://localhost:5000                  # MLflow
```

## Разработка

### Backend
```bash
cd backend
./mvnw spring-boot:run
./mvnw test
```

### AI Service
```bash
cd ai-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
pytest
```

### Frontend
```bash
cd frontend
npm install
npm run dev
npm run build
```

---

## Структура проекта

```
healthcare-platform/
├── docker-compose.yml
├── backend/              ← Java + Spring Boot
├── ai-service/           ← Python + FastAPI + ML
└── frontend/             ← React + TypeScript
```

## Порты

| Сервис      | Порт |
|-------------|------|
| Frontend    | 5173 |
| Backend     | 8080 |
| AI Service  | 8000 |
| PostgreSQL  | 5432 |
| Redis       | 6379 |
| MinIO API   | 9000 |
| MinIO UI    | 9001 |
| MLflow      | 5000 |

## Тестовые аккаунты

После запуска автоматически создаются демо-аккаунты:

| Роль    | Email                | Пароль       |
|---------|----------------------|--------------|
| Пациент | demo@patient.com     | Demo1234!    |
| Врач    | demo@doctor.com      | Demo1234!    |
| Врач    | dr.seitkali@medai.kz | Doctor1234!  |
| Админ   | admin@medai.kz       | Admin1234!   |
