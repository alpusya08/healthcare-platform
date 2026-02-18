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

### Day 4 — AI Service core + LLM adapter
- Core: entities (AnalysisSession, Question, Diagnosis, MedicalFeatures, DoctorFeedback), enums, exceptions
- Core interfaces (ports): MedicalDomain (Strategy), LLMProvider, MLPredictor, AnalysisSessionRepository
- Domains: CardiologyDomain (extract_features, generate_question, check_emergency, predict), NeurologyDomain (stub)
- DomainRegistry (Factory pattern), cardiology features/prompts/triage_rules
- Infrastructure: ClaudeLLMProvider (Anthropic SDK), LLM factory, InMemorySessionRepository
- API: schemas (Pydantic v2), analysis endpoints (start/answer/finalize), health/domains endpoints
- Exception handlers: DomainNotSupported→400, SessionNotFound→404, LLMError→502
- ML: train_cardiology.py (XGBoost + MLflow + sklearn pipeline), download_datasets.py
- Smoke test: все endpoints отвечают корректно ✅ (без API key — graceful degradation)

### Day 5 — Backend ↔ AI Service integration + ML baseline (commit `683f49d`)
- XGBoost модель обучена на UCI Heart Disease (303 rows): acc=88.5%, ROC-AUC=94.5%, F1=88.5%
- Модель зарегистрирована в MLflow как `cardiology-diagnosis@champion` (v2, sklearn 1.8.0)
- `MLflowCardiologyPredictor` — загружает модель из MLflow, возвращает `ModelPrediction` с feature importances
- `MockLLMProvider` — rule-based LLM для dev без API ключа (генерирует вопросы, парсит ответы)
- Graceful fallback: MockLLM когда нет API ключа, predictor=none когда модель не загружена
- `AiServiceClient` (Java) — `RestClient`-based HTTP клиент для backend↔AI service (`/api/v1/ai/analysis/*`)
- `AiAnalysisController` (Java) — `/api/v1/ai/analysis/start`, `/answer`, `/finalize` проксирует в Python
- `mlflow_data` volume расшарен с AI service контейнером для прямого доступа к артефактам
- Smoke test: полный цикл login→start→finalize→XGBoost prediction работает ✅

## ⏭️ Следующий шаг — Day 6-7

```
Day 5 закрыт. Продолжай с Day 6-7:
- Frontend: AI Analysis UI (форма описания симптомов, Q&A чат, отчёт с диагнозом)
- Emergency triage UI (красный баннер "вызовите 103")
- Appointment booking (базовый UI + backend)
- Doctor dashboard (просмотр AI отчётов, approve/reject)
- Общий дизайн UI (обсудить с пользователем)
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
- [x] Day 4 — AI Service core + LLM adapter
- [x] Day 5 — Backend ↔ AI Service integration + ML baseline
- [ ] Day 7 — bugfix + README + integration tests

## 📁 Расположение проектов на диске

| Проект | Путь | Статус |
|---|---|---|
| **Новый (актуальный)** | `~/IdeaProjects/healthcare-platform/` | в работе |
| Старый Java backend | `~/IdeaProjects/MedAI/MedAI/` | архив, можно удалить |
| Старый Python AI | `~/IdeaProjects/AI/` | архив, можно удалить |
