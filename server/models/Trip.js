import mongoose from "mongoose";

const tripSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    members: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
          maxlength: 100
        }
      }
    ],
    expenses: [
      {
        description: {
          type: String,
          required: true,
          trim: true,
          maxlength: 160
        },
        amountPaise: {
          type: Number,
          required: true,
          min: 1,
          validate: Number.isSafeInteger
        },
        paidBy: {
          type: mongoose.Schema.Types.ObjectId,
          required: true
        },
        date: {
          type: Date,
          required: true
        }
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.model("Trip", tripSchema);
