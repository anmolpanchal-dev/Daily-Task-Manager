const dns = require("dns");

dns.setServers(["8.8.8.8", "1.1.1.1"]);


require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

if (require.main === module && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured.");
}

const app = express();

// =========================
// CORS
// =========================

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  process.env.CLIENT_ORIGIN,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      const isVercelOrigin =
        origin.endsWith(".vercel.app");

      if (allowedOrigins.includes(origin) || isVercelOrigin) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// =========================
// Middleware
// =========================

app.use(express.json({ limit: "50kb" }));

// =========================
// Health Check
// =========================

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// =========================
// Routes
// =========================

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);

// =========================
// Error Handling
// =========================

app.use(notFound);
app.use(errorHandler);

// =========================
// Server
// =========================

async function start() {
  try {
    await connectDB();

    const port = Number(process.env.PORT) || 5000;

    app.listen(port, "0.0.0.0", () => {
      console.log(`TaskFlow API listening on port ${port}`);
    });
  } catch (error) {
    console.error("Unable to start server:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = app;

