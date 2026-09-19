import pg from "pg";
import "dotenv/config";

if (!process.env.DATABASE_URL) {
  console.error(
    "Missing DATABASE_URL. Copy .env.example to .env and fill in a real connection string first."
  );
  process.exit(1);
}

// A single shared connection pool. This backend only ever runs SELECT
// queries — see routes/*.js — it has no code path that writes, updates,
// or deletes anything in the real database.
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

export const SUPPRESSION_MIN = Number(process.env.SUPPRESSION_MIN || 20);
