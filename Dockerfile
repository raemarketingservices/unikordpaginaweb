FROM node:22-alpine AS build
WORKDIR /app
ENV NITRO_PRESET=node-server
# Vite inlinece estos valores en el bundle: cambian en build, no en runtime.
ARG VITE_DATA_SOURCE=cloudflare
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_GOOGLE_OAUTH=false
ENV VITE_DATA_SOURCE=$VITE_DATA_SOURCE \
    VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_GOOGLE_OAUTH=$VITE_GOOGLE_OAUTH
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0
COPY --from=build /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
