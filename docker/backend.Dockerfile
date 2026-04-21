FROM node:24-alpine AS builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/prisma ./prisma/
RUN npx prisma generate
COPY backend/ .
RUN npm run build

FROM node:24-alpine AS production
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/dist ./dist
COPY backend/prisma ./prisma/
EXPOSE 3000
CMD ["node", "dist/main"]
