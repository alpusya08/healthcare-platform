# Прогресс по Roadmap

> Этот файл — состояние работы. Читай его в начале каждой новой сессии Claude Code.

## ✅ Сделано

### Day 1 — Monorepo scaffolding (commit `daf2790`)
- Структура `/Users/alpamysrezikhan/IdeaProjects/healthcare-platform/`
- `backend/` — Spring Boot 3.3.5 + Modulith 1.2.5 + Java 21, скелет 6 модулей с `@ApplicationModule`, application.yml (dev/prod/test), Flyway init migration, multi-stage Dockerfile, HealthController, OpenApiConfig
- `ai-service/` — FastAPI скелет, Clean Architecture папки, config (Pydantic Settings), Alembic, Dockerfile
- `frontend/` — Vite + React 18 + TS strict + Tailwind + shadcn config + FSD структура, базовая HomePage
- `docker-compose.yml` — postgres, redis, minio (+init bucket), mlflow, backend, ai-service, frontend
- `infra/postgres/init.sh` — создаёт вторую БД `ai_feedback` для AI service
- `.env.example`, `.gitignore`, `README.md`
- Проверки: `docker compose config` ✅, `mvn clean compile` ✅, python syntax ✅

## ⏭️ Следующий шаг — Day 2

**Что делать в новой сессии Claude Code:**

```
Привет. Возвращаюсь к проекту healthcare-platform.
Прочитай:
1. CLAUDE.md (правила работы)
2. PROGRESS.md (где остановились)
3. SPECIFICATION.md §6.2-6.3, §10 (Auth API), §13 (Security)
4. git log --oneline -10

Сейчас Day 1 закрыт. Начни Day 2 из §16:
- Backend: Auth модуль (register/login/refresh/JWT, RefreshToken, JwtAuthenticationFilter, SecurityConfig)
- Backend: User модуль (User aggregate root, Patient, Doctor, Specialization, миграции)
- Flyway миграции V2/V3 для users + roles + refresh_tokens

Согласовывай со мной перед каждым большим шагом.
```

## 🚫 НЕ делал

- Не заливал на GitHub (нет remote). Когда будешь готов:
  ```bash
  cd /Users/alpamysrezikhan/IdeaProjects/healthcare-platform
  gh repo create healthcare-platform --private --source=. --remote=origin --push
  # или вручную:
  # git remote add origin git@github.com:USERNAME/healthcare-platform.git
  # git push -u origin master
  ```
- Не запускал `docker compose up` целиком (build всех образов ~10 мин). Инфру (postgres/redis/minio/mlflow) поднимать можно — там готовые образы.

## 🧪 Smoke test (если хочешь проверить что Day 1 жив)

```bash
cd /Users/alpamysrezikhan/IdeaProjects/healthcare-platform
cp .env.example .env

# Поднять инфру
docker compose up -d postgres redis minio mlflow minio-init

# Запустить backend локально
cd backend && mvn spring-boot:run

# В другом терминале:
curl http://localhost:8080/api/v1/health
# → {"service":"healthcare-platform-backend","status":"UP","timestamp":"..."}
open http://localhost:8080/swagger-ui.html
open http://localhost:9001   # MinIO: minioadmin / minioadmin_secret
open http://localhost:5000   # MLflow
```

## 📋 Чек по Roadmap (§16)

- [x] Day 1 — scaffolding
- [ ] Day 2 — Auth + Users (Backend)
- [ ] Day 3 — Frontend Auth pages
- [ ] Day 4 — AI Service core + LLM adapter
- [ ] Day 5 — Backend ↔ AI Service integration
- [ ] Day 5-6 — ML baseline (UCI Heart Disease + MLflow)
- [ ] Day 7 — bugfix + README + integration tests

## 📁 Расположение проектов на диске

| Проект | Путь | Статус |
|---|---|---|
| **Новый (актуальный)** | `~/IdeaProjects/healthcare-platform/` | в работе |
| Старый Java backend | `~/IdeaProjects/MedAI/MedAI/` | архив, можно удалить |
| Старый Python AI | `~/IdeaProjects/AI/` | архив, можно удалить |
