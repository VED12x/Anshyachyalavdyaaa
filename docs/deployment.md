# Production Deployment Guide (100% Free Tier)

To deploy this project completely for free without being asked for a credit card, you must use a combination of services that offer generous "forever free" tiers. Automated Blueprints often require a credit card on file for verification, so we will deploy the components manually.

## 1. Database (Supabase)
Supabase provides a free, managed PostgreSQL database.
1. Go to [Supabase](https://supabase.com/) and create a free account.
2. Click **New Project** and choose a strong database password.
3. Once created, go to **Settings > Database**.
4. Scroll down to **Connection String > URI** and copy it.
   *(It will look like `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`)*

## 2. Redis Cache (Upstash)
Upstash provides a free, serverless Redis database.
1. Go to [Upstash](https://upstash.com/) and create a free account.
2. Click **Create Database** (Name it `dc360`, Type: Redis).
3. Scroll down to the **Node.js / ioredis** section and copy the connection string.
   *(It will look like `rediss://default:[password]@[endpoint]:[port]`)*

## 3. Web Servers (Render)
Render allows you to host Web Services for free, provided you create them manually instead of using a Blueprint.

**Step A: Deploy the Python ML Service**
1. Go to [Render](https://render.com/) and click **New + > Web Service**.
2. Connect your GitHub repository.
3. Configure the service:
   - **Name**: `dc360-ml-service`
   - **Root Directory**: `ml-service`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: **Free**
4. Click **Create Web Service**. Wait for it to deploy, then copy the live URL (e.g., `https://dc360-ml-service.onrender.com`).

**Step B: Deploy the Node.js API**
1. Go back to the Render dashboard and click **New + > Web Service**.
2. Connect your GitHub repository again.
3. Configure the service:
   - **Name**: `dc360-api`
   - **Root Directory**: `api`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run migrate && npm run start`
   - **Instance Type**: **Free**
4. Click **Advanced > Add Environment Variable**. Add the following:
   - `DATABASE_URL`: (Paste your Supabase URL here)
   - `REDIS_URL`: (Paste your Upstash URL here)
   - `ML_SERVICE_URL`: (Paste the URL of your deployed Python ML service here)
   - `JWT_SECRET`: (Type any long random password)
   - `JWT_REFRESH_SECRET`: (Type another long random password)
5. Click **Create Web Service**.

## 4. Connecting the Frontend
Once everything is deployed, Render will provide you with a public URL for your Node.js API (e.g., `https://dc360-api.onrender.com`).
Update your frontend application's environment configuration to point to this new live URL.g., keep daily backups for 7 days, weekly for a month).

## Scaling Considerations
- **API Service:** Stateless and easily horizontally scalable. You can run multiple instances behind a load balancer.
- **ML Service:** Computationally heavier. May need independent scaling or GPU-backed instances depending on model complexity.
- **Database:** Monitor CPU/Memory. TimescaleDB can be scaled vertically, or horizontally using multi-node configurations if data volume becomes massive. Redis can be clustered if caching needs grow.
