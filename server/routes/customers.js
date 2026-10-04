import { Router } from "express";
import Customer from "../models/Customer.js";
import Expense from "../models/Expense.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(async (request, response) => {
  const customers = await Customer.find({ owner: request.userId }).sort({ name: 1 }).lean();
  response.json(customers);
}));

router.post("/", asyncHandler(async (request, response) => {
  const { name, email, company = "" } = request.body || {};

  if (typeof name !== "string" || !name.trim() || typeof email !== "string" || !email.trim()) {
    return response.status(400).json({ message: "Name and email are required." });
  }

  const customer = await Customer.create({ name, email, company, owner: request.userId });
  return response.status(201).json(customer);
}));

router.put("/:id", asyncHandler(async (request, response) => {
  const { name, email, company = "" } = request.body || {};

  if (typeof name !== "string" || !name.trim() || typeof email !== "string" || !email.trim()) {
    return response.status(400).json({ message: "Name and email are required." });
  }

  const customer = await Customer.findOneAndUpdate(
    { _id: request.params.id, owner: request.userId },
    { name, email, company },
    { new: true, runValidators: true }
  );

  if (!customer) {
    return response.status(404).json({ message: "Customer not found." });
  }

  return response.json(customer);
}));

router.delete("/:id", asyncHandler(async (request, response) => {
  const customer = await Customer.findOne({ _id: request.params.id, owner: request.userId });

  if (!customer) {
    return response.status(404).json({ message: "Customer not found." });
  }

  const hasExpenses = await Expense.exists({ customer: customer._id, owner: request.userId });
  if (hasExpenses) {
    return response.status(409).json({
      message: "Move or delete this customer's expenses before deleting them."
    });
  }

  await customer.deleteOne();
  return response.status(204).end();
}));

export default router;
