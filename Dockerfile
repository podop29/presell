FROM node:20-slim

RUN apt-get update && apt-get install -y \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libgbm1 libpango-1.0-0 libcairo2 libasound2 libatspi2.0-0 \
    libglib2.0-0 libdbus-1-3 libx11-xcb1 \
    fonts-noto-color-emoji fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci
RUN npx playwright install chromium

COPY . .

# Next.js inlines NEXT_PUBLIC_ vars at build time — pass them as build args
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN npm run build

ENV PORT=8080
ENV HOSTNAME=0.0.0.0

EXPOSE 8080

# Use node directly — not npm/npx — so signals are handled properly
CMD ["node", "node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "8080"]
