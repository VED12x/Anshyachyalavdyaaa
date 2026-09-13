# DiabetesCare 360

DiabetesCare 360 is a comprehensive diabetes management platform backend designed to integrate glucose readings, dietary analysis, risk assessment, and actionable insights for patients and healthcare providers.

## Architecture Overview

The system consists of two primary services backed by PostgreSQL (with TimescaleDB) and Redis:
- **API Service:** A Node.js based REST API handling authentication, CRUD operations, and core business logic.
- **ML Service:** A Python based service utilizing Random Forest and LSTM models for glucose forecasting and risk classification.
- **Databases:**
  - PostgreSQL with TimescaleDB for time-series data (e.g., glucose readings).
  - Redis for caching and rate limiting.

## Prerequisites

- Docker Desktop

## Quickstart (Local Development without Docker)

If you don't have Docker installed, you can run the services natively using Node.js and Python.

### Prerequisites
1. **Node.js** (v18+)
2. **Python** (v3.10+)
3. **PostgreSQL** (v15+) with the **TimescaleDB** extension installed natively.
4. **Redis** (running locally)

### 1. Environment Setup
```bash
cp .env.example .env
# Edit .env and update DATABASE_URL and REDIS_URL to point to your local native instances
```

### 2. Run the ML Service (Python)
```bash
cd ml-service
# Create virtual environment and install dependencies
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# Start the service
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Run the Core API (Node.js)
Open a *new* terminal window:
```bash
cd api
npm install

# Run database migrations and seed data
npm run migrate
npm run seed

# Start the API
npm run dev
```

Both services are now running natively. The API is at `http://localhost:3000` and the ML service is at `http://localhost:8000`.

## Publishing / Production Deployment

If you are ready to publish this project and do not want to use Docker, we recommend using a **Platform-as-a-Service (PaaS)** like **Render** or **Railway**. 

We have provided a `render.yaml` file in the root directory that defines the entire infrastructure as code.
See [docs/deployment.md](./docs/deployment.md) for full publishing instructions without Docker.

## API Documentation Overview

Key endpoints grouped by domain:

- **Auth**
  - `POST /auth/login` - Authenticate user
  - `POST /auth/register` - Register a new user
- **Glucose Readings**
  - `GET /glucose-readings` - Fetch readings (supports time ranges)
  - `POST /glucose-readings` - Add a new reading
- **Dashboard**
  - `GET /dashboard/summary` - Get patient summary and insights

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `POSTGRES_USER` | DB user |
| `POSTGRES_PASSWORD` | DB password |
| `POSTGRES_DB` | Database name |
| `REDIS_URL` | Redis connection URL |
| `JWT_SECRET` | Secret for access token |
| `JWT_REFRESH_SECRET` | Secret for refresh token |
| `JWT_ACCESS_EXPIRY` | Expiration for access token |
| `JWT_REFRESH_EXPIRY` | Expiration for refresh token |
| `ML_SERVICE_URL` | Internal URL for ML service |
| `API_PORT` | Port for the Node API |
| `NODE_ENV` | Environment (development/production) |
| `RATE_LIMIT_WINDOW_MS` | Rate limiting window in ms |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window |

## Development Workflow

- The API service uses `npm run dev` with volumes mapped to local files for hot reloading.
- The ML service uses `uvicorn` with `--reload` flag for hot reloading.
- To run tests (inside the containers):
  - Node API: `docker-compose exec api npm test`
  - ML Service: `docker-compose exec ml-service pytest`

## Project Structure

```
.
├── api/                # Node.js API Service
├── ml-service/         # Python ML Service
├── docs/               # Documentation
├── .github/            # CI/CD Workflows
├── docker-compose.yml  # Docker Compose configuration
├── .env.example        # Example environment variables
└── README.md           # Project documentation
```

## License

MIT

# Anshyachyalavdyaaa
