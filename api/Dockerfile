# syntax=docker/dockerfile:1

# Build: Maven's repository lives in a BuildKit cache, so a changed pom downloads only what is new.
FROM maven:3.9.16-eclipse-temurin-25@sha256:dd8e01b3be719853578c07b57ff8d9bbbbfe746f802226f05b19689420815221 AS build
WORKDIR /workspace
COPY ./pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -q -Dmaven.test.skip=true dependency:go-offline
COPY ./src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -q -Dmaven.test.skip=true package \
    && cp target/mlsuite-*.jar app.jar \
    && java -Djarmode=tools -jar app.jar extract --layers --destination extracted

# Runtime: one image layer per Spring Boot layer, the ones that change least first, so a code
# change ships only the application layer.
FROM eclipse-temurin:25-jre-alpine@sha256:2ca9adf44f5c29d28ecd26cf92d75cc0c66b7f32bfd839a4439e363a8b428af8 AS runtime
RUN apk upgrade --no-cache

WORKDIR /app
COPY --from=build /workspace/extracted/dependencies/ ./
COPY --from=build /workspace/extracted/spring-boot-loader/ ./
COPY --from=build /workspace/extracted/snapshot-dependencies/ ./
COPY --from=build /workspace/extracted/application/ ./

# A JDK 25 AOT cache (JEP 483/514) from a training run that starts the context and exits at once:
# the classes it loads and links are ready when the container starts. The run has no database or
# storage, so it skips what would reach them; every value below exists only for this run.
RUN env SPRING_PROFILES_ACTIVE=prod SPRING_PORT=8080 LOG_PATH=/tmp \
    DB_HOST=localhost DB_PORT=5432 DB_PROD=mlsuite DB_USER=mlsuite DB_PASS=unused \
    ANALYZER_BASE_URL=http://localhost RUNTIME_BUILDER_BASE_URL=http://localhost \
    CORS_ALLOW_ORIGINS=http://localhost STORAGE_ENDPOINT=http://localhost \
    STORAGE_ACCESS_KEY=unused STORAGE_SECRET_KEY=unused STORAGE_BUCKET=unused \
    STORAGE_AUTO_CREATE_BUCKET=false \
    PREDICTION_ATTESTATION_SECRET=aot-training-only-aot-training-only \
    java -XX:+UseG1GC -XX:AOTCacheOutput=app.aot \
    -Dspring.context.exit=onRefresh \
    -Dspring.flyway.enabled=false \
    -Dspring.jpa.hibernate.ddl-auto=none \
    -Dspring.jpa.properties.hibernate.boot.allow_jdbc_metadata_access=false \
    -Dspring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect \
    -jar app.jar

EXPOSE 8080
# The class path must read as it did in the training run, or the JVM ignores the cache.
# The cache's adapters are machine code for the CPU that built the image: on one without its
# instructions (shelob has no AVX) they crash with SIGILL, so the JVM regenerates them instead.
ENTRYPOINT ["java","-XX:+UseG1GC","-XX:MaxRAMPercentage=75.0","-XX:+UnlockDiagnosticVMOptions","-XX:-AOTAdapterCaching","-XX:AOTCache=app.aot","-jar","app.jar"]
