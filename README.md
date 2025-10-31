# MLSuite - Plataforma de Gestión de Modelos de Machine Learning

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Java](https://img.shields.io/badge/Java-25-orange)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5.7-green)
![Python](https://img.shields.io/badge/Python-3.14+-blue)
![React](https://img.shields.io/badge/React-19-61DAFB)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED)

## 📋 Descripción General

**MLSuite** es una plataforma integral para la gestión, análisis y despliegue de modelos de Machine Learning. Proporciona una solución completa que integra:

- **Backend Java**: API REST con Spring Boot 3.5.7 para gestión de modelos, predicciones y usuarios
- **Backend Python**: Servicio FastAPI especializado en análisis y predicciones con scikit-learn
- **Frontend React**: Interfaz moderna construida con React 19, Vite y TypeScript
- **Base de datos**: PostgreSQL para persistencia de datos
- **Infraestructura**: Docker Compose para despliegue containerizado

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React + Vite)                   │
│                   Puerto: 5173 (desarrollo)                      │
└───────────────────────┬─────────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────────┐
│             Spring Boot API (Java 25 + Spring Boot 3.5.7)        │
│             Puerto: 8443 | Base de datos: PostgreSQL             │
├─────────────────────────────────────────────────────────────────┤
│ Módulos:                                                         │
│  • User: Gestión de usuarios y autenticación OAuth2             │
│  • Model: CRUD de modelos de ML                                 │
│  • Prediction: Motor de predicciones                            │
│  • Signature: Firmas digitales de modelos                       │
│  • Security: Autenticación (GitHub, Google)                    │
│  • Analyzer: Integración con servicio de análisis               │
└───────────────────────┬─────────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
┌───────▼──────────────┐    ┌──────────▼──────────────┐
│ Python Analyzer API  │    │   PostgreSQL Database   │
│ (FastAPI)            │    │   Puerto: 5432          │
│ Puerto: 8000         │    │                         │
│                      │    │                         │
│ • Metadata Extract   │    │ • Users                │
│ • Schema Building    │    │ • Models               │
│ • Predictions       │    │ • Predictions          │
└──────────────────────┘    │ • Targets              │
                            │ • Signatures           │
                            └────────────────────────┘
```

## 🚀 Tecnologías

### Backend Java (Spring Boot)
- **Framework**: Spring Boot 3.5.7
- **Java**: 25
- **Seguridad**: Spring Security + OAuth2 (GitHub, Google)
- **JWT**: jjwt 0.13.0 para tokens
- **Database**: PostgreSQL + H2 (testing)
- **ORM**: Spring Data JPA + Hibernate
- **Testing**: JUnit 5 + TestContainers
- **Validación**: Hibernate Validator

### Backend Python (FastAPI)
- **Framework**: FastAPI 0.120.3
- **ASGI**: Uvicorn 0.38.0
- **ML**: scikit-learn 1.7.2 + joblib 1.5.2
- **Data**: pandas 2.3.3
- **Schema**: mlschema 0.1.2
- **CORS**: Middleware para comunicación cross-origin

### Frontend (React + Vite)
- **Framework**: React 19
- **Build**: Vite 7.1.12
- **Lenguaje**: TypeScript 5.9.3
- **Estilos**: Tailwind CSS
- **Editor**: Monaco Editor (React)
- **Routing**: React Router v7
- **Estado**: Jotai (atoms) + React Query
- **Formularios**: mlform 0.1.2
- **Animaciones**: Motion

### Infraestructura
- **Containerización**: Docker + Docker Compose
- **Base de Datos**: PostgreSQL 18
- **Networking**: Docker Network personalizada
- **Volúmenes**: Persistencia de datos PostgreSQL

## 📁 Estructura del Proyecto

```
mlsuite/
├── README.md
├── docker-compose.yml          # Configuración de servicios
├── pom.xml                     # Maven - Backend Java
│
├── backend/                    # Servicio Python FastAPI
│   ├── Dockerfile
│   ├── main.py                 # Aplicación principal
│   ├── pyproject.toml          # Dependencias Python
│   └── README.md
│
├── frontend/                   # Aplicación React
│   ├── Dockerfile
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx
│   │   ├── Layout.tsx
│   │   ├── app/                # Lógica de aplicación
│   │   │   ├── api/            # Llamadas API
│   │   │   ├── atoms.ts        # Estado global (Jotai)
│   │   │   ├── components/     # Componentes reutilizables
│   │   │   ├── pages/          # Páginas principales
│   │   │   ├── models/         # Tipos TypeScript
│   │   │   ├── router/         # Configuración de rutas
│   │   │   └── user/           # Lógica de usuario
│   │   └── @types/             # Definiciones de tipos
│   └── public/                 # Activos estáticos
│
├── src/                        # Backend Java
│   ├── main/
│   │   ├── java/dev/ulloasp/mlsuite/
│   │   │   ├── MlsuiteApplication.java     # Clase principal
│   │   │   ├── model/                      # Gestión de modelos
│   │   │   │   ├── controllers/
│   │   │   │   ├── services/
│   │   │   │   └── entities/
│   │   │   ├── prediction/                 # Motor de predicciones
│   │   │   │   ├── controllers/
│   │   │   │   ├── services/
│   │   │   │   └── entities/
│   │   │   ├── user/                       # Gestión de usuarios
│   │   │   │   ├── controller/
│   │   │   │   ├── service/
│   │   │   │   └── entity/
│   │   │   ├── signature/                  # Firmas de modelos
│   │   │   │   ├── controllers/
│   │   │   │   ├── services/
│   │   │   │   └── entities/
│   │   │   ├── security/                   # Configuración de seguridad
│   │   │   └── util/                       # Utilidades
│   │   └── resources/
│   │       ├── application.properties      # Config producción
│   │       └── application-test.properties # Config testing
│   └── test/java/                          # Tests unitarios
│
└── Dockerfile                              # Dockerfile para Java
```

## 🔧 Módulos Java

### 1. **User Module**
Gestión de usuarios y autenticación.

**Entidades:**
- `User`: Información del usuario y perfil
- `OAuthProvider`: Proveedores OAuth (GitHub, Google)

**Endpoints:**
- `GET /api/users/{id}` - Obtener usuario
- `POST /api/users` - Crear usuario
- `PUT /api/users/{id}` - Actualizar usuario
- `DELETE /api/users/{id}` - Eliminar usuario

### 2. **Model Module**
Gestión del ciclo de vida de modelos ML.

**Entidades:**
- `Model`: Definición de modelo (nombre, versión, metadata)

**Controladores:**
- `ModelController`: CRUD de modelos
- `AnalyzerController`: Integración con servicio Python

**Endpoints:**
- `GET /api/models` - Listar modelos
- `POST /api/models` - Crear modelo
- `GET /api/models/{id}` - Obtener modelo
- `PUT /api/models/{id}` - Actualizar modelo
- `DELETE /api/models/{id}` - Eliminar modelo
- `POST /api/analyzer/metadata` - Extraer metadatos
- `POST /api/analyzer/schema` - Generar esquema

### 3. **Prediction Module**
Motor de predicciones y gestión de targets.

**Entidades:**
- `Prediction`: Resultado de predicción
- `Target`: Variable objetivo para predicciones
- `PredictionStatus`: Estado de predicción

**Endpoints:**
- `POST /api/predictions` - Crear predicción
- `GET /api/predictions/{id}` - Obtener predicción
- `GET /api/predictions` - Listar predicciones
- `GET /api/targets` - Listar targets
- `POST /api/targets` - Crear target

### 4. **Signature Module**
Firmas digitales de modelos para validación.

**Entidades:**
- `Signature`: Firma digital de modelo

**Endpoints:**
- `POST /api/signatures` - Crear firma
- `GET /api/signatures/{id}` - Verificar firma

### 5. **Security Module**
Autenticación OAuth2 y seguridad.

**Componentes:**
- `SecurityConfig`: Configuración Spring Security
- `OAuth2AuthenticationSuccessHandler`: Manejo post-autenticación

**Proveedores soportados:**
- GitHub
- Google

## 🐍 Endpoints Python (FastAPI)

### Health Check
- **GET `/health`** - Verifica el estado del servicio

### Metadata Extraction
- **POST `/metadata`** - Extrae metadatos de modelo sklearn
  ```json
  {
    "fileName": "model.joblib",
    "type": "classifier|regressor",
    "specificType": "RandomForestClassifier"
  }
  ```

### Schema Building
- **POST `/build_schema`** - Genera esquema MLSchema
  - Parámetros: modelo (.joblib) + datos opcionales (.joblib)
  - Retorna: esquema JSON con tipos de datos y salidas

### Predictions
- **POST `/predict`** - Realiza predicciones
  - Parámetros: modelo (.joblib) + datos JSON
  - Retorna: predicción con probabilidades (clasificador) o valores (regresor)

## 📦 Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:

```env
# Database
DB_HOST=postgres
DB_PORT=5432
DB_PROD=mlsuite_db
DB_USER=postgres
DB_PASS=your_secure_password

# Services
SPRING_PORT=8443
PYTHON_PORT=8000
WEB_PORT=5173

# OAuth2 - GitHub
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# OAuth2 - Google
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## 🐳 Docker Compose Services

### PostgreSQL
- **Puerto**: 5432 (configurable)
- **Usuario**: postgres
- **Base de datos**: mlsuite_db
- **Volumen**: pg_data (persistencia)
- **Health Check**: Activo

### Python Analyzer
- **Puerto**: 8000
- **Dependencias**: PostgreSQL
- **Volumen**: Código fuente

### Spring Boot API
- **Puerto**: 8443 (HTTPS)
- **Dependencias**: PostgreSQL
- **Variables de entorno**: OAuth2, database
- **Volumen**: Código fuente

### Frontend
- **Puerto**: 5173 (desarrollo) / 80 (producción)
- **Dependencias**: Spring Boot API
- **Variables de entorno**: URL backend

## 🚀 Inicio Rápido

### Requisitos Previos
- Docker y Docker Compose instalados
- Java 25+ (para desarrollo local)
- Python 3.14+ (para desarrollo local backend)
- Node.js 18+ (para desarrollo local frontend)
- Git

### 1. Clonar el Repositorio
```bash
git clone https://github.com/UlloaSP/mlsuite.git
cd mlsuite
```

### 2. Configurar Variables de Entorno
```bash
cp .env.example .env
# Editar .env con tus valores
```

### 3. Iniciar con Docker Compose
```bash
# Iniciar todos los servicios
docker compose up -d --build

# Ver logs
docker compose logs -f

# Detener servicios
docker compose down -v
```

### 4. Acceder a la Aplicación
- **Frontend**: https://localhost:5173
- **API Backend**: https://localhost:8443
- **Python Analyzer**: https://localhost:8000
- **Base de datos**: localhost:5432

## 💻 Desarrollo Local

### Backend Java

```bash
# Compilar
mvn clean package

# Ejecutar
mvn spring-boot:run

# Tests
mvn test

# Coverage
mvn test jacoco:report
```

**Aplicación en**: http://localhost:8443

### Backend Python

```bash
cd backend

# Instalar dependencias
pip install -r requirements.txt
# o usar uv
uv sync

# Ejecutar
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**API en**: http://localhost:8000/docs

### Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Desarrollo con hot reload
npm run dev

# Build producción
npm run build

# Preview producción
npm run preview
```

**Aplicación en**: http://localhost:5173

## 🧪 Testing

### Java Tests
```bash
# Ejecutar todos los tests
mvn test

# Test específico
mvn test -Dtest=UserServiceTest

# Con covertura
mvn test jacoco:report
```

**Tests disponibles:**
- UserServiceTest, UserControllerTest
- ModelServiceTest, ModelControllerTest
- PredictionServiceTest, PredictionControllerTest
- TargetServiceTest, TargetControllerTest
- SignatureServiceTest, SignatureControllerTest
- AnalyzerControllerTest
- SecurityConfigTest
- OAuth2AuthenticationSuccessHandlerTest
- PredictionStatusTest
- ErrorDtoTest
- Múltiples exception tests

### Python Tests
```bash
cd backend
pytest
```

## 🔐 Seguridad

### Autenticación
- **OAuth2**: GitHub y Google
- **JWT**: Tokens con JJWT
- **HTTPS**: SSL/TLS obligatorio en producción
- **CORS**: Configurado para desarrollo

### Validación
- **Validación de entrada**: Hibernate Validator
- **Seguridad de base datos**: Prepared Statements
- **Control de acceso**: Spring Security

## 🔗 Flujo de Autenticación

```
1. Usuario hace login con GitHub/Google
2. OAuth2AuthenticationSuccessHandler procesa el token
3. Backend genera JWT
4. Frontend almacena JWT
5. Requests posteriores incluyen Authorization: Bearer <JWT>
6. Spring Security valida JWT en cada request
```

## 📊 Flujo de Predicción

```
1. Usuario carga modelo (.joblib) en frontend
2. Frontend envía a Spring API
3. Spring invoca Python analyzer para extraer metadatos
4. Metadata se almacena en BD
5. Usuario envía datos para predicción
6. Spring invoca Python analyzer con modelo + datos
7. Python retorna predicción
8. Spring almacena resultado en BD
9. Frontend muestra resultado
```

## 📝 Logging

### Spring Boot
```properties
# application.properties
logging.level.root=INFO
logging.level.dev.ulloasp.mlsuite=DEBUG
logging.pattern.console=%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n
```

### Python
```python
import logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
```

## 🐛 Troubleshooting

### Conexión rechazada a PostgreSQL
```bash
# Verificar que el contenedor está corriendo
docker compose ps

# Ver logs de PostgreSQL
docker compose logs postgres
```

### Frontend no puede conectar a backend
- Verificar `VITE_BACKEND_URL` en `.env`
- Revisar CORS en Spring Security
- Verificar SSL certificates

### Modelo no tiene feature_names_in_
- Asegurar que el modelo fue entrenado con pandas DataFrames
- O usar `sklearn.preprocessing.ColumnTransformer`

## 📈 Monitoreo

### Spring Actuator
- **GET `/actuator`** - Endpoints disponibles
- **GET `/actuator/health`** - Estado de salud
- **GET `/actuator/metrics`** - Métricas

### Docker
```bash
# CPU, memoria, etc.
docker compose stats

# Logs en tiempo real
docker compose logs -f [service_name]
```

## 🤝 Contribuir

1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo licencia MIT.

## 👥 Autores

- **Autor**: UlloaSP
- **Email**: [tu-email@example.com]

## 🔗 Enlaces

- [GitHub Repository](https://github.com/UlloaSP/mlsuite)
- [Spring Boot Docs](https://spring.io/projects/spring-boot)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Docs](https://react.dev)
- [Docker Docs](https://docs.docker.com/)

## 📞 Soporte

Para reportar problemas o sugerencias:
- Abre una [GitHub Issue](https://github.com/UlloaSP/mlsuite/issues)
- Contacta al equipo de desarrollo

---

**Última actualización**: Octubre 2025
**Versión**: 0.1.0
**Estado**: En desarrollo
