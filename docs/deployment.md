# Production Deployment Guide (Cloud / PaaS)

This project has been configured for a **1-click automated deployment** using [Render](https://render.com/), a Platform as a Service (PaaS). 

Because we have removed the strict dependency on TimescaleDB, you **do not** need to sign up for Supabase, Timescale Cloud, or any third-party database. Render will provision and host the entire stack for you automatically using standard PostgreSQL.

## 1-Click Publishing to Render

I have created a `render.yaml` file in the root of the project. This is an Infrastructure-as-Code file that tells Render exactly how to build and publish your project natively.

1. Push this entire project to a **GitHub repository**.
2. Go to [Render](https://render.com/) and create a free account.
3. Click **New +** and select **Blueprint**.
4. Connect your GitHub account and select your repository.

That's it! Render will automatically read the `render.yaml` file and deploy 4 things simultaneously:
1. **`dc360-db`**: A managed PostgreSQL database.
2. **`dc360-redis`**: A managed Redis Cache.
3. **`dc360-api`**: The Node.js Core API (automatically linked to the DB and Redis).
4. **`dc360-ml-service`**: The Python ML Service.

### Environment Variables
All critical environment variables (like `DATABASE_URL`, `REDIS_URL`, and secure `JWT_SECRET` keys) are **automatically generated and linked** by the Blueprint. You do not need to configure them manually!

## 2. Run Database Migrations
Once the API is live, you need to set up the database tables on your new Postgres instance. 

1. In the Render Dashboard, click on your `dc360-api` service.
2. Go to the **Shell** tab (this gives you terminal access to your live Node server).
3. Run the migrations and seed data:
   ```bash
   npm run migrate
   npm run seed
   ```

## 3. Connecting the Frontend
Once everything is deployed, Render will provide you with a public URL for your API (e.g., `https://dc360-api-xxxxx.onrender.com`).
Update your frontend application's environment configuration to point to this new live URL.g., keep daily backups for 7 days, weekly for a month).

## Scaling Considerations
- **API Service:** Stateless and easily horizontally scalable. You can run multiple instances behind a load balancer.
- **ML Service:** Computationally heavier. May need independent scaling or GPU-backed instances depending on model complexity.
- **Database:** Monitor CPU/Memory. TimescaleDB can be scaled vertically, or horizontally using multi-node configurations if data volume becomes massive. Redis can be clustered if caching needs grow.
