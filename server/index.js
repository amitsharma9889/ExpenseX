import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import customersRouter from "./routes/customers.js";
import expensesRouter from "./routes/expenses.js";
import tripsRouter from "./routes/trips.js";
import authRouter from "./routes/auth.js";
import { requireAuth } from "./middleware/requireAuth.js";

const app = express();
const port = Number(process.env.PORT) || 5000;

app.use(
  cors({
    origin: [
      process.env.CLIENT_ORIGIN || "http://localhost:5173",
      "http://127.0.0.1:5173"
    ]
  })
);
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});
app.use("/api/auth", authRouter);
app.use("/api/customers", requireAuth, customersRouter);
app.use("/api/expenses", requireAuth, expensesRouter);
app.use("/api/trips", requireAuth, tripsRouter);

app.use((error, _request, response, _next) => {
  if (error.code === 11000) {
    return response.status(409).json({ message: "An account or customer with that email already exists." });
  }
  if (error.name === "ValidationError" || error.name === "CastError") {
    return response.status(400).json({ message: error.message });
  }

  console.error(error);
  return response.status(500).json({ message: "Something went wrong on the server." });
});

try {
  if (process.env.NODE_ENV === "production" && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
    throw new Error("Set a JWT_SECRET with at least 32 characters before starting in production.");
  }
  await mongoose.connect(
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/expense-tracker"
  );
  await mongoose.connection.collection("expenses").updateMany(
    { amountPaise: { $exists: false }, amountCents: { $exists: true } },
    { $rename: { amountCents: "amountPaise" } }
  );
  const customerIndexes = await mongoose.connection.collection("customers").indexes();
  const oldEmailIndex = customerIndexes.find(
    (index) => index.unique && index.key.email === 1 && Object.keys(index.key).length === 1
  );
  if (oldEmailIndex) {
    await mongoose.connection.collection("customers").dropIndex(oldEmailIndex.name);
  }
  app.listen(port, () => {
    console.log(`Expense tracker API is running at http://localhost:${port}`);
  });
} catch (error) {
  console.error("Could not connect to MongoDB:", error.message);
  process.exit(1);
}
