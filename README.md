# Healthcare Platform

Дипломный проект. Веб-система для записи к врачу с AI-триажем симптомов и ML-моделью приоритизации.

Три сервиса:
- **`backend/`** — Java 21, Spring Boot 3.3, PostgreSQL
- **`ai-service/`** — Python 3.11, FastAPI, XGBoost, LLM (Anthropic / Ollama)
- **`frontend/`** — React 18, TypeScript, Tailwind, shadcn/ui

---

## Запуск

```bash
cp .env.example .env          # заполни JWT_SECRET и ANTHROPIC_API_KEY
docker compose up -d
```

Проверка:
```bash
curl http://localhost:8080/api/v1/health
curl http://localhost:8000/health
```

| Сервис     | Адрес                       |
|------------|-----------------------------|
| Frontend   | http://localhost:5173        |
| Backend    | http://localhost:8080        |
| Swagger    | http://localhost:8080/swagger-ui.html |
| AI Service | http://localhost:8000        |
| MLflow     | http://localhost:5000        |
| MinIO UI   | http://localhost:9001        |

---

## Разработка

**Backend**
```bash
cd backend && ./mvnw spring-boot:run
./mvnw test
```

**AI Service**
```bash
cd ai-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
pytest
```

**Frontend**
```bash
cd frontend && npm install && npm run dev
```

---

## Демо-аккаунты

Создаются автоматически при первом запуске (Flyway seed).

| Роль    | Email                | Пароль      |
|---------|----------------------|-------------|
| Пациент | demo@patient.com     | Demo1234!   |
| Врач    | demo@doctor.com      | Demo1234!   |
| Врач    | dr.seitkali@medai.kz | Doctor1234! |
| Админ   | admin@medai.kz       | Admin1234!  |
