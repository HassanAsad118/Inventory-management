require("dotenv").config();

const express = require("express");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const connectDB = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is missing from .env");
}

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(express.json({ limit: "10kb" }));

let sessionReady;

function getSessionMiddleware() {
  if (!sessionReady) {
    sessionReady = connectDB()
      .then((client) =>
        session({
          name: "inventory.sid",
          secret: process.env.SESSION_SECRET,
          resave: false,
          saveUninitialized: false,
          store: MongoStore.create({
            client,
            collectionName: "sessions",
          }),
          cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 1000 * 60 * 60 * 24,
          },
        }),
      )
      .catch((error) => {
        sessionReady = undefined;
        throw error;
      });
  }
  return sessionReady;
}

app.use(["/api/auth", "/api/products"], async (req, res, next) => {
  const middleware = await getSessionMiddleware();
  middleware(req, res, next);
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use(express.static("public"));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Inventory API is running",
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === "entity.parse.failed")
    return res.status(400).json({ error: "Invalid JSON." });
  if (error.type === "entity.too.large")
    return res.status(413).json({ error: "Request is too large." });
  console.error(error.message);
  res.status(500).json({ error: "Something went wrong." });
});

module.exports = app;

if (require.main === module) {
  getSessionMiddleware()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
      });
    })
    .catch((error) => {
      console.error("Database connection failed:", error.message);
      process.exitCode = 1;
    });
}
