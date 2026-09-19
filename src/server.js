import express from "express";
import cors from "cors";
import "dotenv/config";
import encountersRouter from "./routes/encounters.js";
import metricsRouter from "./routes/metrics.js";
import artifactsRouter from "./routes/artifacts.js";

const app = express();
// CORS: locked to FRONTEND_URL if set (do this before deploying), otherwise
// permissive for local dev. Never leave this permissive once real traffic exists.
if (process.env.FRONTEND_URL) {
  app.use(cors({ origin: process.env.FRONTEND_URL }));
  console.log(`CORS locked to: ${process.env.FRONTEND_URL}`);
} else {
  app.use(cors());
  console.log("CORS is OPEN (no FRONTEND_URL set) — fine for local dev, not for deployment.");
}
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api", encountersRouter);
app.use("/api", metricsRouter);
app.use("/api", artifactsRouter);

if (!process.env.ELEVATED_ACCESS_TOKEN) {
  console.warn(
    "\n⚠️  ELEVATED_ACCESS_TOKEN is not set — artifact download endpoints will refuse all requests until it is.\n" +
    "   This is expected if you haven't set up artifact download yet. See .env.example.\n"
  );
}

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`MedLingo dashboard backend (LOCAL PROTOTYPE — no auth, do not deploy) listening on http://localhost:${port}`);
});
