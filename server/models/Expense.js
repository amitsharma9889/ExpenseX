import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160
    },
    category: {
      type: String,
      required: true,
      enum: ["Travel", "Meals", "Software", "Office", "Other"]
    },
    amountPaise: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isSafeInteger
    },
    date: {
      type: Date,
      required: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("Expense", expenseSchema);
