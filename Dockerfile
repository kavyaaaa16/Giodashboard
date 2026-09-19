# --- MedLingo Dashboard Backend ---
# Minimal production image: install deps, copy source, run.
# No build step needed (plain Node/Express, no bundler).

FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

# DATABASE_URL, PORT, SUPPRESSION_MIN are supplied at deploy time as
# Container App environment variables / secrets — never baked into the image.
EXPOSE 4000

CMD ["node", "src/server.js"]
