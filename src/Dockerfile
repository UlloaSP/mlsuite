# Build
FROM maven:3.9.11-eclipse-temurin-25 AS build
WORKDIR /workspace
COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline
COPY src ./src
RUN mvn -q -DskipTests package

# Runtime stage
FROM eclipse-temurin:25-jre-alpine
WORKDIR /app
COPY --from=build /workspace/target/*.jar /app/app.jar
EXPOSE 8443
ENTRYPOINT ["java","-XX:+UseG1GC","-XX:MaxRAMPercentage=75.0","-jar","/app/app.jar","--server.port=${SERVER_PORT}"]
