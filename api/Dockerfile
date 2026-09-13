FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# Development target
FROM base AS dev
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Production build
FROM base AS build
RUN npm ci --only=production
COPY . .
RUN npm run build

# Production target
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
EXPOSE 3000
ENV NODE_ENV=production
USER node
CMD ["node", "dist/index.js"]
