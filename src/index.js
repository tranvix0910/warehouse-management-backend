// libraries
import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "./document/swagger.json" with { type: "json" };
import multer from "multer";

// import routes
import authRoutes from "./routes/auth.js";
import userRoutes from './routes/user.js'
import productRoutes from './routes/product.js'
import transactionRoutes from './routes/transaction.js'
import supplierRoutes from './routes/supplier.js'
import customerRoutes from './routes/customers.js'
import reportRoutes from './routes/report.js'
import aiRoutes from './routes/ai.js'
import settingsRoutes from './routes/settings.js'

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

// connect database
mongoose.set("strictQuery", false);
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_CONNECTION);
    console.log("connect database successful");
  } catch (error) {
    console.log("connect database failed:", error.message);
  }
};

// middle wares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use(cookieParser());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes)
app.use("/api/v1/products", productRoutes)
app.use("/api/v1/transactions", transactionRoutes)
app.use("/api/v1/suppliers", supplierRoutes)
app.use("/api/v1/customers", customerRoutes)
app.use("/api/v1/reports", reportRoutes)
app.use("/api/v1/ai", aiRoutes)
app.use("/api/v1/settings", settingsRoutes)

// Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Global error handler:", err);
  console.error("❌ Error stack:", err.stack);
  
  // Multer errors
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`,
    });
  }
  
  // Mongoose validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: Object.values(err.errors).map(e => e.message),
    });
  }
  
  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    details: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

app.listen(port, () => {
  connectDB();
  console.log(`📄 Swagger Docs: http://localhost:${port}/api-docs`);
  console.log(`connect sever successful at http://localhost:${port}`);
});
