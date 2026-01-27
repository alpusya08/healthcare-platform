# 🚀 Kickoff Prompt for Claude Code

> Это первый промпт, который ты отправляешь Claude Code в новом проекте. Он задаёт контекст и запускает первую задачу — настройку каркаса.

---

## Шаг 0: Подготовка папки

```bash
# Создай пустую папку под проект, например:
mkdir healthcare-platform
cd healthcare-platform

# Скопируй туда два файла:
#   SPECIFICATION.md   (главное ТЗ, 3421 строка)
#   CLAUDE.md          (правила для Claude Code)

# Инициализируй git
git init
git add SPECIFICATION.md CLAUDE.md
git commit -m "docs: add project specification and Claude Code rules"

# Запусти Claude Code
claude
```

---

## Шаг 1: Первый промпт (скопируй целиком)

```
Привет. Это новый проект — дипломная работа AI-Powered Healthcare Web Platform.

В корне проекта лежат два файла:
1. CLAUDE.md — правила работы. Прочитай их.
2. SPECIFICATION.md — полное ТЗ на 3421 строку. Это твой источник истины.

Твоя задача сейчас — НЕ начинать кодить. Сначала ознакомься со спецификацией.

Сделай следующее:
1. Прочитай CLAUDE.md полностью
2. Прочитай SPECIFICATION.md целиком (можешь по частям — это около 160KB)
3. После прочтения дай мне резюме в таком формате:
   - Какой стек ты понял
   - Какие 3 сервиса будут в проекте и как они общаются
   - Какие основные модули в Java backend (по Spring Modulith)
   - Какая ключевая архитектурная идея для AI Service (про domain-agnostic)
   - Каков план Недели 1 по roadmap
   - Любые места в спеке, которые показались тебе неясными или противоречивыми

После твоего резюме мы вместе начнём с Дня 1 Недели 1 из roadmap.
Не пиши никакого кода до моего подтверждения.
```

---

## Шаг 2: После того как Claude Code вернёт резюме

Проверь что он правильно понял:
- ✅ Стек назвал точно как в спеке (Java 21, Spring Boot 3.3, Python 3.11, FastAPI, React 18, PostgreSQL 16, MLflow)
- ✅ Сказал про 3 сервиса: backend (Java), ai-service (Python), frontend (React) + про общение через REST + JWT
- ✅ Назвал модули backend: auth, users, appointments, ai, admin, shared
- ✅ Понял что domain-agnostic = Strategy Pattern с интерфейсом MedicalDomain, и что Cardiology — это первая реализация
- ✅ Описал Неделю 1: Docker Compose, Spring Boot init, Auth модуль, frontend setup, FastAPI init, обучение baseline ML модели

**Если он что-то понял неправильно** — поправь его явно и попроси перечитать соответствующий раздел.

**Если есть вопросы по неясностям** — ответь на них прежде чем кодить.

---

## Шаг 3: Запускаем Неделю 1 День 1

```
Отлично, ты всё понял. Начнём с Недели 1, День 1 из SPECIFICATION.md §16.

Задача дня: setup репозитория и Docker Compose каркас.

План:
1. Создай корневую структуру:
   - backend/ (пустая, со скелетом Spring Boot 3.3 через Spring Initializr эквивалент)
   - ai-service/ (пустая, со скелетом FastAPI + pyproject.toml)
   - frontend/ (пустая, со скелетом Vite React TS)
   - docker-compose.yml в корне
   - .env.example в корне
   - .gitignore (правильный для Java + Python + Node)
   - README.md с инструкциями по запуску

2. docker-compose.yml: postgres, redis, minio, mlflow, плюс заглушки для backend/ai-service/frontend (build context указан, но Dockerfile'ы пока минимальные — просто чтобы compose был валидным)

3. Backend pom.xml с зависимостями из §3.1, главный класс Application.java, application.yml из §6.4

4. AI service pyproject.toml со списком из §7.7, app/main.py с FastAPI заглушкой и /health эндпоинтом

5. Frontend package.json (через npm create vite@latest), tailwind config, shadcn/ui init

6. Корневой README.md с инструкцией: `docker compose up`, как запускать по отдельности.

После этого:
- Запусти `docker compose config` чтобы убедиться что compose валидный
- Сделай commit: "chore: initial project scaffolding"
- Покажи мне tree структуры проекта (`tree -L 3 -I 'node_modules|target|venv|.git'`)

Не реализуй пока никакой бизнес-логики — только каркас.
```

---

## Шаг 4 и далее: Идём по roadmap

После каждого дня roadmap:

```
Готово. Сделай git status и покажи что изменилось.
Что дальше — переходим к [День X, Неделя Y, см. §16 SPECIFICATION.md]
```

---

## 💡 Принципы работы с Claude Code на этом проекте

### ✅ Делай
- **Дроби задачи на дни** из roadmap — не проси "сделай весь backend"
- **Ссылайся на разделы** SPECIFICATION.md по номеру (§6.2, §11.3 и т.д.) — Claude Code их найдёт
- **Запрашивай git diff и tree** после каждого этапа — контролируй
- **Просматривай каждый коммит** — не сливай "большие" изменения вслепую
- **Запускай тесты регулярно** — не накапливай долг
- **Останавливайся и репетируй демо** в конце каждой недели

### ❌ Не делай
- Не кидай "сделай всё по спеке" — потеряешь контроль
- Не игнорируй предупреждения — если Claude Code говорит "это не в спеке" — слушай
- Не правь код вручную параллельно с Claude Code — он не увидит твои правки и сломает
- Не меняй стек посреди проекта
- Не перезаписывай SPECIFICATION.md — это контракт. Если нужно изменить — обсуди с Claude Code и обнови оба файла

---

## 🔁 Восстановление контекста после паузы

Если возвращаешься к проекту через несколько дней:

```
Привет. Возвращаюсь к проекту healthcare-platform.

Сделай:
1. Прочитай CLAUDE.md и SPECIFICATION.md (актуальные версии)
2. Покажи git log --oneline -20 и расскажи где мы остановились
3. Найди в §16 SPECIFICATION.md следующий день/задачу по roadmap
4. Спроси меня готов ли я начинать или есть незакрытые хвосты

Не начинай кодить до моего подтверждения.
```

---

## 🆘 Если что-то пошло не так

**Claude Code пишет в неправильную папку:**
> Стой. Проверь CLAUDE.md и SPECIFICATION.md §6.1 — структура backend должна быть строго `kz.healthcare.platform.<module>.{api,application,domain,infrastructure}`. Откати свои изменения и переделай по спеке.

**Claude Code добавляет фичи которых нет в ТЗ:**
> Этого нет в SPECIFICATION.md. Удали и придерживайся спеки. Если считаешь что это нужно — сначала обсуди со мной и обнови SPECIFICATION.md.

**Claude Code меняет стек:**
> Стек зафиксирован в CLAUDE.md и §3 SPECIFICATION.md. Откатись к указанному.

**Claude Code "забыл" контекст в длинной сессии:**
> Перечитай CLAUDE.md и §X.Y SPECIFICATION.md, потом продолжай.

---

## 📦 Финальный чек-лист подготовки

Перед запуском Claude Code убедись что:

- [ ] У тебя установлен Claude Code (`npm install -g @anthropic-ai/claude-code`)
- [ ] Авторизация в Claude Code работает (есть подписка)
- [ ] Папка проекта создана и пустая
- [ ] `SPECIFICATION.md` скопирован в корень
- [ ] `CLAUDE.md` скопирован в корень
- [ ] `git init` сделан, первый коммит создан
- [ ] У тебя есть API ключи для LLM в AI service (Anthropic или OpenAI) — понадобятся со 2-й недели
- [ ] Docker и Docker Compose установлены
- [ ] Java 21, Python 3.11, Node 20 установлены локально (для запуска без Docker если нужно)
- [ ] Прочитал §16 SPECIFICATION.md (roadmap) — понимаешь общую картину

Удачи. 🚀
