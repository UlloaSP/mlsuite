# Build
FROM maven:3.9.16-eclipse-temurin-25@sha256:dd8e01b3be719853578c07b57ff8d9bbbbfe746f802226f05b19689420815221 AS build
WORKDIR /workspace
COPY ./pom.xml .
RUN mvn -q -Dmaven.test.skip=true dependency:go-offline
COPY ./src ./src
RUN mvn -q -Dmaven.test.skip=true package

# Runtime stage
FROM eclipse-temurin:25-jre-alpine@sha256:2ca9adf44f5c29d28ecd26cf92d75cc0c66b7f32bfd839a4439e363a8b428af8
RUN apk upgrade --no-cache libexpat

WORKDIR /app
COPY --from=build /workspace/target/*.jar /app/app.jar
EXPOSE 8080
ENTRYPOINT ["java","-XX:+UseG1GC","-XX:MaxRAMPercentage=75.0","-jar","/app/app.jar"]
