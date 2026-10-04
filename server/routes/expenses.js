import { Router } from "express";
import mongoose from "mongoose";
import Customer from "../models/Customer.js";
import Expense from "../models/Expense.js";
import { rupeesToPaise } from "../utils/money.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
const categories = ["Travel", "Meals", "Software", "Office", "Other"];

function readExpense(body = {}) {
  const { description, category, amount, date, customer } = body;
  const amountPaise = rupeesToPaise(amount);

  if (typeof description !== "string" || !description.trim() || description.trim().length > 160) {
    return { error: "Add a description of 1 to 160 characters." };
  }
  if (!categories.includes(category)) {
    return { error: "Choose a valid expense category." };
  }
  if (amountPaise === null) {
    return { error: "Enter an amount greater than zero with up to 2 decimal places." };
  }
  const dateParts = typeof date === "string" && date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const parsedDate = dateParts ? new Date(`${date}T00:00:00.000Z`) : null;
  const validDate =
    parsedDate &&
    !Number.isNaN(parsedDate.getTime()) &&
    parsedDate.toISOString().slice(0, 10) === date;
  if (!validDate) {
    return { error: "Choose a valid expense date." };
  }
  if (!mongoose.isValidObjectId(customer)) {
    return { error: "Choose a valid customer." };
  }

  return {
    expense: {
      description: description.trim(),
      category,
      amountPaise,
      date: new Date(date),
      customer
    }
  };
}

async function customerExists(customerId, ownerId) {
  return Boolean(await Customer.exists({ _id: customerId, owner: ownerId }));
}

router.get("/", asyncHandler(async (request, response) => {
  const filter = { owner: request.userId };
  if (request.query.customer) {
    if (!mongoose.isValidObjectId(request.query.customer)) {
      return response.status(400).json({ message: "Invalid customer filter." });
    }
    filter.customer = request.query.customer;
  }

  const expenses = await Expense.find(filter)
    .populate("customer", "name company")
    .sort({ date: -1, createdAt: -1 })
    .lean();
  return response.json(expenses);
}));

router.post("/", asyncHandler(async (request, response) => {
  const result = readExpense(request.body);
  if (result.error) {
    return response.status(400).json({ message: result.error });
  }
  if (!(await customerExists(result.expense.customer, request.userId))) {
    return response.status(400).json({ message: "That customer does not exist." });
  }

  const expense = await Expense.create({ ...result.expense, owner: request.userId });
  await expense.populate("customer", "name company");
  return response.status(201).json(expense);
}));

router.put("/:id", asyncHandler(async (request, response) => {
  const result = readExpense(request.body);
  if (result.error) {
    return response.status(400).json({ message: result.error });
  }
  if (!(await customerExists(result.expense.customer, request.userId))) {
    return response.status(400).json({ message: "That customer does not exist." });
  }

  const expense = await Expense.findOneAndUpdate(
    { _id: request.params.id, owner: request.userId },
    { ...result.expense, owner: request.userId },
    { new: true, runValidators: true }
  ).populate("customer", "name company");

  if (!expense) {
    return response.status(404).json({ message: "Expense not found." });
  }

  return response.json(expense);
}));

router.delete("/:id", asyncHandler(async (request, response) => {
  const expense = await Expense.findOneAndDelete({ _id: request.params.id, owner: request.userId });
  if (!expense) {
    return response.status(404).json({ message: "Expense not found." });
  }

  return response.status(204).end();
}));

export default router;
