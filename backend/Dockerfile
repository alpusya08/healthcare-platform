# ─── Stage 1: build ────────────────────────────────────────────
FROM maven:3.9.9-eclipse-temurin-21 AS builder
WORKDIR /workspace

COPY pom.xml ./
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B -q -DskipTests package

# ─── Stage 2: run ──────────────────────────────────────────────
FROM eclipse-temurin:21-jre
WORKDIR /app

RUN groupadd -r app && useradd -r -g app app
COPY --from=builder /workspace/target/*.jar app.jar
RUN chown -R app:app /app
USER app

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
