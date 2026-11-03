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

app.use(
    session({
        name: "devixo.sid",
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGODB_URI,
            collectionName: "sessions",
        }),
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 1000 * 60 * 60 * 24,
        },
    })
);

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use(express.static("public"));

// A simple endpoint for checking whether the server responds.
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "Inventory API is running",
    });
});

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error("Database connection failed:", error.message);
        process.exit(1);
    });
