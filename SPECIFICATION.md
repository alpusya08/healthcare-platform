# Technical Specification

# Development of an AI-Powered Healthcare Web Platform for Treatment Recommendations and Online Doctor Appointments

> **Версия:** 1.0
> **Тип проекта:** Дипломная работа (MVP)
> **Срок:** ~4 недели до защиты
> **Дата:** 2026-05-05

---

## 📑 Оглавление

1. [Описание проекта и цели](#1-описание-проекта-и-цели)
2. [Стратегия защиты и риторика](#2-стратегия-защиты)
3. [Технологический стек](#3-технологический-стек)
4. [Высокоуровневая архитектура](#4-высокоуровневая-архитектура)
5. [Роли и пользовательские сценарии (User Stories)](#5-роли-и-user-stories)
6. [Детальная архитектура Backend (Java)](#6-backend-java)
7. [Детальная архитектура AI Service (Python)](#7-ai-service-python)
8. [Frontend архитектура (React)](#8-frontend-react)
9. [База данных и схема](#9-база-данных)
10. [API контракты](#10-api-контракты)
11. [AI Flow и алгоритмы](#11-ai-flow)
12. [ML Pipeline и датасеты](#12-ml-pipeline)
13. [Безопасность и compliance](#13-безопасность)
14. [DevOps, Docker, CI/CD](#14-devops)
15. [Тестирование](#15-тестирование)
16. [Roadmap по неделям](#16-roadmap)
17. [Демо-сценарий для защиты](#17-демо-сценарий)
18. [FAQ для комиссии](#18-faq-для-комиссии)

---

## 1. Описание проекта и цели

### 1.1 Краткое описание

Веб-платформа, объединяющая пациентов, врачей и администраторов в единую экосистему медицинских услуг. Ключевой инновацией платформы является **AI-движок для первичной диагностики**, который проводит интеллектуальное анкетирование пациента, анализирует медицинские документы (снимки, заключения), формирует предварительный диагноз с уровнем уверенности, и передает структурированный отчет врачу перед приемом.

### 1.2 Бизнес-проблемы, которые решает платформа

1. **Проблема первичного приема** — врач тратит 15-20 минут на сбор анамнеза, который мог бы быть собран заранее
2. **Доступность медицины** — не все могут оперативно попасть к специалисту
3. **Самодиагностика по Google** — пациенты ищут симптомы в интернете и получают недостоверную информацию
4. **Отсутствие систематизированной обратной связи** в существующих AI-медицинских системах для улучшения диагностики

### 1.3 Ключевые цели проекта

**Основная цель:** Разработать веб-платформу с интегрированным AI-движком для предварительной диагностики и удобной системой записи к врачам.

**Подцели:**
- Реализовать **domain-agnostic AI-архитектуру**, способную работать с любой медицинской специализацией
- Создать **референсную имплементацию** для кардиологии (как одной из приоритетных областей в Казахстане по статистике ВОЗ)
- Разработать **feedback loop** для непрерывного улучшения ML-модели на основе оценок врачей
- Обеспечить **безопасность пациентов** через многоуровневые disclaimer'ы, triage-систему и финальный контроль врача

### 1.4 Scope MVP

**В скоупе (реализуется полностью):**
- ✅ Регистрация/авторизация пациентов, врачей, админов (JWT + Refresh)
- ✅ AI-анкетирование с follow-up вопросами на основе LLM
- ✅ Загрузка медицинских файлов (PDF, JPG, PNG, DICOM-preview)
- ✅ Real ML-модель для кардиологии (XGBoost на UCI + Kaggle датасетах)
- ✅ Triage system (routine/urgent/emergency)
- ✅ Confidence scoring с порогом
- ✅ Запись на прием с управлением расписанием врача
- ✅ Личный кабинет врача с AI-отчетами по пациентам
- ✅ Feedback loop (врач approve/reject AI-диагноз с комментарием)
- ✅ Сохранение feedback в БД для retraining
- ✅ Админ-панель (управление пользователями, специализациями, мониторинг)
- ✅ Audit log AI-решений

**В скоупе (минимально для демо, спроектировано полно):**
- 🔶 MLflow tracking (локальный сервер, демо на скриншотах)
- 🔶 Retraining pipeline (готовый скрипт, не активирован в демо для стабильности)
- 🔶 Видеосвязь (генерация Jitsi-ссылки, не embedded)
- 🔶 Domain registry (CardiologyDomain реализован, NeurologyDomain как stub для демонстрации расширяемости)

**Вне скоупа (отложено в Future Work):**
- ❌ Мобильные приложения (iOS/Android)
- ❌ Платежная система
- ❌ Интеграция с реальными медицинскими БД (МИС)
- ❌ Анализ DICOM-изображений нейросетью (только preview)
- ❌ Автоматический retraining по расписанию в production

---

## 2. Стратегия защиты

### 2.1 Главный нарратив

> "Мы разработали **универсальную AI-платформу для первичной медицинской диагностики и онлайн-записи к врачам**. Архитектура спроектирована как **domain-agnostic engine** с подключаемыми медицинскими специализациями. В рамках MVP реализована **референсная имплементация для кардиологии** — выбор обусловлен тем, что сердечно-сосудистые заболевания являются причиной смертности №1 в Казахстане. Архитектура позволяет добавить любую новую специализацию (неврология, дерматология, эндокринология) без изменения core-системы — только через добавление датасета и конфигурации домена."

### 2.2 Ответы на ожидаемые вопросы комиссии

**В: Это просто обертка над ChatGPT?**
**О:** Нет. У нас гибридная архитектура: основные диагностические решения принимает **классическая ML-модель** (XGBoost), обученная на открытых медицинских датасетах UCI Heart Disease и Kaggle Cardiovascular Disease. LLM используется как **интерфейсный слой** для трех задач: (1) парсинг свободного описания симптомов в структурированные признаки через NER, (2) генерация follow-up вопросов когда модели не хватает данных, (3) генерация объяснений в human-readable формате. Решение о диагнозе всегда принимает ML-модель.

**В: Откуда у вас данные? Кто разрешил использовать медицинские данные?**
**О:** Используются открытые анонимизированные датасеты UCI Heart Disease (Cleveland) и Kaggle Cardiovascular Disease Dataset. Это публичные наборы данных, разрешенные для академического использования. Для production-внедрения мы планируем заключать партнерства с клиниками с соблюдением требований по защите персональных данных.

**В: Как ИИ будет улучшаться?**
**О:** Реализован feedback loop: каждое предсказание ИИ оценивается врачом (approve/reject с комментарием), эта обратная связь сохраняется в `model_feedback` таблицу. Реализован retraining pipeline на базе MLflow: после накопления N feedback-записей модель переобучается с новыми данными, версионируется, и после валидации деплоится. В MVP retraining запускается вручную для стабильности демонстрации.

**В: Почему только кардиология?**
**О:** Это не ограничение, а сознательный выбор для MVP. Архитектура полностью domain-agnostic — новый домен подключается через реализацию интерфейса `MedicalDomain` (см. Strategy Pattern в коде). Кардиология выбрана как первая реализация по двум причинам: (1) статистика смертности в Казахстане, (2) наличие качественных открытых датасетов.

**В: Это безопасно? А если ИИ ошибется?**
**О:** Безопасность пациентов реализована на нескольких уровнях:
1. **Disclaimer-слой** — везде где показывается AI-результат, пациент видит "это не медицинский диагноз"
2. **Confidence threshold** — если уверенность модели < 60%, система говорит "недостаточно данных, нужна очная консультация"
3. **Triage system** — для emergency-симптомов (боль в груди + одышка) система немедленно рекомендует вызов скорой, минуя стандартный flow
4. **Врач — финальная инстанция** — никакой диагноз не выдается пациенту автоматически, врач всегда подтверждает или корректирует
5. **Audit log** — все решения ИИ логируются с версией модели для traceability

**В: Какие метрики у вашей модели?**
**О:** На датасете UCI Heart Disease после кросс-валидации модель показывает: Accuracy ~85-87%, Precision ~84%, Recall ~86%, F1 ~85%, ROC-AUC ~0.91. Все метрики и эксперименты трекаются в MLflow.

**В: Что с защитой персональных данных?**
**О:** Все медицинские данные шифруются at-rest (AES-256 в БД для чувствительных полей) и in-transit (HTTPS). Файлы хранятся в объектном хранилище с подписанными URL ограниченного действия. Пароли хешируются через BCrypt. JWT короткоживущие (15 мин) + Refresh токены. Audit log всех доступов к медицинским данным.

### 2.3 Что показываем на демо (порядок)

1. **Регистрация пациента → главный экран** (3 минуты)
2. **Клик на "AI Analysis" → анкетирование** (5 минут)
   - Описание проблемы
   - LLM генерирует 3-5 follow-up вопросов
   - Загрузка файла (например, ЭКГ-снимок)
   - Получение AI-отчета с диагнозом, confidence, рекомендациями
   - Предложение слотов к кардиологам
3. **Запись на ближайший слот** (1 минута)
4. **Логин как врач → видим AI-отчет по пациенту** (3 минуты)
   - Полный отчет с symptom-extracted features
   - Approve / Reject с комментарием
5. **Логин как админ → MLflow → метрики модели** (3 минуты)
6. **Показ архитектуры** на схеме — domain-agnostic, расширяемость (5 минут)

---

## 3. Технологический стек

### 3.1 Backend (Java)

| Компонент | Технология | Версия | Обоснование |
|-----------|-----------|--------|-------------|
| Язык | Java | 21 LTS | Современный LTS, records, pattern matching |
| Framework | Spring Boot | 3.3.x | Индустриальный стандарт |
| Архитектура | Spring Modulith | 1.2.x | Модульная архитектура без микросервисной сложности |
| Security | Spring Security + JWT (jjwt) | 6.3.x / 0.12.x | Industry standard |
| ORM | Spring Data JPA + Hibernate | 6.5.x | Стандарт для PostgreSQL |
| Миграции | Flyway | 10.x | DB version control |
| Validation | Jakarta Validation | 3.0 | Декларативная валидация |
| Mapping | MapStruct | 1.6.x | Compile-time, без reflection overhead |
| Boilerplate | Lombok | 1.18.x | Меньше кода |
| API Docs | SpringDoc OpenAPI | 2.6.x | Auto-generated Swagger |
| Testing | JUnit 5 + Mockito + Testcontainers | last | Unit + integration |
| Build | Maven | 3.9.x | Стандарт |
| Cache/Queue | Redis | 7.x | Сессии, rate limiting |
| Storage | MinIO (S3-compatible) | latest | Локально, в проде — AWS S3 |
| DB | PostgreSQL | 16.x | Основная БД |

### 3.2 AI Service (Python)

| Компонент | Технология | Версия | Обоснование |
|-----------|-----------|--------|-------------|
| Язык | Python | 3.11 | Стабильная, async-friendly |
| Framework | FastAPI | 0.115.x | Async, OpenAPI, Pydantic |
| Validation | Pydantic | 2.9.x | Type-safe DTOs |
| ML Framework | scikit-learn + XGBoost | 1.5.x / 2.1.x | Industry standard для tabular |
| LLM Client | Anthropic SDK / OpenAI SDK | latest | Гибкость провайдера |
| ML Tracking | MLflow | 2.16.x | Эксперименты + Model Registry |
| Vector DB | Qdrant (опционально для RAG) | latest | Для расширения с RAG в future |
| HTTP Client | httpx | 0.27.x | Async-first |
| Config | Pydantic Settings | latest | Type-safe env config |
| ORM (для feedback БД) | SQLAlchemy 2 + asyncpg | 2.0.x | Async ORM |
| Migrations | Alembic | 1.13.x | Стандарт для SQLAlchemy |
| Testing | pytest + pytest-asyncio | 8.x | Стандарт |
| Linting | ruff + black + mypy | latest | Качество кода |
| Files | python-magic, Pillow, pypdf | latest | Парсинг файлов |

### 3.3 Frontend (React)

| Компонент | Технология | Версия | Обоснование |
|-----------|-----------|--------|-------------|
| Build Tool | Vite | 5.x | Быстрый dev experience |
| Framework | React | 18.x | Стандарт |
| Язык | TypeScript | 5.5.x | Type safety |
| Routing | React Router | 6.x | Стандарт |
| Server State | TanStack Query | 5.x | Кэширование, рефетч |
| Client State | Zustand | 5.x | Минималистичный state |
| Forms | React Hook Form + Zod | 7.x / 3.x | Валидация end-to-end |
| Styling | Tailwind CSS | 3.4.x | Utility-first |
| UI Kit | shadcn/ui | latest | Качественные компоненты |
| HTTP | Axios | 1.x | Interceptors для auth |
| WebSocket | native WebSocket / socket.io-client | - | Для real-time AI чата |
| Icons | lucide-react | latest | Современная библиотека |
| Charts | Recharts | latest | Для админки и врача |
| Date | date-fns | 4.x | Лучше чем moment |
| Testing | Vitest + React Testing Library | latest | Стандарт |

### 3.4 Infrastructure

| Компонент | Технология |
|-----------|-----------|
| Containerization | Docker + Docker Compose |
| Reverse Proxy | Nginx (для prod) |
| CI/CD | GitHub Actions |
| Secrets | .env файлы (для MVP) + Spring Cloud Config (опционально) |
| Логирование | Logback (Java) + structlog (Python) → JSON → Loki/ELK (опционально) |
| Мониторинг | Spring Actuator + Prometheus + Grafana (опционально) |

---

## 4. Высокоуровневая архитектура

### 4.1 Архитектурная диаграмма

```
┌──────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                │
│  ┌─────────────────┬─────────────────┬─────────────────┐            │
│  │ Patient Portal  │ Doctor Portal   │ Admin Portal    │            │
│  │ - AI Analysis   │ - Appointments  │ - Users mgmt    │            │
│  │ - Appointments  │ - AI Reports    │ - ML monitoring │            │
│  │ - Profile       │ - Schedule      │ - Specializ.    │            │
│  └─────────────────┴─────────────────┴─────────────────┘            │
└─────────────────────────────┬────────────────────────────────────────┘
                              │ HTTPS (REST + WebSocket)
                              │ JWT Bearer
┌─────────────────────────────▼────────────────────────────────────────┐
│              BACKEND API GATEWAY (Java 21 + Spring Boot)             │
│                    [Spring Modulith - модули]                        │
│                                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐ │
│  │  Auth    │ │  Users   │ │Appointmt │ │ AI       │ │ Admin     │ │
│  │  Module  │ │  Module  │ │ Module   │ │ Gateway  │ │ Module    │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └───────────┘ │
│                                                                      │
│  Cross-cutting: Security | Validation | Audit | Exception | Logging │
└──────┬─────────────────────────────────────────────────────┬────────┘
       │                                                     │
       │ JDBC                                                │ HTTP/REST
       ▼                                                     ▼
┌─────────────────┐  ┌──────────┐  ┌────────┐   ┌──────────────────────┐
│  PostgreSQL 16  │  │ Redis 7  │  │ MinIO  │   │  AI SERVICE          │
│ (main DB)       │  │ (cache)  │  │ (files)│   │  (Python+FastAPI)    │
└─────────────────┘  └──────────┘  └────────┘   │                      │
                                                 │ ┌──────────────────┐ │
                                                 │ │ Diagnostic       │ │
                                                 │ │ Engine (core)    │ │
                                                 │ └──────────────────┘ │
                                                 │ ┌──────────────────┐ │
                                                 │ │ Domain Strategy  │ │
                                                 │ │ ├ Cardiology  ✅ │ │
                                                 │ │ └ Future...   🔜 │ │
                                                 │ └──────────────────┘ │
                                                 │ ┌──────────────────┐ │
                                                 │ │ LLM Adapter      │ │
                                                 │ │ (Claude/GPT)     │ │
                                                 │ └──────────────────┘ │
                                                 │ ┌──────────────────┐ │
                                                 │ │ ML Models        │ │
                                                 │ │ (XGBoost via     │ │
                                                 │ │  MLflow Registry)│ │
                                                 │ └──────────────────┘ │
                                                 │ ┌──────────────────┐ │
                                                 │ │ Feedback Loop    │ │
                                                 │ │ + Retrain Script │ │
                                                 │ └──────────────────┘ │
                                                 └──────────────────────┘
                                                          │
                                                          ▼
                                                 ┌──────────────────┐
                                                 │ MLflow Tracking  │
                                                 │ Server (local)   │
                                                 └──────────────────┘
```

### 4.2 Принципы и паттерны

**Backend (Java):**
- **Hexagonal Architecture (Ports & Adapters)** — domain независим от инфраструктуры
- **Domain-Driven Design (light)** — bounded contexts через Spring Modulith
- **CQRS-light** — отдельные модели для команд и запросов где это оправдано (отчеты, dashboards)
- **Repository Pattern** — через Spring Data JPA
- **Strategy Pattern** — для типов уведомлений, AI-провайдеров
- **Builder Pattern** — для DTO и доменных объектов
- **DTO Pattern** — никогда не отдаем JPA-сущности наружу
- **MapStruct** — для маппинга DTO ↔ Entity
- **Specification Pattern** — для динамических фильтров (поиск врачей)
- **Async через @Async + ThreadPoolTaskExecutor** — для тяжелых операций
- **Idempotency keys** — для критичных операций (создание appointment)

**AI Service (Python):**
- **Clean Architecture** — domain / application / infrastructure / presentation
- **Strategy Pattern** — для медицинских доменов (CardiologyDomain, NeurologyDomain...)
- **Factory Pattern** — для создания доменов и LLM-клиентов
- **Adapter Pattern** — для абстракции над LLM провайдерами (Claude, OpenAI взаимозаменяемы)
- **Repository Pattern** — для работы с feedback БД и MLflow
- **Dependency Injection** — через FastAPI Depends + custom container
- **Pipeline Pattern** — для AI-flow (extract → predict → generate → recommend)
- **Async/await везде** — для I/O bound операций (LLM calls, DB)

**Frontend (React):**
- **Feature-Sliced Design** — иерархия app/pages/widgets/features/entities/shared
- **Container/Presenter** — разделение логики и UI
- **Custom Hooks** — для переиспользуемой логики
- **Composition over Inheritance**
- **Atomic Design** для UI-компонентов

### 4.3 Принципы кода (общие)

- **SOLID**
- **KISS** — простота важнее cleverness
- **DRY**, но без over-engineering (правило трех)
- **YAGNI** — не делаем функции "на будущее"
- **Fail fast** — валидация на входе, явные exceptions
- **Immutability where possible** — records в Java, Pydantic frozen, readonly в TS
- **Explicit error handling** — никаких глотаний исключений
- **Logging at boundaries** — вход/выход API, внешние вызовы
- **Naming matters** — длинные понятные имена > короткие криптичные

---

## 5. Роли и User Stories

### 5.1 Роли в системе

| Роль | Описание |
|------|----------|
| `PATIENT` | Пациент — основной пользователь, записывается на прием, проходит AI-анализ |
| `DOCTOR` | Врач — управляет расписанием, видит пациентов, дает feedback на AI-диагнозы |
| `ADMIN` | Администратор — управляет пользователями, специализациями, мониторит ML |

### 5.2 User Stories — PATIENT

**US-P-01: Регистрация**
- Как пациент, я хочу зарегистрироваться по email + пароль + ФИО + дата рождения + пол + телефон, чтобы пользоваться платформой.
- AC: валидация email, пароль ≥8 символов с цифрой и спецсимволом, проверка на существующий email, отправка confirmation email (опционально для MVP).

**US-P-02: Авторизация**
- Как пациент, я хочу войти по email + паролю и получить access (15 мин) + refresh (30 дней) токены.
- AC: rate limiting 5 попыток / 5 минут на IP, lockout аккаунта после 10 неудачных попыток на 30 минут.

**US-P-03: Главный экран**
- Как пациент, я вижу яркую кнопку **"AI Analysis"**, мои предстоящие приемы, историю приемов, последние AI-отчеты.

**US-P-04: AI Analysis — стартовая анкета**
- Как пациент, я нажимаю "AI Analysis", вижу вступительный disclaimer, соглашаюсь с обработкой данных, ввожу базовое описание проблемы свободным текстом (например, "болит грудь, тяжело дышать после нагрузки").

**US-P-05: AI Analysis — динамические вопросы**
- Как пациент, я отвечаю на 3-7 follow-up вопросов, сгенерированных ИИ на основе моего описания. Вопросы могут быть с вариантами ответа (single/multi choice), числовыми (возраст, давление), да/нет, или свободным текстом.
- AC: вопросы генерируются по одному, диалоговый режим. Я могу вернуться и изменить ответ.

**US-P-06: AI Analysis — загрузка файлов**
- Как пациент, я могу загрузить медицинские документы: PDF (заключения), JPG/PNG (снимки, ЭКГ), общим размером до 50MB. ИИ извлекает текст из PDF и описание изображений.
- AC: drag-and-drop, прогресс загрузки, превью файлов, удаление.

**US-P-07: AI Analysis — получение отчета**
- Как пациент, я получаю отчет: краткое описание проблемы (что это может быть), уровень срочности (routine/urgent/emergency), confidence score, список рекомендаций, список ближайших слотов к подходящим врачам.
- AC: на каждом экране — disclaimer "это не диагноз". Если confidence < 60% — явное сообщение "недостаточно данных, требуется очная консультация". Если emergency — баннер "немедленно вызовите скорую (103)" сверху.

**US-P-08: Запись на прием**
- Как пациент, я могу записаться на прием к рекомендованному врачу или искать врача по специализации/ФИО/рейтингу. Выбираю слот (онлайн/офлайн), указываю причину визита (предзаполнено из AI-отчета).
- AC: слот блокируется на 5 минут на время оформления, после оформления — подтверждение, для онлайн — генерируется Jitsi-ссылка.

**US-P-09: Управление приемами**
- Как пациент, я вижу список своих приемов (предстоящие, прошедшие, отмененные), могу отменить за ≥24 часа.

**US-P-10: Профиль**
- Как пациент, я могу редактировать свои данные, видеть историю AI-отчетов и приемов.

### 5.3 User Stories — DOCTOR

**US-D-01: Регистрация и верификация**
- Врач регистрируется с указанием специализации, опыта, лицензии. Аккаунт активируется админом после верификации.

**US-D-02: Управление расписанием**
- Как врач, я задаю свое расписание: дни недели, временные слоты, длительность приема (30/45/60 мин), типы (онлайн/офлайн), исключения (отпуск, болезнь).
- AC: слоты автогенерируются на 4 недели вперед, можно вручную блокировать конкретные слоты.

**US-D-03: Список приемов**
- Как врач, я вижу календарь и список приемов (сегодня, неделя, месяц).

**US-D-04: AI-отчет по пациенту**
- Как врач, перед приемом я вижу AI-отчет пациента: симптомы, ответы на вопросы, загруженные файлы, предсказание модели с confidence, объяснение.
- AC: версия модели и timestamp указаны для traceability.

**US-D-05: Feedback на AI-диагноз**
- Как врач, после приема я могу: ✅ Approve диагноз ИИ (с опциональным комментарием), ❌ Reject (обязательный комментарий и реальный диагноз), 🔄 Partially correct (комментарий + корректировка).
- AC: feedback сохраняется с привязкой к версии модели; врач может изменить feedback в течение 24 часов.

**US-D-06: Профиль и статистика**
- Как врач, я вижу свою статистику: количество приемов, рейтинг от пациентов (опционально для MVP), accuracy моих feedback'ов.

### 5.4 User Stories — ADMIN

**US-A-01: Управление пользователями**
- Как админ, я могу: видеть список всех пользователей с фильтрами, активировать/деактивировать аккаунт врача после верификации лицензии, банить пользователей за нарушения.

**US-A-02: Управление специализациями**
- Как админ, я могу добавлять/редактировать медицинские специализации (CRUD).

**US-A-03: ML Monitoring Dashboard**
- Как админ, я вижу: текущую активную версию модели, метрики (accuracy, precision, recall, F1), количество предсказаний за период, распределение confidence, количество approved/rejected feedback'ов.
- AC: данные подтягиваются из MLflow API.

**US-A-04: Audit Log**
- Как админ, я могу искать в audit log по пользователю, дате, типу действия (для расследований).

**US-A-05: Запуск Retraining**
- Как админ, я могу вручную запустить retraining pipeline (или просмотреть последний запуск).

---

## 6. Backend (Java)

### 6.1 Структура проекта (Spring Modulith)

```
backend/
├── pom.xml
├── Dockerfile
├── src/main/java/kz/healthcare/platform/
│   ├── HealthcarePlatformApplication.java
│   │
│   ├── auth/                          ← Модуль аутентификации
│   │   ├── api/                       ← Public API модуля
│   │   │   ├── AuthController.java
│   │   │   └── dto/
│   │   │       ├── LoginRequest.java
│   │   │       ├── RegisterRequest.java
│   │   │       ├── TokenResponse.java
│   │   │       └── RefreshTokenRequest.java
│   │   ├── application/               ← Application layer (use cases)
│   │   │   ├── AuthService.java
│   │   │   ├── JwtService.java
│   │   │   └── RefreshTokenService.java
│   │   ├── domain/
│   │   │   ├── RefreshToken.java
│   │   │   └── exceptions/
│   │   │       ├── InvalidCredentialsException.java
│   │   │       └── TokenExpiredException.java
│   │   ├── infrastructure/
│   │   │   ├── RefreshTokenRepository.java
│   │   │   ├── JwtAuthenticationFilter.java
│   │   │   └── SecurityConfig.java
│   │   └── package-info.java          ← @ApplicationModule
│   │
│   ├── users/                         ← Модуль пользователей
│   │   ├── api/
│   │   │   ├── UserController.java
│   │   │   ├── PatientController.java
│   │   │   ├── DoctorController.java
│   │   │   └── dto/
│   │   ├── application/
│   │   │   ├── UserService.java
│   │   │   ├── PatientService.java
│   │   │   └── DoctorService.java
│   │   ├── domain/
│   │   │   ├── User.java              ← Aggregate root
│   │   │   ├── Patient.java
│   │   │   ├── Doctor.java
│   │   │   ├── Role.java              ← enum
│   │   │   ├── Gender.java
│   │   │   └── Specialization.java
│   │   ├── infrastructure/
│   │   │   ├── UserRepository.java
│   │   │   ├── DoctorRepository.java
│   │   │   ├── PatientRepository.java
│   │   │   └── SpecializationRepository.java
│   │   └── package-info.java
│   │
│   ├── appointments/                  ← Модуль записей
│   │   ├── api/
│   │   │   ├── AppointmentController.java
│   │   │   ├── ScheduleController.java
│   │   │   └── dto/
│   │   ├── application/
│   │   │   ├── AppointmentService.java
│   │   │   ├── ScheduleService.java
│   │   │   ├── SlotGenerator.java
│   │   │   └── AppointmentCommandHandler.java
│   │   ├── domain/
│   │   │   ├── Appointment.java
│   │   │   ├── AppointmentStatus.java
│   │   │   ├── AppointmentType.java   ← ONLINE / OFFLINE
│   │   │   ├── Schedule.java
│   │   │   ├── TimeSlot.java
│   │   │   └── exceptions/
│   │   │       ├── SlotUnavailableException.java
│   │   │       └── AppointmentNotCancellableException.java
│   │   ├── infrastructure/
│   │   │   ├── AppointmentRepository.java
│   │   │   ├── ScheduleRepository.java
│   │   │   ├── TimeSlotRepository.java
│   │   │   └── JitsiLinkGenerator.java
│   │   └── package-info.java
│   │
│   ├── ai/                            ← AI Gateway модуль
│   │   ├── api/
│   │   │   ├── AiAnalysisController.java
│   │   │   └── dto/
│   │   │       ├── StartAnalysisRequest.java
│   │   │       ├── AnswerQuestionRequest.java
│   │   │       ├── AnalysisReportResponse.java
│   │   │       └── DoctorFeedbackRequest.java
│   │   ├── application/
│   │   │   ├── AiAnalysisService.java
│   │   │   ├── AiServiceClient.java   ← клиент к Python service
│   │   │   └── FileProcessingService.java
│   │   ├── domain/
│   │   │   ├── AnalysisSession.java
│   │   │   ├── AnalysisStatus.java
│   │   │   ├── DoctorFeedback.java
│   │   │   ├── FeedbackVerdict.java
│   │   │   └── UploadedFile.java
│   │   ├── infrastructure/
│   │   │   ├── AnalysisSessionRepository.java
│   │   │   ├── DoctorFeedbackRepository.java
│   │   │   ├── AiServiceHttpClient.java
│   │   │   └── MinioFileStorage.java
│   │   └── package-info.java
│   │
│   ├── admin/                         ← Админ модуль
│   │   ├── api/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── package-info.java
│   │
│   ├── shared/                        ← Cross-cutting
│   │   ├── audit/
│   │   │   ├── AuditLog.java
│   │   │   ├── AuditService.java
│   │   │   └── AuditAspect.java       ← AOP
│   │   ├── exception/
│   │   │   ├── GlobalExceptionHandler.java
│   │   │   ├── BusinessException.java
│   │   │   ├── NotFoundException.java
│   │   │   └── ErrorResponse.java
│   │   ├── security/
│   │   │   ├── CurrentUser.java       ← аннотация
│   │   │   ├── CurrentUserResolver.java
│   │   │   └── SecurityUtils.java
│   │   ├── config/
│   │   │   ├── OpenApiConfig.java
│   │   │   ├── AsyncConfig.java
│   │   │   ├── RedisConfig.java
│   │   │   ├── MinioConfig.java
│   │   │   └── CorsConfig.java
│   │   └── util/
│   │       ├── DateUtils.java
│   │       └── PaginationUtils.java
│   │
│   └── common/                        ← Общие классы
│       ├── BaseEntity.java            ← @MappedSuperclass with id, createdAt, updatedAt
│       ├── PageResponse.java
│       └── ApiResponse.java
│
├── src/main/resources/
│   ├── application.yml
│   ├── application-dev.yml
│   ├── application-prod.yml
│   ├── application-test.yml
│   ├── db/migration/                  ← Flyway migrations
│   │   ├── V1__init_schema.sql
│   │   ├── V2__create_users_tables.sql
│   │   ├── V3__create_appointments_tables.sql
│   │   ├── V4__create_ai_tables.sql
│   │   ├── V5__create_audit_log.sql
│   │   └── V6__seed_specializations.sql
│   └── logback-spring.xml
│
└── src/test/java/kz/healthcare/platform/
    ├── auth/
    ├── users/
    ├── appointments/
    ├── ai/
    └── shared/
        └── IntegrationTestBase.java   ← Testcontainers
```

### 6.2 Ключевые конвенции и правила

**Именование:**
- Сущности: `User`, `Doctor`, `Appointment` (singular, PascalCase)
- DTO: `*Request`, `*Response`, никогда не возвращаем Entity наружу
- Сервисы: `*Service` (UserService, AuthService)
- Repository: `*Repository`
- Exception: `*Exception` с понятным именем
- Контроллеры: `*Controller`, эндпоинты в формате `/api/v1/{resource}`

**Слои:**
- `api/` — controllers + DTO. Только маппинг и валидация. Никакой бизнес-логики.
- `application/` — use cases, оркестрация. Транзакции здесь.
- `domain/` — сущности, value objects, доменные исключения. Pure Java.
- `infrastructure/` — JPA repositories, внешние клиенты, конфиги.

**Транзакции:**
- `@Transactional` только на уровне `application/` сервисов
- `readOnly = true` для запросов
- Никогда не вызываем external API внутри транзакции

**Exceptions:**
- Все доменные ошибки наследуются от `BusinessException`
- `GlobalExceptionHandler` (через `@RestControllerAdvice`) маппит их в HTTP-коды с единой структурой `ErrorResponse { errorCode, message, timestamp, path, details? }`

**Validation:**
- Все DTO имеют `@Valid` в контроллере
- Использовать Jakarta Validation: `@NotBlank`, `@Email`, `@Size`, кастомные `@ValidPassword`, `@AdultAge`

**Logging:**
- SLF4J через `@Slf4j` (Lombok)
- Уровни: ERROR (исключения), WARN (бизнес-аномалии), INFO (важные события: login, appointment created), DEBUG (детали)
- Структурированные логи в JSON в prod
- MDC: traceId, userId, requestId

**Security:**
- Все эндпоинты by default `authenticated()`, явные `permitAll()` для login/register
- Method-level: `@PreAuthorize("hasRole('DOCTOR')")` где нужно
- `@CurrentUser User user` — кастомный resolver для получения текущего пользователя
- CORS: разрешаем только frontend origin

**Audit:**
- Все мутирующие операции с медицинскими данными логируются через `@Auditable("ACTION_NAME")` AOP-аннотацию

### 6.3 Пример кода: AppointmentService

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final TimeSlotRepository timeSlotRepository;
    private final DoctorRepository doctorRepository;
    private final JitsiLinkGenerator jitsiLinkGenerator;
    private final AuditService auditService;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    @Auditable("APPOINTMENT_CREATED")
    public AppointmentResponse createAppointment(
            CreateAppointmentRequest request,
            UUID patientId
    ) {
        log.info("Creating appointment for patient={}, slot={}", patientId, request.slotId());

        TimeSlot slot = timeSlotRepository.findByIdForUpdate(request.slotId())
                .orElseThrow(() -> new NotFoundException("Slot not found"));

        if (!slot.isAvailable()) {
            throw new SlotUnavailableException("Slot is no longer available");
        }

        Appointment appointment = Appointment.builder()
                .patientId(patientId)
                .doctorId(slot.getDoctorId())
                .timeSlot(slot)
                .type(request.type())
                .reason(request.reason())
                .aiSessionId(request.aiSessionId())  // optional, link to AI report
                .status(AppointmentStatus.SCHEDULED)
                .build();

        if (request.type() == AppointmentType.ONLINE) {
            appointment.setMeetingLink(jitsiLinkGenerator.generate(appointment.getId()));
        }

        slot.book();
        Appointment saved = appointmentRepository.save(appointment);

        eventPublisher.publishEvent(new AppointmentCreatedEvent(saved.getId()));

        return AppointmentMapper.toResponse(saved);
    }
}
```

### 6.4 application.yml (пример)

```yaml
spring:
  application:
    name: healthcare-platform-backend
  datasource:
    url: ${DB_URL:jdbc:postgresql://localhost:5432/healthcare}
    username: ${DB_USER:healthcare}
    password: ${DB_PASS:secret}
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        format_sql: true
        jdbc.batch_size: 50
  flyway:
    enabled: true
    locations: classpath:db/migration
  data:
    redis:
      host: ${REDIS_HOST:localhost}
      port: 6379

server:
  port: 8080
  error:
    include-message: always
    include-binding-errors: always

app:
  jwt:
    secret: ${JWT_SECRET:changeme-very-long-secret-key-256-bits}
    access-token-ttl: PT15M
    refresh-token-ttl: P30D
  ai-service:
    base-url: ${AI_SERVICE_URL:http://localhost:8000}
    timeout: PT60S
  storage:
    minio:
      endpoint: ${MINIO_ENDPOINT:http://localhost:9000}
      access-key: ${MINIO_ACCESS_KEY:minioadmin}
      secret-key: ${MINIO_SECRET_KEY:minioadmin}
      bucket: medical-files
  cors:
    allowed-origins: http://localhost:5173,https://yourdomain.kz

logging:
  level:
    root: INFO
    kz.healthcare: DEBUG

management:
  endpoints:
    web.exposure.include: health,info,metrics,prometheus
```

---

## 7. AI Service (Python)

### 7.1 Структура проекта (Clean Architecture)

```
ai-service/
├── pyproject.toml
├── Dockerfile
├── alembic.ini
├── README.md
│
├── app/
│   ├── __init__.py
│   ├── main.py                        ← FastAPI entry point
│   ├── config.py                      ← Pydantic Settings
│   │
│   ├── api/                           ← Presentation Layer
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── router.py
│   │   │   ├── endpoints/
│   │   │   │   ├── analysis.py        ← /analyze, /sessions/{id}/answer
│   │   │   │   ├── feedback.py        ← /feedback
│   │   │   │   ├── files.py           ← /files/process
│   │   │   │   └── health.py
│   │   │   └── schemas/               ← Pydantic DTOs
│   │   │       ├── analysis.py
│   │   │       ├── feedback.py
│   │   │       └── common.py
│   │   └── deps.py                    ← FastAPI dependencies
│   │
│   ├── core/                          ← Domain Layer (бизнес-сущности)
│   │   ├── __init__.py
│   │   ├── entities/
│   │   │   ├── analysis_session.py
│   │   │   ├── question.py
│   │   │   ├── diagnosis.py
│   │   │   ├── medical_features.py
│   │   │   └── feedback.py
│   │   ├── enums.py                   ← TriageLevel, QuestionType, etc.
│   │   ├── exceptions.py
│   │   └── interfaces/                ← Ports (ABCs)
│   │       ├── llm_provider.py
│   │       ├── ml_predictor.py
│   │       ├── domain_strategy.py     ← MedicalDomain interface
│   │       ├── session_repository.py
│   │       └── feedback_repository.py
│   │
│   ├── application/                   ← Application Layer (use cases)
│   │   ├── __init__.py
│   │   ├── use_cases/
│   │   │   ├── start_analysis.py
│   │   │   ├── answer_question.py
│   │   │   ├── generate_report.py
│   │   │   ├── process_file.py
│   │   │   └── save_feedback.py
│   │   ├── pipelines/
│   │   │   ├── diagnostic_pipeline.py ← orchestrator
│   │   │   ├── feature_extractor.py
│   │   │   ├── question_generator.py
│   │   │   ├── triage_classifier.py
│   │   │   └── recommendation_generator.py
│   │   └── services/
│   │       ├── analysis_service.py
│   │       └── feedback_service.py
│   │
│   ├── domains/                       ← Medical Domain Strategies
│   │   ├── __init__.py
│   │   ├── base.py                    ← BaseMedicalDomain (abstract)
│   │   ├── registry.py                ← DomainRegistry (Factory)
│   │   ├── cardiology/
│   │   │   ├── __init__.py
│   │   │   ├── domain.py              ← CardiologyDomain
│   │   │   ├── features.py            ← признаки (age, chol, trestbps, etc.)
│   │   │   ├── questions.py           ← question templates
│   │   │   ├── triage_rules.py        ← emergency rules
│   │   │   ├── prompts.py             ← LLM prompts для кардиологии
│   │   │   └── model_card.md          ← документация модели
│   │   └── neurology/                 ← STUB для демонстрации расширяемости
│   │       ├── __init__.py
│   │       └── domain.py              ← raises NotImplementedError для MVP
│   │
│   ├── infrastructure/                ← Infrastructure Layer (Adapters)
│   │   ├── __init__.py
│   │   ├── llm/
│   │   │   ├── claude_client.py       ← Anthropic SDK wrapper
│   │   │   ├── openai_client.py       ← OpenAI SDK wrapper (fallback)
│   │   │   └── factory.py
│   │   ├── ml/
│   │   │   ├── mlflow_client.py
│   │   │   ├── model_loader.py        ← загружает модели из MLflow Registry
│   │   │   └── predictors/
│   │   │       └── cardiology_predictor.py
│   │   ├── persistence/
│   │   │   ├── database.py            ← SQLAlchemy async engine
│   │   │   ├── models/                ← ORM models
│   │   │   │   ├── analysis_session.py
│   │   │   │   └── feedback.py
│   │   │   └── repositories/
│   │   │       ├── session_repo.py
│   │   │       └── feedback_repo.py
│   │   ├── files/
│   │   │   ├── pdf_extractor.py       ← pypdf
│   │   │   ├── image_processor.py     ← Pillow + OCR (опц.)
│   │   │   └── minio_client.py
│   │   └── auth/
│   │       └── jwt_validator.py       ← валидирует токены от Java backend
│   │
│   ├── ml/                            ← ML Training & Pipeline
│   │   ├── __init__.py
│   │   ├── train_cardiology.py        ← основной training script
│   │   ├── retrain.py                 ← retraining с feedback
│   │   ├── data/
│   │   │   ├── loader.py              ← load UCI/Kaggle
│   │   │   ├── preprocessor.py        ← cleaning, encoding, scaling
│   │   │   └── augment.py             ← merge + harmonize datasets
│   │   ├── features/
│   │   │   └── cardiology_features.py
│   │   ├── models/
│   │   │   └── xgboost_classifier.py
│   │   └── evaluation/
│   │       ├── metrics.py             ← accuracy, precision, recall, F1, ROC-AUC
│   │       └── reports.py
│   │
│   └── utils/
│       ├── logger.py                  ← structlog setup
│       ├── correlation.py             ← request_id middleware
│       └── disclaimers.py             ← centralized disclaimer text
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
├── notebooks/                         ← для исследования и презентации
│   ├── 01_data_exploration.ipynb
│   ├── 02_model_training.ipynb
│   └── 03_metrics_analysis.ipynb
│
├── data/                              ← gitignored, локально
│   ├── raw/                           ← UCI, Kaggle CSV
│   ├── processed/
│   └── README.md                      ← как скачать датасеты
│
└── scripts/
    ├── download_datasets.py
    ├── start_mlflow.sh
    └── seed_test_model.py
```

### 7.2 Domain-Agnostic Architecture (ключевая фича для защиты)

**Интерфейс `MedicalDomain` (Strategy Pattern):**

```python
# core/interfaces/domain_strategy.py
from abc import ABC, abstractmethod
from typing import List, Optional
from app.core.entities import (
    MedicalFeatures, Question, Diagnosis, AnalysisSession
)

class MedicalDomain(ABC):
    """
    Базовый интерфейс для медицинской специализации.
    Каждая специализация (кардиология, неврология...) реализует этот интерфейс.
    """

    @property
    @abstractmethod
    def code(self) -> str:
        """Уникальный код домена, например 'cardiology'"""

    @property
    @abstractmethod
    def display_name(self) -> str:
        """Человекочитаемое название"""

    @property
    @abstractmethod
    def required_features(self) -> List[str]:
        """Список признаков, необходимых модели для предсказания"""

    @abstractmethod
    async def extract_features(
        self,
        session: AnalysisSession
    ) -> MedicalFeatures:
        """Извлекает структурированные признаки из истории сессии"""

    @abstractmethod
    async def generate_next_question(
        self,
        session: AnalysisSession,
        partial_features: MedicalFeatures
    ) -> Optional[Question]:
        """Генерирует следующий вопрос. None — если данных достаточно."""

    @abstractmethod
    async def check_emergency(
        self,
        features: MedicalFeatures
    ) -> Optional[str]:
        """Проверяет triage-правила. Возвращает emergency message или None."""

    @abstractmethod
    async def predict(
        self,
        features: MedicalFeatures
    ) -> Diagnosis:
        """Делает предсказание через ML-модель + объяснение через LLM"""

    @abstractmethod
    def get_model_version(self) -> str:
        """Версия активной ML-модели для traceability"""
```

**Пример реализации `CardiologyDomain`:**

```python
# domains/cardiology/domain.py
from app.core.interfaces import MedicalDomain
from app.infrastructure.ml.predictors import CardiologyPredictor
from app.infrastructure.llm import LLMProvider
from .features import CARDIOLOGY_FEATURES
from .triage_rules import check_cardiology_emergency
from .prompts import (
    EXTRACTION_PROMPT,
    QUESTION_GENERATION_PROMPT,
    EXPLANATION_PROMPT,
)

class CardiologyDomain(MedicalDomain):
    code = "cardiology"
    display_name = "Кардиология"
    required_features = CARDIOLOGY_FEATURES  # ['age', 'sex', 'cp', 'trestbps', ...]

    def __init__(
        self,
        predictor: CardiologyPredictor,
        llm: LLMProvider,
    ):
        self._predictor = predictor
        self._llm = llm

    async def extract_features(self, session) -> MedicalFeatures:
        prompt = EXTRACTION_PROMPT.format(
            description=session.initial_description,
            qa_history=session.format_qa_history(),
            file_summaries=session.format_files_summary(),
        )
        response = await self._llm.complete_structured(
            prompt=prompt,
            schema=MedicalFeatures.cardiology_schema(),
        )
        return MedicalFeatures.from_llm_response(response)

    async def generate_next_question(self, session, partial_features):
        missing = self._find_missing_features(partial_features)
        if not missing:
            return None

        prompt = QUESTION_GENERATION_PROMPT.format(
            description=session.initial_description,
            qa_history=session.format_qa_history(),
            missing_features=missing,
            asked_questions_count=session.questions_count,
        )
        return await self._llm.generate_question(prompt)

    async def check_emergency(self, features):
        return check_cardiology_emergency(features)

    async def predict(self, features) -> Diagnosis:
        prediction = self._predictor.predict(features)

        if prediction.confidence < 0.6:
            explanation = "Недостаточно данных для уверенного диагноза. Рекомендуется очная консультация."
        else:
            explanation = await self._llm.generate_explanation(
                EXPLANATION_PROMPT.format(
                    diagnosis=prediction.diagnosis,
                    confidence=prediction.confidence,
                    features=features.dict(),
                    feature_importances=prediction.feature_importances,
                )
            )

        return Diagnosis(
            domain=self.code,
            primary_diagnosis=prediction.diagnosis,
            confidence=prediction.confidence,
            explanation=explanation,
            recommendations=self._generate_recommendations(prediction),
            triage_level=self._compute_triage(prediction),
            model_version=self.get_model_version(),
        )

    def get_model_version(self) -> str:
        return self._predictor.model_version
```

**Domain Registry (Factory + IoC):**

```python
# domains/registry.py
from typing import Dict
from app.core.exceptions import DomainNotSupportedException

class DomainRegistry:
    def __init__(self):
        self._domains: Dict[str, MedicalDomain] = {}

    def register(self, domain: MedicalDomain):
        self._domains[domain.code] = domain

    def get(self, code: str) -> MedicalDomain:
        if code not in self._domains:
            raise DomainNotSupportedException(
                f"Medical domain '{code}' is not supported. "
                f"Available: {list(self._domains.keys())}"
            )
        return self._domains[code]

    def list_available(self) -> list[str]:
        return list(self._domains.keys())

# В main.py при старте:
def setup_domains(container) -> DomainRegistry:
    registry = DomainRegistry()
    registry.register(CardiologyDomain(
        predictor=container.cardiology_predictor,
        llm=container.llm,
    ))
    # registry.register(NeurologyDomain(...))  ← future
    return registry
```

### 7.3 Diagnostic Pipeline (Pipeline Pattern)

```python
# application/pipelines/diagnostic_pipeline.py

class DiagnosticPipeline:
    """
    Главный orchestrator AI-flow.
    Этапы: extract → triage → predict → recommend → save
    """

    def __init__(
        self,
        domain_registry: DomainRegistry,
        session_repo: AnalysisSessionRepository,
        appointment_client: AppointmentClient,  # к Java backend
        logger: Logger,
    ):
        self.domain_registry = domain_registry
        self.session_repo = session_repo
        self.appointment_client = appointment_client
        self.logger = logger

    async def execute(
        self,
        session_id: UUID,
    ) -> AnalysisReport:
        session = await self.session_repo.get(session_id)
        domain = self.domain_registry.get(session.domain_code)

        self.logger.info(
            "Starting diagnostic pipeline",
            session_id=session_id,
            domain=session.domain_code,
        )

        # 1. Extract features
        features = await domain.extract_features(session)
        self.logger.info("Features extracted", count=len(features.dict()))

        # 2. Emergency check (triage)
        emergency = await domain.check_emergency(features)
        if emergency:
            return AnalysisReport.emergency(emergency, session_id)

        # 3. Predict
        diagnosis = await domain.predict(features)
        self.logger.info(
            "Prediction made",
            diagnosis=diagnosis.primary_diagnosis,
            confidence=diagnosis.confidence,
            model_version=diagnosis.model_version,
        )

        # 4. Recommend appointments
        slots = await self.appointment_client.find_available_slots(
            specialization=domain.code,
            limit=5,
            within_days=14,
        )

        # 5. Build & persist report
        report = AnalysisReport(
            session_id=session_id,
            features=features,
            diagnosis=diagnosis,
            recommended_slots=slots,
            created_at=datetime.utcnow(),
        )
        await self.session_repo.save_report(report)

        return report
```

### 7.4 LLM Integration

**Принципы:**
- Абстракция через `LLMProvider` интерфейс
- Адаптеры для Claude и OpenAI взаимозаменяемы
- Все промпты в отдельных файлах (не в коде сервисов)
- Промпты на английском (модели работают лучше), но генерируемый текст для пациента — на русском
- Structured output через JSON schema / function calling
- Retry с exponential backoff для transient errors
- Timeout 60s, fallback на secondary provider

**Пример промпта:**

```python
# domains/cardiology/prompts.py
EXTRACTION_PROMPT = """You are a medical assistant extracting structured cardiology features from patient input.

Patient's initial description:
{description}

Q&A History:
{qa_history}

File summaries:
{file_summaries}

Extract the following features. If information is missing, return null for that field.

Required features:
- age (integer, years)
- sex (male/female)
- chest_pain_type (typical_angina | atypical_angina | non_anginal | asymptomatic)
- resting_blood_pressure (integer, mmHg)
- cholesterol (integer, mg/dl)
- fasting_blood_sugar (boolean, > 120 mg/dl)
- max_heart_rate (integer)
- exercise_induced_angina (boolean)
- ... (etc.)

Return JSON matching the provided schema. Do not invent values."""

QUESTION_GENERATION_PROMPT = """You are a medical AI assistant. Based on the conversation so far, generate ONE next question to gather missing diagnostic information.

Patient's description: {description}
Previous Q&A: {qa_history}
Already asked: {asked_questions_count} questions
Missing features: {missing_features}

Rules:
- Ask in Russian
- One clear, simple question
- Prefer multiple-choice when possible
- Empathetic tone
- If you have asked 5+ questions and still missing data, prefer asking the most critical missing feature

Return JSON:
{{
  "question_text": "...",
  "type": "single_choice" | "multi_choice" | "number" | "boolean" | "text",
  "options": [...] or null,
  "feature_name": "..." (which feature this targets)
}}"""
```

### 7.5 Pydantic Schemas (примеры)

```python
# api/v1/schemas/analysis.py

class StartAnalysisRequest(BaseModel):
    domain_code: str = Field(default="cardiology")
    initial_description: str = Field(min_length=10, max_length=5000)
    consent_given: bool = Field(...)

    @field_validator("consent_given")
    def must_consent(cls, v):
        if not v:
            raise ValueError("Consent required to proceed")
        return v

class StartAnalysisResponse(BaseModel):
    session_id: UUID
    first_question: Optional[QuestionDto]
    disclaimer: str

class AnswerQuestionRequest(BaseModel):
    question_id: UUID
    answer: AnswerValue  # union type

class AnalysisReportResponse(BaseModel):
    session_id: UUID
    triage_level: TriageLevel
    primary_diagnosis: str
    confidence: float = Field(ge=0, le=1)
    explanation: str
    recommendations: List[str]
    recommended_slots: List[SlotDto]
    model_version: str
    disclaimer: str
    created_at: datetime
```

### 7.6 FastAPI dependency injection

```python
# api/deps.py
from functools import lru_cache
from app.config import Settings, get_settings

@lru_cache
def get_domain_registry() -> DomainRegistry:
    settings = get_settings()
    container = create_container(settings)
    return setup_domains(container)

async def get_session_repo() -> AnalysisSessionRepository:
    # provided via async session
    ...

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    settings: Settings = Depends(get_settings),
) -> CurrentUser:
    # validates JWT issued by Java backend
    return jwt_validator.validate(credentials.credentials, settings.jwt_secret)

# usage:
@router.post("/analyze")
async def start_analysis(
    request: StartAnalysisRequest,
    user: CurrentUser = Depends(get_current_user),
    use_case: StartAnalysisUseCase = Depends(get_start_analysis_use_case),
):
    return await use_case.execute(request, user.id)
```

### 7.7 Pyproject.toml (ключевые зависимости)

```toml
[project]
name = "ai-service"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.32.0",
    "pydantic>=2.9.0",
    "pydantic-settings>=2.5.0",
    "sqlalchemy[asyncio]>=2.0.35",
    "asyncpg>=0.29.0",
    "alembic>=1.13.0",
    "anthropic>=0.39.0",
    "openai>=1.55.0",
    "scikit-learn>=1.5.0",
    "xgboost>=2.1.0",
    "pandas>=2.2.0",
    "numpy>=1.26.0",
    "mlflow>=2.16.0",
    "httpx>=0.27.0",
    "python-jose[cryptography]>=3.3.0",  # JWT validation
    "structlog>=24.4.0",
    "pypdf>=5.0.0",
    "Pillow>=10.4.0",
    "python-multipart>=0.0.12",
    "minio>=7.2.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.3.0",
    "pytest-asyncio>=0.24.0",
    "pytest-cov>=5.0.0",
    "httpx>=0.27.0",
    "ruff>=0.7.0",
    "black>=24.10.0",
    "mypy>=1.13.0",
]
```

---

## 8. Frontend (React)

### 8.1 Структура проекта (Feature-Sliced Design)

```
frontend/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── components.json                    ← shadcn/ui
├── Dockerfile
├── nginx.conf                         ← для prod-сборки
│
├── public/
│   └── favicon.svg
│
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── vite-env.d.ts
│   │
│   ├── app/                           ← App-level: providers, router
│   │   ├── providers/
│   │   │   ├── QueryProvider.tsx
│   │   │   ├── AuthProvider.tsx
│   │   │   ├── ThemeProvider.tsx
│   │   │   └── ToastProvider.tsx
│   │   ├── router/
│   │   │   ├── AppRouter.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── routes.ts
│   │   └── styles/
│   │       └── index.css
│   │
│   ├── pages/                         ← Страницы (комбинируют widgets/features)
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   └── ForgotPasswordPage.tsx
│   │   ├── patient/
│   │   │   ├── PatientHomePage.tsx
│   │   │   ├── AiAnalysisPage.tsx
│   │   │   ├── AppointmentsPage.tsx
│   │   │   ├── BookAppointmentPage.tsx
│   │   │   ├── DoctorsListPage.tsx
│   │   │   └── ProfilePage.tsx
│   │   ├── doctor/
│   │   │   ├── DoctorDashboardPage.tsx
│   │   │   ├── SchedulePage.tsx
│   │   │   ├── AppointmentDetailsPage.tsx
│   │   │   └── AiReportReviewPage.tsx
│   │   ├── admin/
│   │   │   ├── AdminDashboardPage.tsx
│   │   │   ├── UsersManagementPage.tsx
│   │   │   ├── SpecializationsPage.tsx
│   │   │   ├── MlMonitoringPage.tsx
│   │   │   └── AuditLogPage.tsx
│   │   └── NotFoundPage.tsx
│   │
│   ├── widgets/                       ← Композиции features (большие куски UI)
│   │   ├── ai-analysis-flow/          ← главный AI-флоу
│   │   │   ├── AiAnalysisFlow.tsx
│   │   │   ├── steps/
│   │   │   │   ├── DisclaimerStep.tsx
│   │   │   │   ├── DescriptionStep.tsx
│   │   │   │   ├── QuestionStep.tsx
│   │   │   │   ├── FilesUploadStep.tsx
│   │   │   │   └── ReportStep.tsx
│   │   │   └── hooks/
│   │   │       └── useAnalysisFlow.ts
│   │   ├── doctor-ai-report/
│   │   ├── appointment-calendar/
│   │   ├── doctor-schedule-editor/
│   │   └── ml-metrics-dashboard/
│   │
│   ├── features/                      ← Конкретные фичи (бизнес-действия)
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── api/
│   │   │       ├── authApi.ts
│   │   │       └── useLoginMutation.ts
│   │   ├── ai-analysis/
│   │   │   ├── ui/
│   │   │   │   ├── QuestionRenderer.tsx
│   │   │   │   ├── FileUploader.tsx
│   │   │   │   ├── DiagnosisCard.tsx
│   │   │   │   └── TriageBanner.tsx
│   │   │   ├── api/
│   │   │   │   ├── aiAnalysisApi.ts
│   │   │   │   └── useStartAnalysisMutation.ts
│   │   │   └── model/
│   │   │       └── analysisStore.ts   ← Zustand
│   │   ├── appointments/
│   │   │   ├── ui/
│   │   │   │   ├── SlotPicker.tsx
│   │   │   │   ├── AppointmentCard.tsx
│   │   │   │   └── BookingForm.tsx
│   │   │   └── api/
│   │   ├── doctor-feedback/
│   │   │   ├── ui/
│   │   │   │   ├── FeedbackForm.tsx
│   │   │   │   └── VerdictSelector.tsx
│   │   │   └── api/
│   │   └── ...
│   │
│   ├── entities/                      ← Бизнес-сущности (read-only представление)
│   │   ├── user/
│   │   │   ├── ui/
│   │   │   │   └── UserAvatar.tsx
│   │   │   ├── model/
│   │   │   │   └── types.ts
│   │   │   └── api/
│   │   │       └── userApi.ts
│   │   ├── doctor/
│   │   │   ├── ui/
│   │   │   │   ├── DoctorCard.tsx
│   │   │   │   └── DoctorList.tsx
│   │   │   └── ...
│   │   ├── appointment/
│   │   ├── analysis-session/
│   │   └── specialization/
│   │
│   └── shared/                        ← Переиспользуемые утилиты
│       ├── api/
│       │   ├── axios.ts               ← настроенный instance с interceptors
│       │   ├── apiClient.ts
│       │   └── errorHandler.ts
│       ├── ui/                        ← shadcn/ui + кастомные базовые компоненты
│       │   ├── button.tsx
│       │   ├── input.tsx
│       │   ├── card.tsx
│       │   ├── dialog.tsx
│       │   ├── select.tsx
│       │   ├── form.tsx
│       │   ├── alert.tsx
│       │   ├── badge.tsx
│       │   ├── skeleton.tsx
│       │   ├── toast.tsx
│       │   ├── Disclaimer.tsx         ← кастомный важный компонент
│       │   └── EmergencyBanner.tsx
│       ├── lib/
│       │   ├── cn.ts
│       │   ├── formatDate.ts
│       │   └── validators.ts
│       ├── hooks/
│       │   ├── useDebounce.ts
│       │   ├── useLocalStorage.ts
│       │   └── useMediaQuery.ts
│       ├── config/
│       │   ├── env.ts
│       │   └── routes.ts
│       └── types/
│           ├── api.ts
│           └── common.ts
│
└── tests/
    ├── unit/
    └── e2e/                           ← Playwright (опционально)
```

### 8.2 Ключевые UI/UX решения

**Главный экран пациента — AI Analysis CTA:**
- Большая яркая кнопка по центру (или в hero-блоке)
- Иконка стетоскопа + текст "Анализ симптомов с ИИ"
- Анимация при наведении
- Под кнопкой — короткое объяснение в 1-2 предложения
- Disclaimer мелким шрифтом снизу

**AI Analysis flow (wizard-style):**
- Step indicator сверху (1/5, 2/5...)
- Анимированный переход между шагами
- Возможность вернуться назад
- Сохранение прогресса в Zustand + localStorage (восстановление при F5)
- Loading-состояния с осмысленными сообщениями ("ИИ анализирует ваши ответы...")

**Triage Banner (при emergency):**
- Красный баннер сверху, нельзя скрыть
- Большой текст "СРОЧНО ВЫЗОВИТЕ СКОРУЮ ПОМОЩЬ"
- Кнопка "Позвонить 103" (tel: link)

**Доктор — AI Report:**
- Структурированный вид: вкладки "Жалобы | Опрос | Файлы | AI-диагноз"
- Confidence визуализирован прогресс-баром с цветовой кодировкой
- Версия модели и timestamp видны
- Большие кнопки "Подтвердить" / "Не согласен" / "Частично"
- Форма для комментария (обязательная при reject)

**ML Monitoring Dashboard (админ):**
- KPI cards: текущая accuracy, кол-во предсказаний за 24ч, доля approved feedback
- Графики: confidence distribution, predictions over time
- Список последних feedback'ов
- Кнопка "Запустить retraining" с подтверждением

### 8.3 Конвенции кода

```typescript
// Naming
- Компоненты: PascalCase (UserCard.tsx)
- Хуки: camelCase, начинается с use (useAnalysis.ts)
- Утилиты: camelCase (formatDate.ts)
- Константы: SCREAMING_SNAKE_CASE
- Типы/Interfaces: PascalCase, без префиксов I/T
- Файлы: kebab-case или PascalCase (для компонентов)

// Component template
type Props = {
  variant?: "primary" | "secondary";
  onAction: () => void;
  children: ReactNode;
};

export function MyComponent({ variant = "primary", onAction, children }: Props) {
  // hooks
  const { t } = useTranslation();
  const [state, setState] = useState(false);

  // derived
  const className = cn("base", variant === "primary" && "primary-styles");

  // handlers
  const handleClick = useCallback(() => { ... }, [...]);

  // effects
  useEffect(() => { ... }, [...]);

  // render
  return <div className={className}>{children}</div>;
}

// API hooks (TanStack Query)
export function useStartAnalysisMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: aiAnalysisApi.startAnalysis,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

// Forms (React Hook Form + Zod)
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
type FormValues = z.infer<typeof schema>;
```

### 8.4 Маршруты

```typescript
// app/router/routes.ts
export const routes = {
  // public
  login: "/login",
  register: "/register",

  // patient
  patient: {
    home: "/",
    aiAnalysis: "/ai-analysis",
    aiAnalysisSession: "/ai-analysis/:sessionId",
    appointments: "/appointments",
    bookAppointment: "/book/:doctorId",
    doctors: "/doctors",
    profile: "/profile",
  },

  // doctor
  doctor: {
    dashboard: "/doctor",
    schedule: "/doctor/schedule",
    appointment: "/doctor/appointments/:id",
    aiReport: "/doctor/appointments/:id/ai-report",
  },

  // admin
  admin: {
    dashboard: "/admin",
    users: "/admin/users",
    specializations: "/admin/specializations",
    mlMonitoring: "/admin/ml",
    auditLog: "/admin/audit",
  },
} as const;
```

---

## 9. База данных

### 9.1 ER-диаграмма (текстовая)

```
┌──────────────┐        ┌──────────────┐
│    users     │1      *│ refresh_     │
│              │────────│ tokens       │
│ id (UUID) PK │        │              │
│ email UK     │        └──────────────┘
│ password     │
│ role         │1      1┌──────────────┐
│ status       │────────│  patients    │
│ created_at   │        │  id (UUID)PK,FK
│ updated_at   │        │  birth_date  │
└──────┬───────┘        │  gender      │
       │1               │  phone       │
       │                └──────────────┘
       │
       │1      1┌──────────────────┐
       └────────│    doctors       │
                │ id (UUID) PK,FK  │
                │ specialization_id│*─────────┐
                │ license_number   │          │
                │ years_experience │          │
                │ bio              │          │
                │ verified         │          │
                └────────┬─────────┘          │
                         │1                   │
                         │                    │
            ┌────────────┴─────┐              │
            │                  │              │
           1*                  1*             │
   ┌───────────────┐   ┌──────────────┐       │
   │  schedules    │   │  time_slots  │       │
   │  id PK        │   │  id PK       │       │
   │  doctor_id FK │   │  doctor_id FK│       │
   │  day_of_week  │   │  start_at    │       │
   │  start_time   │   │  end_at      │       │
   │  end_time     │   │  status      │       │
   │  slot_duration│   │  type        │       │
   └───────────────┘   └──────┬───────┘       │
                              │1              │
                              │               │
                             1*               │
                       ┌────────────────┐     │
                       │ appointments   │*────┤
                       │ id PK          │     │
                       │ patient_id FK  │*────┘
                       │ doctor_id FK   │
                       │ time_slot_id FK│
                       │ ai_session_id  │     ┌─────────────────────┐
                       │ status         │     │ specializations     │
                       │ type           │     │ id PK               │
                       │ reason         │     │ code UK             │
                       │ meeting_link   │     │ display_name        │
                       │ notes          │     │ description         │
                       │ created_at     │     │ has_ai_support      │
                       └───────┬────────┘     └─────────────────────┘
                               │1
                               │
                              0*
                       ┌──────────────────┐
                       │ analysis_sessions│
                       │ id PK            │
                       │ patient_id FK    │
                       │ domain_code      │
                       │ status           │
                       │ initial_descript │
                       │ created_at       │
                       │ completed_at     │
                       └────┬─────────────┘
                            │1
              ┌─────────────┼──────────────┐
              │             │              │
             1*            1*             0*
       ┌───────────┐ ┌──────────┐  ┌──────────────────┐
       │questions  │ │uploaded  │  │ analysis_reports │
       │id PK      │ │_files    │  │ id PK            │
       │session_id │ │id PK     │  │ session_id FK,UK │
       │question   │ │session_id│  │ features (JSONB) │
       │type       │ │filename  │  │ diagnosis        │
       │options    │ │mime_type │  │ confidence       │
       │answer     │ │size      │  │ explanation      │
       │feature    │ │minio_key │  │ triage_level     │
       │order      │ │extracted │  │ recommendations  │
       └───────────┘ │_text     │  │ model_version    │
                     └──────────┘  │ created_at       │
                                   └────────┬─────────┘
                                            │1
                                           0*
                                   ┌─────────────────┐
                                   │ doctor_feedback │
                                   │ id PK           │
                                   │ report_id FK    │
                                   │ doctor_id FK    │
                                   │ verdict         │
                                   │ comment         │
                                   │ corrected_diag  │
                                   │ model_version   │
                                   │ created_at      │
                                   └─────────────────┘

┌─────────────────┐
│   audit_log     │
│   id PK         │
│   user_id       │
│   action        │
│   resource_type │
│   resource_id   │
│   details JSONB │
│   ip_address    │
│   timestamp     │
└─────────────────┘
```

### 9.2 DDL (PostgreSQL) — полный

```sql
-- V1__init_schema.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- V2__create_users_tables.sql
CREATE TYPE user_role AS ENUM ('PATIENT', 'DOCTOR', 'ADMIN');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED', 'DELETED');
CREATE TYPE gender AS ENUM ('MALE', 'FEMALE', 'OTHER');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    status user_status NOT NULL DEFAULT 'ACTIVE',
    avatar_url VARCHAR(512),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

CREATE TABLE patients (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    birth_date DATE NOT NULL,
    gender gender NOT NULL,
    phone VARCHAR(32),
    iin VARCHAR(12) UNIQUE,  -- Казахстанский ИИН (опционально)
    address TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(32)
);

CREATE TABLE specializations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(64) NOT NULL UNIQUE,
    display_name VARCHAR(128) NOT NULL,
    description TEXT,
    has_ai_support BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE doctors (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    specialization_id UUID NOT NULL REFERENCES specializations(id),
    license_number VARCHAR(64) NOT NULL UNIQUE,
    years_experience INT NOT NULL DEFAULT 0,
    bio TEXT,
    consultation_fee NUMERIC(10, 2),
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    average_rating NUMERIC(2, 1) DEFAULT 0
);
CREATE INDEX idx_doctors_specialization ON doctors(specialization_id);
CREATE INDEX idx_doctors_verified ON doctors(verified) WHERE verified = TRUE;

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_agent VARCHAR(512),
    ip_address INET
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- V3__create_appointments_tables.sql
CREATE TYPE day_of_week AS ENUM ('MON','TUE','WED','THU','FRI','SAT','SUN');
CREATE TYPE appointment_type AS ENUM ('ONLINE', 'OFFLINE');
CREATE TYPE slot_status AS ENUM ('AVAILABLE', 'RESERVED', 'BOOKED', 'BLOCKED');
CREATE TYPE appointment_status AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    day_of_week day_of_week NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INT NOT NULL DEFAULT 30,
    appointment_type appointment_type NOT NULL DEFAULT 'OFFLINE',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_time_order CHECK (start_time < end_time)
);
CREATE INDEX idx_schedules_doctor ON schedules(doctor_id);

CREATE TABLE time_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    type appointment_type NOT NULL,
    status slot_status NOT NULL DEFAULT 'AVAILABLE',
    reserved_until TIMESTAMPTZ,  -- для временной блокировки во время бронирования
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_slot_time CHECK (start_at < end_at),
    CONSTRAINT uk_doctor_slot UNIQUE (doctor_id, start_at)
);
CREATE INDEX idx_slots_doctor_status ON time_slots(doctor_id, status, start_at);
CREATE INDEX idx_slots_available ON time_slots(start_at) WHERE status = 'AVAILABLE';

CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    doctor_id UUID NOT NULL REFERENCES doctors(id),
    time_slot_id UUID NOT NULL REFERENCES time_slots(id),
    ai_session_id UUID,  -- nullable, ссылка на AI-отчет (создается отдельно)
    status appointment_status NOT NULL DEFAULT 'SCHEDULED',
    type appointment_type NOT NULL,
    reason TEXT NOT NULL,
    meeting_link VARCHAR(512),
    notes TEXT,
    cancellation_reason TEXT,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_appointments_patient ON appointments(patient_id, status);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id, status);
CREATE INDEX idx_appointments_slot ON appointments(time_slot_id);

-- V4__create_ai_tables.sql
CREATE TYPE analysis_status AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'FAILED');
CREATE TYPE triage_level AS ENUM ('ROUTINE', 'URGENT', 'EMERGENCY', 'INSUFFICIENT_DATA');
CREATE TYPE question_type AS ENUM ('SINGLE_CHOICE', 'MULTI_CHOICE', 'NUMBER', 'BOOLEAN', 'TEXT');
CREATE TYPE feedback_verdict AS ENUM ('APPROVED', 'REJECTED', 'PARTIALLY_CORRECT');

CREATE TABLE analysis_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    domain_code VARCHAR(64) NOT NULL,  -- 'cardiology', etc.
    status analysis_status NOT NULL DEFAULT 'IN_PROGRESS',
    initial_description TEXT NOT NULL,
    consent_given BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    abandoned_at TIMESTAMPTZ
);
CREATE INDEX idx_sessions_patient ON analysis_sessions(patient_id, status);

CREATE TABLE analysis_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES analysis_sessions(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type question_type NOT NULL,
    options JSONB,  -- для choice questions
    feature_name VARCHAR(64),  -- какой признак мы пытаемся получить
    answer JSONB,
    answered_at TIMESTAMPTZ,
    "order" INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_session_order UNIQUE (session_id, "order")
);
CREATE INDEX idx_questions_session ON analysis_questions(session_id);

CREATE TABLE uploaded_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES analysis_sessions(id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(128) NOT NULL,
    size_bytes BIGINT NOT NULL,
    minio_key VARCHAR(512) NOT NULL,
    extracted_text TEXT,
    summary TEXT,  -- LLM-generated description
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_files_session ON uploaded_files(session_id);

CREATE TABLE analysis_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL UNIQUE REFERENCES analysis_sessions(id) ON DELETE CASCADE,
    extracted_features JSONB NOT NULL,
    primary_diagnosis VARCHAR(255) NOT NULL,
    confidence NUMERIC(3, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    explanation TEXT NOT NULL,
    recommendations JSONB NOT NULL,  -- array of strings
    triage_level triage_level NOT NULL,
    feature_importances JSONB,  -- для интерпретируемости
    model_version VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reports_session ON analysis_reports(session_id);

CREATE TABLE doctor_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES analysis_reports(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id),
    appointment_id UUID REFERENCES appointments(id),
    verdict feedback_verdict NOT NULL,
    comment TEXT,
    corrected_diagnosis VARCHAR(255),
    model_version VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_reject_requires_comment CHECK (
        (verdict <> 'REJECTED') OR (comment IS NOT NULL AND corrected_diagnosis IS NOT NULL)
    )
);
CREATE INDEX idx_feedback_report ON doctor_feedback(report_id);
CREATE INDEX idx_feedback_model_version ON doctor_feedback(model_version);

-- V5__create_audit_log.sql
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID,
    action VARCHAR(64) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent VARCHAR(512),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_user ON audit_log(user_id, timestamp DESC);
CREATE INDEX idx_audit_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_action ON audit_log(action, timestamp DESC);

-- V6__seed_specializations.sql
INSERT INTO specializations (code, display_name, description, has_ai_support) VALUES
    ('cardiology', 'Кардиология', 'Заболевания сердечно-сосудистой системы', TRUE),
    ('neurology', 'Неврология', 'Заболевания нервной системы', FALSE),
    ('therapy', 'Терапия', 'Общая практика', FALSE),
    ('endocrinology', 'Эндокринология', 'Гормональные заболевания', FALSE),
    ('dermatology', 'Дерматология', 'Заболевания кожи', FALSE);
```

### 9.3 Замечания по БД

- **Разделение БД:** Java backend и AI service используют **одну** PostgreSQL базу, но **разные схемы**:
  - `public` (или `core`) — для Java backend (users, appointments, ...)
  - `ai` — для AI service (но в нашем MVP логичнее держать AI-таблицы в общей БД, доступ к которой имеет и Java, и Python через свои ORM. Java владеет main схемой, AI service — read-only по медицинским таблицам и read-write по своим feedback/sessions, либо все таблицы пишутся через Java API)
- **Финальный выбор:** все таблицы в `public`, Java владеет схемой через Flyway, AI service использует SQLAlchemy в read-write режиме только для `analysis_sessions`, `analysis_questions`, `analysis_reports`, `doctor_feedback`. Это упрощает MVP.
- **Soft delete** для `users` через `status = 'DELETED'`, без физического удаления медицинских данных
- **JSONB** активно используем где структура переменна (features, options, recommendations)
- **Timestamps** всегда `TIMESTAMPTZ`
- **Update triggers** для `updated_at` автоматизируем через PostgreSQL function

---

## 10. API контракты

### 10.1 Общие правила

- **База:** `https://api.healthcare.kz/api/v1` (dev: `http://localhost:8080/api/v1`)
- **Аутентификация:** Bearer JWT в заголовке `Authorization`
- **Content-Type:** `application/json` (кроме file upload — `multipart/form-data`)
- **Pagination:** `?page=0&size=20&sort=createdAt,desc`
- **Errors:** единый формат
  ```json
  {
    "errorCode": "SLOT_UNAVAILABLE",
    "message": "This time slot is no longer available",
    "timestamp": "2026-05-05T12:00:00Z",
    "path": "/api/v1/appointments",
    "details": {}
  }
  ```
- **Successful list response:**
  ```json
  {
    "content": [...],
    "totalElements": 150,
    "totalPages": 8,
    "page": 0,
    "size": 20
  }
  ```

### 10.2 Auth API

```
POST   /api/v1/auth/register/patient
POST   /api/v1/auth/register/doctor
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
```

**POST /auth/register/patient**
```json
// Request
{
  "email": "patient@example.com",
  "password": "Strong@Pass1",
  "fullName": "Иван Иванов",
  "birthDate": "1990-05-15",
  "gender": "MALE",
  "phone": "+77001234567"
}
// Response 201
{
  "userId": "uuid",
  "email": "patient@example.com",
  "role": "PATIENT"
}
```

**POST /auth/login**
```json
// Request
{ "email": "...", "password": "..." }
// Response 200
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "expiresIn": 900,
  "user": {
    "id": "uuid",
    "email": "...",
    "fullName": "...",
    "role": "PATIENT"
  }
}
```

### 10.3 AI Analysis API

```
POST   /api/v1/ai/analysis/start
POST   /api/v1/ai/analysis/{sessionId}/answer
POST   /api/v1/ai/analysis/{sessionId}/files
DELETE /api/v1/ai/analysis/{sessionId}/files/{fileId}
POST   /api/v1/ai/analysis/{sessionId}/finalize    ← запускает pipeline
GET    /api/v1/ai/analysis/{sessionId}             ← получить статус/отчет
GET    /api/v1/ai/analysis/{sessionId}/report
GET    /api/v1/ai/analysis/sessions                ← мои сессии
POST   /api/v1/ai/analysis/{sessionId}/feedback    ← врач дает feedback
```

**POST /ai/analysis/start**
```json
// Request
{
  "domainCode": "cardiology",
  "initialDescription": "Болит в груди при подъеме по лестнице, иногда тяжело дышать",
  "consentGiven": true
}
// Response 201
{
  "sessionId": "uuid",
  "status": "IN_PROGRESS",
  "firstQuestion": {
    "id": "uuid",
    "text": "Сколько вам полных лет?",
    "type": "NUMBER",
    "featureName": "age"
  },
  "disclaimer": "Этот сервис не заменяет консультацию врача..."
}
```

**POST /ai/analysis/{sessionId}/answer**
```json
// Request
{
  "questionId": "uuid",
  "answer": 45
}
// Response 200
{
  "nextQuestion": { "id": "...", "text": "...", "type": "...", ... } // или null если закончили
  "questionsRemaining": 3,
  "completionPercentage": 60
}
```

**POST /ai/analysis/{sessionId}/finalize**
```
// Response 200 (после обработки)
{
  "sessionId": "uuid",
  "report": {
    "triageLevel": "ROUTINE",       // ROUTINE | URGENT | EMERGENCY | INSUFFICIENT_DATA
    "primaryDiagnosis": "Стенокардия напряжения (вероятно)",
    "confidence": 0.78,
    "explanation": "На основании ваших симптомов...",
    "recommendations": [
      "Запишитесь к кардиологу в течение 1-2 недель",
      "Избегайте интенсивных физических нагрузок до консультации",
      "Измеряйте артериальное давление 2 раза в день"
    ],
    "recommendedSlots": [
      {
        "slotId": "uuid",
        "doctorId": "uuid",
        "doctorName": "Айдар Кенжебаевич",
        "specialization": "Кардиология",
        "startAt": "2026-05-08T10:00:00Z",
        "type": "OFFLINE",
        "rating": 4.8
      }
    ],
    "modelVersion": "cardiology-xgb-v1.2",
    "disclaimer": "Это предварительный анализ..."
  }
}
```

**Emergency response example:**
```json
{
  "report": {
    "triageLevel": "EMERGENCY",
    "primaryDiagnosis": null,
    "emergencyMessage": "Описанные симптомы могут указывать на острое состояние. НЕМЕДЛЕННО ВЫЗОВИТЕ СКОРУЮ ПОМОЩЬ — 103",
    "confidence": null,
    "recommendedSlots": []
  }
}
```

**POST /ai/analysis/{sessionId}/feedback** (для врача)
```json
// Request
{
  "verdict": "REJECTED",            // APPROVED | REJECTED | PARTIALLY_CORRECT
  "comment": "Симптомы больше похожи на остеохондроз грудного отдела",
  "correctedDiagnosis": "Грудной остеохондроз",
  "appointmentId": "uuid"
}
// Response 200
{ "feedbackId": "uuid", "savedAt": "..." }
```

### 10.4 Appointments API

```
GET    /api/v1/appointments                      ← мои приемы
POST   /api/v1/appointments                      ← создать
GET    /api/v1/appointments/{id}
PATCH  /api/v1/appointments/{id}/cancel
PATCH  /api/v1/appointments/{id}/complete        ← врач помечает completed
PATCH  /api/v1/appointments/{id}/notes           ← врач добавляет notes

GET    /api/v1/doctors                           ← список врачей с фильтрами
GET    /api/v1/doctors/{id}
GET    /api/v1/doctors/{id}/slots                ← доступные слоты
POST   /api/v1/doctors/me/schedule               ← врач задает расписание
GET    /api/v1/doctors/me/schedule
PUT    /api/v1/doctors/me/schedule/{id}
DELETE /api/v1/doctors/me/schedule/{id}
POST   /api/v1/doctors/me/slots/generate         ← генерация слотов на N недель
PATCH  /api/v1/doctors/me/slots/{id}/block       ← блокировка слота

GET    /api/v1/specializations
```

**GET /doctors?specialization=cardiology&availableFrom=2026-05-08**
```json
{
  "content": [
    {
      "id": "uuid",
      "fullName": "...",
      "specialization": { "code": "cardiology", "displayName": "Кардиология" },
      "yearsExperience": 12,
      "rating": 4.8,
      "consultationFee": 8000,
      "nearestSlot": "2026-05-08T10:00:00Z",
      "verified": true,
      "bio": "..."
    }
  ]
}
```

**POST /appointments**
```json
// Request
{
  "slotId": "uuid",
  "type": "ONLINE",
  "reason": "Боли в груди при нагрузке",
  "aiSessionId": "uuid"  // optional
}
// Response 201
{
  "id": "uuid",
  "status": "SCHEDULED",
  "doctorName": "...",
  "startAt": "...",
  "meetingLink": "https://meet.jit.si/healthcare-...",  // для ONLINE
  "aiReportAttached": true
}
```

### 10.5 Admin API

```
GET    /api/v1/admin/users
PATCH  /api/v1/admin/users/{id}/status
PATCH  /api/v1/admin/doctors/{id}/verify

GET    /api/v1/admin/specializations
POST   /api/v1/admin/specializations
PUT    /api/v1/admin/specializations/{id}

GET    /api/v1/admin/audit-log

GET    /api/v1/admin/ml/metrics                   ← проксирует MLflow
GET    /api/v1/admin/ml/models
POST   /api/v1/admin/ml/retrain                   ← запускает retraining job
```

### 10.6 AI Service Internal API (вызывается только Java backend)

```
POST   /internal/v1/analysis/start
POST   /internal/v1/analysis/{id}/answer
POST   /internal/v1/analysis/{id}/process-file
POST   /internal/v1/analysis/{id}/finalize
POST   /internal/v1/feedback
GET    /internal/v1/health
GET    /internal/v1/models
POST   /internal/v1/models/{id}/retrain
```

Internal API защищается shared secret в заголовке `X-Service-Token`.

---

## 11. AI Flow

### 11.1 Sequence Diagram (текстовый)

```
Пациент      Frontend     Java Backend    AI Service     LLM API     ML Model     DB
   │            │              │              │             │             │          │
   │── click "AI Analysis" ──▶ │              │             │             │          │
   │            │── /start ───▶│              │             │             │          │
   │            │              │── /start ───▶│             │             │          │
   │            │              │              │── prompt ──▶│             │          │
   │            │              │              │◀── 1st Q ───│             │          │
   │            │              │              │── insert session+Q ──────────────────▶│
   │            │              │◀── session+Q ─│             │             │          │
   │            │◀── 1st Q ────│              │             │             │          │
   │◀── show ───│              │              │             │             │          │
   │            │              │              │             │             │          │
   │── answer ─▶│              │              │             │             │          │
   │            │── /answer ──▶│              │             │             │          │
   │            │              │── /answer ──▶│             │             │          │
   │            │              │              │── update Q + decide next ─────────────▶│
   │            │              │              │── prompt for next Q ──▶│             │          │
   │            │              │              │◀── next Q ─────────────│             │          │
   │            │              │◀── next Q ───│             │             │          │
   │            │◀── next Q ───│              │             │             │          │
   │            │              │              │             │             │          │
   │  ... (loop until enough features) ...    │             │             │          │
   │            │              │              │             │             │          │
   │── upload file ▶│         │              │             │             │          │
   │            │── /files ──▶│              │             │             │          │
   │            │              │── store in MinIO          │             │             │
   │            │              │── /process-file ─────────▶│             │             │
   │            │              │              │── extract text (pypdf/OCR)            │          │
   │            │              │              │── summarize ─▶│         │             │          │
   │            │              │              │◀── summary ───│         │             │          │
   │            │              │              │── save file metadata + summary ────────▶│
   │            │              │              │             │             │          │
   │── click "finalize" ──────▶│              │             │             │          │
   │            │── /finalize ▶│              │             │             │          │
   │            │              │── /finalize ▶│             │             │          │
   │            │              │              │── extract_features (LLM) ─────────────▶│ (LLM)
   │            │              │              │── check_emergency (rules)            │          │
   │            │              │              │── if emergency → return early        │          │
   │            │              │              │── predict (ML) ────────────────────▶│ (ML)     │
   │            │              │              │◀── prediction ─────────────────────│          │
   │            │              │              │── generate_explanation (LLM) ─▶│ (LLM)         │
   │            │              │              │◀── explanation ───────────────│                │
   │            │              │              │── save report ────────────────────────▶│       │
   │            │              │              │── find_slots (callback to Java)       │       │
   │            │              │              │── /internal/find-slots ─▶│           │       │
   │            │              │◀── slots ────│              │             │          │
   │            │              │── send slots to AI ────────▶│             │          │
   │            │              │◀── full report ─────────────│             │          │
   │            │◀── report ───│              │             │             │          │
   │◀── show ───│              │              │             │             │          │
   │            │              │              │             │             │          │
   │            │              │              │  [Patient books appointment]          │       │
   │            │              │              │             │             │          │
   │  Doctor logs in, sees AI report          │             │             │          │
   │── view report ────────────▶│             │             │             │          │
   │── give feedback ──────────▶│             │             │             │          │
   │            │              │── /feedback ▶│             │             │          │
   │            │              │              │── save to doctor_feedback table ──────▶│       │
   │            │              │              │             │             │          │
```

### 11.2 Алгоритм генерации вопросов

```python
# Pseudo-code

async def get_next_question(session, partial_features):
    # 1. Проверка лимита вопросов
    if session.questions_count >= MAX_QUESTIONS:  # = 7
        return None

    # 2. Какие признаки еще нужны
    missing = [f for f in REQUIRED_FEATURES
               if partial_features.get(f) is None]

    # 3. Достаточно ли уже данных для модели?
    if len(missing) <= TOLERATED_MISSING_THRESHOLD:  # = 2
        # модель умеет работать с до 2 пропущенными признаками
        return None

    # 4. Приоритизация (важные признаки спрашиваем раньше)
    next_feature = prioritize(missing, MEDICAL_PRIORITY_ORDER)

    # 5. Генерация вопроса через LLM
    return await llm.generate_question(
        feature=next_feature,
        context=session.context
    )
```

### 11.3 Triage Rules для кардиологии

```python
# domains/cardiology/triage_rules.py

EMERGENCY_PATTERNS = [
    {
        "name": "Возможный острый коронарный синдром",
        "keywords": ["сильная давящая боль", "отдает в руку", "холодный пот", "тошнота"],
        "features": {
            "chest_pain_severity": ">=8",
            "duration_minutes": ">=15",
        },
        "message": "Описанные симптомы могут указывать на инфаркт миокарда. НЕМЕДЛЕННО вызовите скорую помощь — 103."
    },
    {
        "name": "Гипертонический криз",
        "features": {
            "systolic_bp": ">=180",
            "diastolic_bp": ">=110",
        },
        "message": "Очень высокое давление требует немедленной медицинской помощи. Вызовите скорую — 103."
    }
]

URGENT_PATTERNS = [
    {
        "name": "Нестабильная стенокардия",
        "features": {
            "chest_pain_at_rest": True,
            "frequency_increasing": True,
        },
        "message": "Рекомендуется консультация кардиолога в течение 24-48 часов."
    }
]

def check_emergency(features) -> Optional[str]:
    for pattern in EMERGENCY_PATTERNS:
        if matches(features, pattern):
            return pattern["message"]
    return None
```

### 11.4 Confidence threshold logic

```python
CONFIDENCE_THRESHOLDS = {
    "high": 0.75,      # уверенный диагноз
    "medium": 0.60,    # показываем но с предупреждением
    "low": 0.0         # говорим "недостаточно данных"
}

def post_process_prediction(prediction, features):
    if prediction.confidence < 0.60:
        return Diagnosis(
            primary_diagnosis="Недостаточно данных для уверенного диагноза",
            confidence=prediction.confidence,
            triage_level="INSUFFICIENT_DATA",
            explanation="Для точного диагноза необходима очная консультация кардиолога и дополнительные обследования (ЭКГ, ЭхоКГ).",
            recommendations=["Запишитесь на очный прием к кардиологу"]
        )
    elif prediction.confidence < 0.75:
        # средняя уверенность — показываем но с осторожностью
        prediction.explanation = f"⚠️ Предварительный анализ показывает: {prediction.diagnosis}. Уверенность модели — средняя ({prediction.confidence:.0%}). Обязательна консультация врача для подтверждения."
    return prediction
```

---

## 12. ML Pipeline

### 12.1 Датасеты

**Primary dataset: UCI Heart Disease (Cleveland)**
- Источник: UCI Machine Learning Repository
- Признаки (14): age, sex, cp (chest pain type), trestbps, chol, fbs, restecg, thalach, exang, oldpeak, slope, ca, thal, target
- Размер: ~303 записи
- Качество: классический dataset, чистый

**Secondary: Kaggle Cardiovascular Disease Dataset**
- Источник: Kaggle (Svetlana Ulianova)
- Признаки: age, gender, height, weight, ap_hi, ap_lo, cholesterol, gluc, smoke, alco, active, cardio
- Размер: ~70,000 записей
- Качество: больше данных, но другие признаки

**Стратегия:** обучаем **две модели** (или одну на гармонизированном datasete с переименованными признаками + missing handling). Для MVP проще использовать UCI как primary (классические клинические признаки) и показывать что архитектура поддерживает несколько источников.

**Скрипт загрузки:**

```python
# scripts/download_datasets.py
import pandas as pd
from pathlib import Path

UCI_URL = "https://archive.ics.uci.edu/ml/machine-learning-databases/heart-disease/processed.cleveland.data"
KAGGLE_LOCAL = "data/raw/cardio_train.csv"  # пользователь должен скачать вручную

def download_uci():
    columns = ['age','sex','cp','trestbps','chol','fbs','restecg',
               'thalach','exang','oldpeak','slope','ca','thal','target']
    df = pd.read_csv(UCI_URL, names=columns, na_values='?')
    df.to_csv("data/raw/uci_heart_disease.csv", index=False)
    print(f"UCI dataset: {len(df)} rows")

if __name__ == "__main__":
    Path("data/raw").mkdir(parents=True, exist_ok=True)
    download_uci()
```

### 12.2 Training Pipeline

```python
# ml/train_cardiology.py

import mlflow
import mlflow.xgboost
import xgboost as xgb
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, roc_auc_score, classification_report,
    confusion_matrix
)

DATA_PATH = "data/raw/uci_heart_disease.csv"
EXPERIMENT_NAME = "cardiology-diagnosis"


def load_data(path=DATA_PATH):
    df = pd.read_csv(path)
    # binary target: 0 = no disease, 1+ = disease (объединяем 1,2,3,4)
    df['target'] = (df['target'] > 0).astype(int)
    return df


def train():
    mlflow.set_tracking_uri("http://localhost:5000")
    mlflow.set_experiment(EXPERIMENT_NAME)

    df = load_data()
    X = df.drop(columns=['target'])
    y = df['target']

    numeric_features = ['age','trestbps','chol','thalach','oldpeak']
    categorical_features = ['sex','cp','fbs','restecg','exang','slope','ca','thal']

    preprocessor = ColumnTransformer([
        ('num', Pipeline([
            ('imputer', SimpleImputer(strategy='median')),
            ('scaler', StandardScaler())
        ]), numeric_features),
        ('cat', Pipeline([
            ('imputer', SimpleImputer(strategy='most_frequent'))
        ]), categorical_features)
    ])

    # XGBoost params (можно тюнить через GridSearch)
    params = {
        'n_estimators': 200,
        'max_depth': 5,
        'learning_rate': 0.1,
        'subsample': 0.8,
        'colsample_bytree': 0.8,
        'random_state': 42,
        'eval_metric': 'logloss',
    }

    pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('classifier', xgb.XGBClassifier(**params))
    ])

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    with mlflow.start_run():
        # Log params
        mlflow.log_params(params)
        mlflow.log_param("dataset", "UCI Heart Disease")
        mlflow.log_param("n_samples_train", len(X_train))
        mlflow.log_param("n_samples_test", len(X_test))

        # Cross-val
        cv_scores = cross_val_score(pipeline, X_train, y_train, cv=5, scoring='accuracy')
        mlflow.log_metric("cv_accuracy_mean", cv_scores.mean())
        mlflow.log_metric("cv_accuracy_std", cv_scores.std())

        # Train
        pipeline.fit(X_train, y_train)

        # Eval on test
        y_pred = pipeline.predict(X_test)
        y_proba = pipeline.predict_proba(X_test)[:, 1]

        metrics = {
            'accuracy': accuracy_score(y_test, y_pred),
            'precision': precision_score(y_test, y_pred),
            'recall': recall_score(y_test, y_pred),
            'f1': f1_score(y_test, y_pred),
            'roc_auc': roc_auc_score(y_test, y_proba),
        }
        mlflow.log_metrics(metrics)
        print("Test metrics:", metrics)
        print(classification_report(y_test, y_pred))

        # Log confusion matrix as artifact
        # ... (plot and save)

        # Log model with signature
        mlflow.xgboost.log_model(
            xgb_model=pipeline.named_steps['classifier'],
            artifact_path="model",
            registered_model_name="cardiology-diagnosis"
        )

        # Tag the run
        mlflow.set_tag("stage", "baseline")
        mlflow.set_tag("model_type", "xgboost")


if __name__ == "__main__":
    train()
```

### 12.3 Inference (Predictor)

```python
# infrastructure/ml/predictors/cardiology_predictor.py

import mlflow
import mlflow.pyfunc
from typing import Optional
from app.core.entities import MedicalFeatures, ModelPrediction
from app.config import Settings

class CardiologyPredictor:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._model = None
        self._model_version = None
        self._load_model()

    def _load_model(self):
        mlflow.set_tracking_uri(self.settings.mlflow_uri)
        model_uri = f"models:/cardiology-diagnosis/{self.settings.model_stage}"  # 'Production'
        self._model = mlflow.pyfunc.load_model(model_uri)
        # получить metadata
        client = mlflow.MlflowClient()
        latest = client.get_latest_versions("cardiology-diagnosis", stages=[self.settings.model_stage])
        self._model_version = f"cardiology-xgb-v{latest[0].version}" if latest else "unknown"

    @property
    def model_version(self) -> str:
        return self._model_version

    def predict(self, features: MedicalFeatures) -> ModelPrediction:
        df = features.to_dataframe()
        proba = self._model.predict(df)[0]
        # XGBoost binary classification: proba is float (probability of class 1)
        prediction_class = 1 if proba > 0.5 else 0
        confidence = max(proba, 1 - proba)

        diagnosis = self._map_class_to_diagnosis(prediction_class, features)

        return ModelPrediction(
            class_id=prediction_class,
            diagnosis=diagnosis,
            confidence=confidence,
            raw_probability=proba,
            feature_importances=self._compute_feature_importance(df),
        )

    def _map_class_to_diagnosis(self, class_id: int, features) -> str:
        if class_id == 0:
            return "Признаков ишемической болезни сердца не выявлено"
        else:
            # Усложненная логика на основе признаков
            if features.cp == 'typical_angina':
                return "Стенокардия напряжения (вероятно)"
            elif features.exang and features.oldpeak > 1.0:
                return "Ишемическая болезнь сердца (вероятно)"
            return "Возможны нарушения сердечно-сосудистой системы"

    def _compute_feature_importance(self, df) -> dict:
        # SHAP values или встроенный feature_importances_
        # для MVP — берем глобальные важности
        return {}  # implement later
```

### 12.4 Retraining Pipeline (готовый скрипт)

```python
# ml/retrain.py
"""
Запускается админом или по расписанию.
Дообучает модель с использованием doctor_feedback.
"""

import mlflow
import pandas as pd
from sqlalchemy import create_engine

def retrain():
    # 1. Загрузить original dataset
    df_original = pd.read_csv("data/raw/uci_heart_disease.csv")

    # 2. Загрузить feedback из БД
    engine = create_engine(...)
    df_feedback = pd.read_sql("""
        SELECT
            ar.extracted_features as features,
            df.corrected_diagnosis,
            df.verdict,
            df.created_at
        FROM doctor_feedback df
        JOIN analysis_reports ar ON ar.id = df.report_id
        WHERE df.verdict IN ('REJECTED', 'PARTIALLY_CORRECT')
    """, engine)

    # 3. Парсим feedback в обучающий формат
    df_feedback_parsed = parse_feedback(df_feedback)

    # 4. Объединяем
    df_combined = pd.concat([df_original, df_feedback_parsed], ignore_index=True)

    # 5. Запускаем training с тэгом 'retrain'
    mlflow.set_experiment("cardiology-diagnosis")
    with mlflow.start_run(tags={"type": "retrain"}):
        # ... training code (reuses train_cardiology.py)
        pass

    # 6. Регистрируем новую версию, но не promote'им автоматически
    # Промоушн в Production делается вручную после валидации

if __name__ == "__main__":
    retrain()
```

### 12.5 MLflow Setup

```bash
# scripts/start_mlflow.sh
#!/bin/bash
mlflow server \
    --host 0.0.0.0 \
    --port 5000 \
    --backend-store-uri sqlite:///mlflow.db \
    --default-artifact-root ./mlruns
```

### 12.6 Acceptance criteria для модели

- ✅ Accuracy ≥ 80% на тестовой выборке
- ✅ ROC-AUC ≥ 0.85
- ✅ Recall (sensitivity) для positive class ≥ 80% — критично для медицины
- ✅ Модель версионируется в MLflow Registry
- ✅ Минимум 3 эксперимента в MLflow для демонстрации (baseline, tuned, retrained)
- ✅ Confusion matrix и classification report в артефактах

---

## 13. Безопасность

### 13.1 Аутентификация и авторизация

**JWT:**
- HS512 алгоритм
- Access token: 15 минут TTL, claims: `{sub: userId, role, iat, exp, jti}`
- Refresh token: 30 дней TTL, хранится в БД (только хеш!), одноразовый (rotation на каждом use)
- Logout = revocation refresh token + опц. blacklist access token в Redis

**Password:**
- BCrypt с work factor 12
- Минимум 8 символов, одна заглавная, одна цифра, один спецсимвол
- Проверка на общеизвестные пароли (top-1000 Pwned Passwords)
- Lockout: 10 неудачных попыток → блокировка на 30 минут

**Rate Limiting:**
- Login: 5 попыток / 5 минут / IP
- AI Analysis start: 10 / час / user
- File upload: 20 / час / user
- API общий: 100 RPS / IP

### 13.2 Защита данных

**At-rest:**
- БД на disk-encryption уровне (для prod)
- Чувствительные поля (ИИН, медицинские заметки) — Application-level encryption через Spring Cloud Vault или прямо AES-256-GCM с ключом из env (для MVP)

**In-transit:**
- HTTPS only (Let's Encrypt в prod, self-signed для dev)
- Internal communication между Java и Python — на одном хосте/Docker network, по HTTP с shared secret

**Files:**
- MinIO bucket private
- Доступ через presigned URLs с TTL 5 минут
- Validation: max 50MB, MIME type whitelist (PDF, JPG, PNG, DICOM)
- Virus scan через ClamAV (опционально для MVP)

### 13.3 Audit Log

Логируется:
- Все login/logout события
- Создание/просмотр/удаление AI-сессий
- Просмотр медицинских данных пациента (кем, когда)
- Изменения статусов аккаунтов
- Все админские действия

### 13.4 GDPR-like compliance (для будущего)

- Right to access: эндпоинт `/me/export` (не делаем в MVP, но проектируем)
- Right to erasure: soft-delete через status, hard-delete через админа
- Consent: явное согласие на обработку данных при AI Analysis (`consent_given`)
- Data minimization: не собираем избыточно

### 13.5 Frontend security

- CSP headers через Nginx
- httpOnly + Secure + SameSite=Strict cookies для refresh tokens (если cookie-based)
- Или: refresh в localStorage (проще, но менее secure — для MVP допустимо с предупреждением)
- XSS: React по умолчанию escape'ит, но проверяем dangerouslySetInnerHTML отсутствие
- CSRF: для cookie-based — CSRF токен; для Bearer — не нужен

### 13.6 Disclaimer'ы и юридические аспекты

**Обязательные disclaimer'ы:**
1. На главном экране AI Analysis: "Это не медицинский сервис. ИИ предоставляет предварительный анализ, не заменяющий консультацию врача."
2. В каждом отчете AI: "Данные предварительные. Окончательный диагноз ставит врач."
3. На emergency: "В экстренных случаях звоните 103 (скорая) или 112 (единая служба)."
4. При регистрации: согласие с условиями использования и политикой конфиденциальности.

**Тексты политик:** заготовки в `/frontend/public/legal/` — Privacy Policy, Terms of Service, Medical Disclaimer.

---

## 14. DevOps

### 14.1 Docker Compose для локальной разработки

```yaml
# docker-compose.yml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: healthcare
      POSTGRES_USER: healthcare
      POSTGRES_PASSWORD: secret
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U healthcare"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

  mlflow:
    build:
      context: ./ai-service
      dockerfile: Dockerfile.mlflow
    ports:
      - "5000:5000"
    volumes:
      - mlflow_data:/mlruns
    command: mlflow server --host 0.0.0.0 --port 5000 --backend-store-uri sqlite:///mlflow.db --default-artifact-root /mlruns

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      DB_URL: jdbc:postgresql://postgres:5432/healthcare
      DB_USER: healthcare
      DB_PASS: secret
      REDIS_HOST: redis
      MINIO_ENDPOINT: http://minio:9000
      AI_SERVICE_URL: http://ai-service:8000
      JWT_SECRET: ${JWT_SECRET:-dev-secret-change-in-prod-must-be-256-bits-long}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started

  ai-service:
    build:
      context: ./ai-service
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://healthcare:secret@postgres:5432/healthcare
      MLFLOW_URI: http://mlflow:5000
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      MINIO_ENDPOINT: http://minio:9000
      INTERNAL_SERVICE_TOKEN: ${INTERNAL_SERVICE_TOKEN:-shared-secret}
      BACKEND_URL: http://backend:8080
    depends_on:
      - postgres
      - mlflow

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "5173:5173"
    environment:
      VITE_API_URL: http://localhost:8080/api/v1
    depends_on:
      - backend

volumes:
  postgres_data:
  minio_data:
  mlflow_data:
```

### 14.2 Backend Dockerfile

```dockerfile
# backend/Dockerfile
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN ./mvnw dependency:go-offline -B
COPY src/ src/
RUN ./mvnw package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### 14.3 AI Service Dockerfile

```dockerfile
# ai-service/Dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    libmagic1 \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*
COPY pyproject.toml .
RUN pip install --no-cache-dir -e .
COPY app/ app/
COPY ml/ ml/
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 14.4 Frontend Dockerfile

```dockerfile
# frontend/Dockerfile (development)
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

# Production:
# FROM node:20-alpine AS build
# WORKDIR /app
# COPY package*.json ./
# RUN npm ci
# COPY . .
# RUN npm run build
#
# FROM nginx:alpine
# COPY --from=build /app/dist /usr/share/nginx/html
# COPY nginx.conf /etc/nginx/conf.d/default.conf
# EXPOSE 80
```

### 14.5 GitHub Actions CI

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: temurin
          cache: maven
      - working-directory: backend
        run: ./mvnw verify

  ai-service:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - working-directory: ai-service
        run: |
          pip install -e ".[dev]"
          ruff check .
          mypy app
          pytest

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      - working-directory: frontend
        run: |
          npm ci
          npm run lint
          npm run typecheck
          npm test
          npm run build
```

### 14.6 .env.example

```bash
# Backend
DB_URL=jdbc:postgresql://localhost:5432/healthcare
DB_USER=healthcare
DB_PASS=secret
JWT_SECRET=dev-secret-256-bit-long-change-this-in-production-please
REDIS_HOST=localhost

# AI Service
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql+asyncpg://healthcare:secret@localhost:5432/healthcare
MLFLOW_URI=http://localhost:5000
INTERNAL_SERVICE_TOKEN=shared-secret-between-services
BACKEND_URL=http://localhost:8080

# Frontend
VITE_API_URL=http://localhost:8080/api/v1

# MinIO
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

---

## 15. Тестирование

### 15.1 Backend (Java)

**Стратегия:** пирамида тестов
- 70% Unit (быстрые, изолированные, mock'и)
- 20% Integration (с Testcontainers — реальный Postgres, Redis)
- 10% E2E (через MockMvc / WebTestClient)

**Что тестируем:**

| Слой | Что тестируем | Инструменты |
|------|---------------|-------------|
| Domain | Бизнес-логика сущностей | JUnit 5 |
| Application | Use cases, оркестрация (mock infra) | JUnit + Mockito |
| Infrastructure | Repositories, integration | Testcontainers |
| API | Контроллеры, валидация | MockMvc |

**Приоритетные тесты для MVP:**
1. AuthService.login — happy path + invalid credentials + locked account
2. AppointmentService.createAppointment — happy + slot taken + concurrent booking (через Testcontainers)
3. AnalysisService.startAnalysis
4. JWT validation
5. AppointmentRepository custom queries

### 15.2 AI Service (Python)

```python
# tests/unit/domains/test_cardiology.py
import pytest
from unittest.mock import AsyncMock, Mock
from app.domains.cardiology import CardiologyDomain

@pytest.mark.asyncio
async def test_emergency_detected_for_high_bp():
    domain = CardiologyDomain(predictor=Mock(), llm=AsyncMock())
    features = MedicalFeatures(systolic_bp=200, diastolic_bp=120)
    result = await domain.check_emergency(features)
    assert result is not None
    assert "скорую" in result.lower()

@pytest.mark.asyncio
async def test_low_confidence_returns_insufficient_data():
    predictor = Mock()
    predictor.predict.return_value = ModelPrediction(
        class_id=1, diagnosis="...", confidence=0.45
    )
    domain = CardiologyDomain(predictor=predictor, llm=AsyncMock())
    features = MedicalFeatures(...)
    diagnosis = await domain.predict(features)
    assert diagnosis.triage_level == "INSUFFICIENT_DATA"
```

**Что тестируем:**
1. Каждый домен (CardiologyDomain — все методы)
2. DiagnosticPipeline — full flow с mock LLM/ML
3. LLM client — структура ответов (фикстуры)
4. Predictor — на тестовых данных
5. Feature extraction
6. API endpoints через TestClient

### 15.3 Frontend

```typescript
// __tests__/AiAnalysisFlow.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('AiAnalysisFlow', () => {
  it('shows disclaimer at start', () => {
    render(<AiAnalysisFlow />);
    expect(screen.getByText(/не заменяет консультацию врача/i)).toBeInTheDocument();
  });

  it('shows emergency banner when triage is EMERGENCY', () => {
    render(<ReportStep report={{ triageLevel: 'EMERGENCY', ... }} />);
    expect(screen.getByText(/НЕМЕДЛЕННО/i)).toBeInTheDocument();
  });
});
```

**Минимум для MVP:**
- Snapshot tests для критичных компонентов
- Тесты Disclaimer и EmergencyBanner — обязательно
- Тест auth flow
- Тест AI Analysis happy path

### 15.4 Quality Gates

```yaml
# В CI должны проходить:
- Backend: coverage >= 60%, no critical SonarQube issues
- AI Service: ruff clean, mypy clean, pytest все зеленые, coverage >= 60%
- Frontend: ESLint clean, type check clean, тесты зеленые
```

---

## 16. Roadmap

### Неделя 1 — Фундамент

**Цель:** работающий каркас всех трех сервисов с auth и базовой БД.

| День | Задача |
|------|--------|
| 1 | Setup репозитория (monorepo), Docker Compose, .env, CI скелет |
| 1 | Backend: Spring Boot init, базовая структура модулей, Flyway, application.yml |
| 2 | Backend: Auth модуль (register/login/refresh/JWT), Security config |
| 2 | Backend: User модуль (Patient + Doctor), миграции |
| 3 | Frontend: Vite + React + TS + Tailwind + shadcn/ui setup, routing, базовые pages |
| 3 | Frontend: Auth pages (Login/Register), API client, AuthProvider |
| 4 | AI Service: FastAPI init, структура Clean Architecture, БД через SQLAlchemy |
| 4 | AI Service: LLM adapter (Claude API), базовая интеграция |
| 5 | Backend ↔ AI Service: первый эндпоинт `/internal/health`, проверка JWT validation |
| 5-6 | ML: загрузить UCI dataset, написать train_cardiology.py, запустить MLflow, обучить baseline модель |
| 7 | Тестирование интеграции, fix bugs, документация в README |

**Дeliverables недели 1:**
- ✅ Можно зарегаться, залогиниться, получить токен
- ✅ MLflow работает, есть обученная модель в Registry
- ✅ Все три сервиса в Docker Compose поднимаются и общаются

### Неделя 2 — AI Analysis Flow

**Цель:** полный цикл AI-анализа от описания до отчета.

| День | Задача |
|------|--------|
| 8 | AI Service: реализация CardiologyDomain (extract_features, generate_question) |
| 8 | AI Service: DiagnosticPipeline (orchestrator) |
| 9 | AI Service: triage rules для кардиологии, confidence handling |
| 9 | AI Service: интеграция MLflow predictor с pipeline |
| 10 | Backend: AI Gateway модуль, проксирующий запросы в Python |
| 10 | Backend: file upload в MinIO, передача в AI |
| 11 | Frontend: AI Analysis Wizard UI (DisclaimerStep, DescriptionStep) |
| 12 | Frontend: QuestionStep с динамическим рендерингом типов вопросов |
| 13 | Frontend: FilesUploadStep, ReportStep, EmergencyBanner |
| 14 | Интеграция end-to-end, fix edge cases |

**Deliverables:**
- ✅ Можно пройти полный AI Analysis от начала до отчета
- ✅ Triage detection работает (показать на demo emergency сценарий)
- ✅ Файлы загружаются и парсятся

### Неделя 3 — Appointments + Doctor Portal

**Цель:** полная цепочка от AI-отчета до записи и feedback врача.

| День | Задача |
|------|--------|
| 15 | Backend: Schedule + TimeSlot domain, генерация слотов |
| 15 | Backend: Appointment модуль (create, cancel, list) |
| 16 | Backend: интеграция AI report со slot recommendation |
| 16 | Backend: Jitsi link generation для онлайн-приемов |
| 17 | Frontend: страница списка врачей с фильтрами |
| 17 | Frontend: SlotPicker + BookingForm |
| 18 | Frontend: Patient appointments page (мои приемы, отмена) |
| 19 | Frontend: Doctor Portal (dashboard, schedule editor) |
| 19 | Frontend: AI Report Review для врача |
| 20 | Frontend: Feedback Form (approve/reject/partial) |
| 21 | Backend: feedback API, сохранение, валидация |

**Deliverables:**
- ✅ Пациент может записаться на прием прямо из AI-отчета
- ✅ Врач видит расписание и AI-отчет
- ✅ Врач может дать feedback, он сохраняется

### Неделя 4 — Admin, Polish, Демо

**Цель:** довести до защиты.

| День | Задача |
|------|--------|
| 22 | Backend + Frontend: Admin модуль (управление пользователями, верификация врачей) |
| 23 | Frontend: ML Monitoring Dashboard (метрики из MLflow) |
| 23 | Backend: Audit Log полный, эндпоинт для админа |
| 24 | ML: написать retrain.py, документация, запустить демонстрационный retrain |
| 24 | AI Service: NeurologyDomain stub для демонстрации расширяемости |
| 25 | Полное E2E тестирование, fix bugs |
| 25 | Seed data: создать тестовых пациентов, врачей, приемы для демо |
| 26 | Документация: README, архитектурные диаграммы, диплом |
| 26 | Подготовка слайдов для защиты |
| 27 | Repetition демо-сценария, repetition защиты |
| 28 | Buffer для непредвиденного |

**Deliverables:**
- ✅ Все 3 портала работают
- ✅ MLflow дашборд в админке
- ✅ Audit log
- ✅ Готов retrain.py с документацией
- ✅ Слайды и диплом
- ✅ Демо-данные засеяны

### 16.1 Критический путь (что нельзя завалить)

1. **Auth + базовая регистрация** — без этого нет вообще ничего
2. **AI Analysis end-to-end** — главная фича, нужна на демо
3. **Запись на прием** — заявлено в названии проекта
4. **ML модель с метриками** — защита от "это просто GPT"
5. **Feedback врача** — защита истории про "ИИ обучается"

### 16.2 Что можно урезать если не успеваешь

- ❌ Видеосвязь Jitsi (можно просто текстовое поле "ссылка будет отправлена в email")
- ❌ NeurologyDomain stub (можно показать только в коде)
- ❌ Retrain pipeline implementation (показать только дизайн)
- ❌ Audit log UI (хранится в БД, показать через psql)
- ❌ E2E Playwright тесты

---

## 17. Демо-сценарий для защиты

### 17.1 Подготовка перед защитой

**Seed data:**
- 5 пациентов (один main для демо: "demo@patient.com")
- 5 верифицированных кардиологов с заполненным расписанием
- 1 админ
- Несколько прошедших приемов с feedback'ами для дашборда
- MLflow с 3 экспериментами (baseline, tuned, retrained)

**Подготовленные сценарии:**
- Сценарий A: Routine кардиологический случай (показывает обычный flow)
- Сценарий B: Emergency (показывает triage)
- Сценарий C: Низкая confidence (показывает honesty системы)

### 17.2 Сценарий демо (15 минут)

**Минута 0-2: Введение**
- Кратко проблема: первичный прием, доступность, AI без обратной связи
- Ваше решение в одном предложении

**Минута 2-3: Главный экран**
- Открыть как пациент
- Показать UI: предстоящие приемы, история, кнопка AI Analysis
- Кликнуть AI Analysis → Disclaimer

**Минута 3-7: AI Analysis (Сценарий A — Routine)**
- Описать симптомы
- Ответить на 4-5 вопросов (заранее знаешь ответы для лучшей confidence)
- Загрузить ЭКГ-снимок (показать прогресс, превью)
- Получить отчет: диагноз, confidence, рекомендации, слоты
- Выбрать слот → Записаться

**Минута 7-9: Doctor Portal**
- Logout → Login как Doctor
- Dashboard → видим нового пациента → AI Report
- Показать структурированные данные: features, диагноз модели, объяснение, версия модели
- Approve диагноз с комментарием

**Минута 9-10: Admin Portal — ML Monitoring**
- Logout → Login как Admin
- Dashboard ML
- Показать metrics, confidence distribution, последние feedback'и
- Открыть MLflow → 3 эксперимента, метрики, артефакты

**Минута 10-12: Архитектура**
- Слайд с архитектурой: domain-agnostic engine
- Показать в коде: интерфейс MedicalDomain, CardiologyDomain implementation, NeurologyDomain stub
- "Чтобы добавить неврологию — нужно реализовать этот интерфейс и добавить модель"

**Минута 12-13: Сценарий B (если есть время) — Emergency**
- Новая сессия, описать симптомы инфаркта
- Получить EMERGENCY баннер
- Показать что система не предлагает запись, а отправляет к скорой

**Минута 13-15: Заключение**
- Что сделано (чек-лист)
- Что в Future Work (видеоинтеграция, новые домены, RAG, federated learning, мобильные клиенты, партнерства с клиниками)
- Q&A

### 17.3 Чек-лист "за час до защиты"

- [ ] `docker compose up -d` поднялся
- [ ] Все три сервиса доступны (curl health checks)
- [ ] MLflow UI открывается, есть эксперименты
- [ ] Тестовый login работает для всех трех ролей
- [ ] LLM API key валиден, есть кредиты
- [ ] Файлы для загрузки готовы (ЭКГ снимок, PDF заключение)
- [ ] Сценарии прорепетированы 2 раза
- [ ] Запасной видео-демо записан (на случай если что-то упадет)
- [ ] Слайды (PDF) на флешке + в облаке
- [ ] Распечатанная версия диплома + презентация

---

## 18. FAQ для комиссии

### Технические вопросы

**В: Почему именно XGBoost, а не нейросеть?**
**О:** Для задач на табличных данных (наш случай — 14 признаков) XGBoost — state-of-the-art. Нейросети проигрывают на маленьких датасетах. XGBoost дает лучшую интерпретируемость через feature importance, что критично для медицины — врач должен понимать, на основании чего модель сделала вывод.

**В: Почему PostgreSQL, а не MongoDB?**
**О:** Медицинские данные имеют четкую структуру и связи (пациент → приемы → врачи → специализации). Реляционная модель — естественный выбор. PostgreSQL дает ACID-гарантии, важные для записей на прием (нельзя забронировать один слот двум пациентам). Для гибких полей мы используем JSONB.

**В: Почему Spring Boot, а не Quarkus / Micronaut?**
**О:** Spring Boot — индустриальный стандарт с самой большой экосистемой и community. Spring Modulith дает модульную архитектуру без сложности микросервисов. Для MVP это оптимально.

**В: Почему два сервиса (Java + Python), а не один?**
**О:** Разделение по технологическим компетенциям. Java/Spring — лучшая экосистема для бизнес-логики, security, транзакций. Python — стандарт de facto для ML. Соединять их в монолит — навязывать один стек неподходящим задачам. Между сервисами — тонкий REST-слой.

**В: Как защищены данные пациентов?**
**О:** Все данные шифруются in-transit (HTTPS) и at-rest (database encryption). Пароли — BCrypt. JWT короткоживущие. Файлы — в private bucket с presigned URLs. Audit log всех доступов. Чувствительные поля (заметки врача) — application-level encryption.

**В: Что если LLM API ляжет?**
**О:** В архитектуре заложен fallback: основной провайдер — Claude, secondary — OpenAI. Адаптеры взаимозаменяемы. Если оба недоступны — сессия помечается FAILED, пациент видит сообщение "временные технические проблемы, попробуйте позже или запишитесь напрямую к врачу" — деградация в core-функционал записи.

### Медицинские/этические вопросы

**В: Несет ли разработчик ответственность за неверный диагноз?**
**О:** Юридически — мы не ставим диагнозы. Все экраны содержат disclaimer "это не медицинский диагноз". Финальное решение принимает врач. В Terms of Service четко указано, что сервис носит информационный характер. В production-внедрении понадобится медицинская лицензия и страхование.

**В: Что если ИИ упустит инфаркт?**
**О:** У нас многоуровневая защита: (1) triage rules для emergency симптомов с высоким recall, (2) при низкой confidence — направление к врачу, (3) врач — финальная инстанция. Recall positive class в нашей модели > 80%, что является приемлемым для скрининга. Также: на этапе MVP мы не работаем с реальными пациентами, это академическая работа.

**В: Откуда уверенность что ИИ улучшается с feedback?**
**О:** Feedback collection — это первый шаг. Сам retraining — отдельный процесс с валидацией. Перед промоушеном новой версии в Production она должна показать non-inferior метрики на golden test set. Реализовано как ML governance: feedback → retraining → validation → human approval → deploy. Автоматического "ИИ учится сам" нет — это спроектировано.

**В: Как вы выбрали кардиологию?**
**О:** Три причины: (1) причина смертности №1 в Казахстане по данным ВОЗ, (2) наличие качественных открытых датасетов (UCI Heart Disease — gold standard для академических работ), (3) кардиологические признаки структурированы (возраст, давление, ЭКГ-показатели), что позволяет сделать ML-модель без работы с unstructured data типа МРТ-снимков.

### Архитектурные вопросы

**В: Как добавить новую специализацию?**
**О:** Шаги:
1. Создать новый класс `NewDomain(MedicalDomain)` в `app/domains/`
2. Реализовать методы интерфейса (extract_features, generate_question, predict, ...)
3. Создать prompts для LLM, специфичные для домена
4. Подготовить датасет, обучить модель через train скрипт, зарегистрировать в MLflow
5. Зарегистрировать домен в `DomainRegistry` при старте сервиса
6. Добавить запись в таблицу `specializations` с `has_ai_support=true`

Никаких изменений в core-pipeline или БД-схеме. Это и есть domain-agnostic архитектура.

**В: Spring Modulith — это микросервисы?**
**О:** Нет, это монолит с явными модулями. Каждый модуль имеет свой публичный API и не может напрямую обращаться к internals других модулей (проверяется на этапе билда). Это дает преимущества микросервисов (изоляция, ясные границы) без их сложности (network overhead, distributed transactions). При росте можно extract'ить модуль в отдельный сервис.

**В: Почему Clean Architecture в Python?**
**О:** Те же причины что для Java: разделение ответственности, тестируемость, замена реализаций (например, переключение между LLM-провайдерами без изменения domain-логики). Python проекты часто страдают от смешения слоев — мы это явно не допускаем.

### Будущее

**В: Что Future Work?**
**О:**
- Расширение специализаций (неврология, эндокринология, дерматология)
- Партнерства с клиниками для real-world датасетов и валидации
- RAG поверх медицинской литературы (PubMed, UpToDate)
- Federated learning — обучение на данных клиник без их выгрузки
- Анализ медицинских изображений (CNN для рентгенов, ЭКГ-ритмов)
- Мобильные приложения
- Интеграция с электронными медицинскими картами (МИС)
- Получение медицинской лицензии и партнерство с минздравом
- Интеграция с страховыми компаниями
- Multi-language support
- Голосовой ввод симптомов
