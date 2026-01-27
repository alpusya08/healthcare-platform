# Healthcare Platform

AI-Powered Healthcare Web Platform — дипломный MVP.

3 сервиса в монорепо:
- **`backend/`** — Java 21 + Spring Boot 3.3 + Spring Modulith (REST API gateway, auth, бизнес-логика)
- **`ai-service/`** — Python 3.11 + FastAPI (domain-agnostic AI engine, ML, LLM)
- **`frontend/`** — React 18 + TypeScript + Vite + Tailwind + shadcn/ui (3 портала: Patient/Doctor/Admin)

См. `SPECIFICATION.md` (источник истины) и `CLAUDE.md` (правила работы).

---

## Быстрый старт

```bash
# 1. Скопируй переменные окружения
cp .env.example .env
# (отредактируй .env при необходимости — JWT_SECRET, ANTHROPIC_API_KEY)

# 2. Подними всё через Docker Compose
docker compose up -d

# 3. Проверь что сервисы живы
curl http://localhost:8080/api/v1/health    # backend
curl http://localhost:8000/health           # ai-service
open http://localhost:5173                  # frontend
open http://localhost:9001                  # MinIO console (minioadmin / minioadmin_secret)
open http://localhost:5000                  # MLflow UI
```

## Локальная разработка по сервисам

### Backend
```bash
cd backend
./mvnw spring-boot:run             # требует postgres+redis запущенные через docker compose
./mvnw test
```

### AI Service
```bash
cd ai-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -e .[dev]
uvicorn app.main:app --reload
pytest
```

### Frontend
```bash
cd frontend
npm install
npm run dev
npm run build
npm test
```

---

## Структура

```
healthcare-platform/
├── SPECIFICATION.md      ← полное ТЗ, источник истины
├── CLAUDE.md             ← правила работы для Claude Code
├── KICKOFF_PROMPT.md     ← как стартовать проект с Claude Code
├── docker-compose.yml
├── .env.example
│
├── backend/              ← Java + Spring Boot + Modulith
├── ai-service/           ← Python + FastAPI + ML
├── frontend/             ← React + TypeScript + Vite
│
└── infra/                ← инфраструктурные скрипты (init.sh для postgres, ...)
```

## Порты по умолчанию

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
