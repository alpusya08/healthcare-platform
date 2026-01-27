# CLAUDE.md

> **This file is read automatically by Claude Code at the start of every session.**
> Keep it short. Detailed specs live in `SPECIFICATION.md`.

---

## 🎯 Project Overview

This is a diploma project: **AI-Powered Healthcare Web Platform** with treatment recommendations and online doctor appointments.

**Defense in less than 1 month.** This means: working demo > production-grade. But code must be clean and architecture must be defensible.

## 📚 Source of Truth

**`SPECIFICATION.md` in the repository root is the SINGLE SOURCE OF TRUTH** for this project. Before writing any code:

1. Read the relevant section of `SPECIFICATION.md`
2. If something is unclear or missing — ASK before improvising
3. Do NOT add features not in the spec without explicit approval
4. Do NOT change the architecture without discussing first

## 🏛️ Stack (DO NOT CHANGE without discussion)

- **Backend:** Java 21 + Spring Boot 3.3 + Spring Modulith + PostgreSQL 16 + Redis + Flyway
- **AI Service:** Python 3.11 + FastAPI + Pydantic 2 + scikit-learn + XGBoost + MLflow + SQLAlchemy 2 (async)
- **Frontend:** React 18 + TypeScript + Vite + Tailwind + shadcn/ui + TanStack Query + Zustand + React Hook Form + Zod
- **Infra:** Docker Compose, MinIO (S3), GitHub Actions

## 📁 Repository Structure

```
/
├── SPECIFICATION.md          ← Full spec (read sections as needed)
├── CLAUDE.md                 ← This file
├── docker-compose.yml
├── .env.example
├── README.md
│
├── backend/                  ← Java + Spring Boot
├── ai-service/               ← Python + FastAPI
└── frontend/                 ← React + TypeScript
```

## ✅ Code Quality Rules

### Universal
- **No comments explaining what code does** — code must be self-explanatory through naming. Comments only for "why" or non-obvious tradeoffs.
- **Long descriptive names > short cryptic ones**
- **Fail fast** — validate at boundaries, throw explicit exceptions
- **No dead code, no commented-out code**
- **No TODOs without ticket reference**
- **Functions do ONE thing**

### Java specifics
- DTOs are records (Java 21) where possible
- `@Transactional` ONLY in `application/` layer
- NEVER expose JPA entities through controllers
- Use MapStruct for DTO ↔ Entity mapping
- Custom exceptions extend `BusinessException`
- All controllers use `@Valid` on request bodies
- Use `@Slf4j` for logging, structured logs in JSON format

### Python specifics
- Type hints on EVERY function signature
- `async/await` for all I/O (LLM, DB, HTTP)
- Pydantic models for ALL data crossing boundaries
- ABC interfaces in `core/interfaces/`, implementations in `infrastructure/`
- Dependency injection via FastAPI `Depends`
- Use `structlog` for logging with context (request_id, user_id)

### TypeScript specifics
- `strict: true` in tsconfig
- No `any` — use `unknown` and narrow
- Server state via TanStack Query, client state via Zustand
- Forms via React Hook Form + Zod
- Components use named exports (not default)
- Feature-Sliced Design layering (see SPECIFICATION.md §8.1)

## 🚫 Hard Rules

1. **NEVER commit secrets** (API keys, JWT secrets) — use `.env` files
2. **NEVER use production credentials in dev**
3. **NEVER skip migrations** — every DB change goes through Flyway/Alembic
4. **NEVER call external APIs (LLM, MLflow) inside DB transactions**
5. **NEVER bypass the layered architecture** (controller → service → repository)
6. **ALWAYS show medical disclaimer** in any UI screen displaying AI output

## 🧪 Testing Expectations

For MVP we don't need 100% coverage, but these MUST have tests:
- Auth flow (register, login, refresh, logout)
- Appointment booking with concurrent slot conflict
- AI Analysis happy path (mocked LLM/ML)
- CardiologyDomain (each method)
- Triage emergency detection

## 🔄 Workflow

When I ask you to implement something:

1. **Find the relevant section in SPECIFICATION.md** — quote which section you're following
2. **Plan first** — list files you'll create/modify before coding
3. **Implement in small commits** — one logical change per commit
4. **Run tests/build** after major changes
5. **Update README.md** if you add new setup steps

When you're unsure:
- Read the spec section more carefully first
- If still unclear — ASK ME before coding (don't guess on architecture)
- For minor naming/style — make a reasonable choice and note it

## 🎬 Demo Scenarios (don't break these!)

The defense demo runs these flows. Don't break them:

1. **Patient AI Analysis (routine):** describe symptoms → answer questions → upload file → get report → book slot
2. **Emergency triage:** describe heart-attack-like symptoms → red banner with "call 103"
3. **Doctor feedback:** doctor opens AI report → approves/rejects with comment
4. **Admin ML Dashboard:** see model metrics from MLflow

If you change anything that affects these — TELL ME explicitly.

## 📝 Commit Convention

Format: `<type>(<scope>): <subject>`

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`

Examples:
```
feat(auth): add JWT refresh token rotation
fix(ai): handle empty LLM response in feature extraction
refactor(appointments): extract slot generation to separate service
test(cardiology): add emergency triage tests
docs(spec): clarify confidence threshold logic
```

## 🌐 Language

- **Code, identifiers, comments, commit messages, logs:** English
- **User-facing text (UI labels, error messages shown to user, AI prompts output):** Russian
- **LLM prompts to Claude/OpenAI:** English (models work better)

## 🛟 When stuck

If you encounter ambiguity in the spec, prefer this order:
1. Re-read the spec section + adjacent sections
2. Look at existing code patterns in this repo
3. Apply industry-standard solution and note your choice
4. Ask the user if it's an architectural decision

If you find an actual bug or contradiction in `SPECIFICATION.md` — flag it explicitly. The spec is the source of truth, but it's not infallible.
