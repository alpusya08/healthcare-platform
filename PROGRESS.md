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

### Day 2 — Auth + Users (Backend)
- Flyway миграции: V2 (users, patients, specializations, doctors, refresh_tokens), V3 (seed specializations), V4 (event_publication для Spring Modulith)
- Users модуль: User (aggregate root), Patient, Doctor, Specialization entities + enums (Role, Gender, UserStatus) + repositories
- Auth модуль: RefreshToken entity, JwtService (HS512), RefreshTokenService (rotation), AuthService
- Auth API: AuthController с 6 эндпоинтами (register/patient, login, refresh, logout, me)
- Security: SecurityConfig (stateless JWT), JwtAuthenticationFilter, BCrypt(12), CORS
- Shared: BusinessException base class, GlobalExceptionHandler
- Smoke test: все 6 auth endpoints работают ✅

### Day 3 — Frontend Auth pages
- shared: axios instance с JWT interceptors и auto-refresh, env config, routes config, API types
- features/auth: authApi (login/register/refresh/logout/me), authStore (Zustand), LoginForm, RegisterForm
- features/auth/api: useLoginMutation, useRegisterMutation (TanStack Query)
- app: AuthProvider (auto-восстановление сессии), ProtectedRoute (role-based), обновлённый App.tsx с routing
- pages: LoginPage, RegisterPage, HomePage (с logout и карточками), NotFoundPage
- shadcn/ui: button, input, label, card, form, toast, sonner
- vite-env.d.ts для VITE_ env vars
- Smoke test: login/register/me/logout через UI ✅

## ⏭️ Следующий шаг — Day 4

**Что делать в новой сессии Claude Code:**

```
Привет. Возвращаюсь к проекту healthcare-platform.
Прочитай PROGRESS.md, CLAUDE.md, SPECIFICATION.md §7 (AI Service).

Day 3 закрыт. Начни Day 4 из §16:
- AI Service: FastAPI структура Clean Architecture, БД через SQLAlchemy
- AI Service: LLM adapter (Claude API), базовая интеграция
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
- [x] Day 2 — Auth + Users (Backend)
- [x] Day 3 — Frontend Auth pages
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
