# Load Test Results

## Test Methodology
- **Tool:** k6 (or autocannon)
- **Environment:** Staging / Local (Specify which)
- **Duration:** 5 minutes
- **Virtual Users (VUs):** 50 concurrent users
- **Date:** YYYY-MM-DD

## Endpoints Tested
- `GET /dashboard/summary` - Aggregates data for the dashboard.
- `GET /glucose-readings` - Fetches time-series data.
- `POST /auth/login` - Authentication endpoint (bcrypt hashing overhead).

## Acceptance Criteria
- **Latency:** Sync within a few seconds under light load (p95 < 2s).
- **Error Rate:** < 1% for standard operations.

## Results

| Endpoint | Requests/sec | p50 Latency (ms) | p95 Latency (ms) | p99 Latency (ms) | Error Rate (%) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST /auth/login` | [TBD] | [TBD] | [TBD] | [TBD] | [TBD] |
| `GET /dashboard/summary` | [TBD] | [TBD] | [TBD] | [TBD] | [TBD] |
| `GET /glucose-readings` | [TBD] | [TBD] | [TBD] | [TBD] | [TBD] |

## Observations & Bottlenecks
- *(To be filled after running tests)*
- e.g., "The login endpoint is CPU bound due to bcrypt, consider increasing API instances."
- e.g., "Dashboard summary query needs an index on `(patient_id, timestamp)`."

## Next Steps
- Run tests against a larger synthetic dataset to observe TimescaleDB degradation.
