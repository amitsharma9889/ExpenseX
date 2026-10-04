import { Router } from "express";
import mongoose from "mongoose";
import Trip from "../models/Trip.js";
import { rupeesToPaise } from "../utils/money.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { calculateTripBalances } from "../utils/tripBalances.js";

const router = Router();

function readTrip(body = {}) {
  body = body || {};
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const rawNames = typeof body.members === "string" ? body.members.split(/\r?\n/) : [];
  const members = rawNames.map((member) => member.trim()).filter(Boolean);
  const uniqueNames = new Set(members.map((member) => member.toLocaleLowerCase()));

  if (!name || name.length > 100) {
    return { error: "Enter a trip name of up to 100 characters." };
  }
  if (members.length < 2 || members.length > 30) {
    return { error: "Add between 2 and 30 friends, one name per line." };
  }
  if (members.some((member) => member.length > 100)) {
    return { error: "Each friend name must be 100 characters or fewer." };
  }
  if (uniqueNames.size !== members.length) {
    return { error: "Each friend needs a different name." };
  }

  return { trip: { name, members: members.map((member) => ({ name: member })) } };
}

function readTripExpense(body = {}, trip) {
  body = body || {};
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const amountPaise = rupeesToPaise(body.amount);
  const date = typeof body.date === "string" ? body.date : "";
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T00:00:00.000Z`)
    : null;
  const validDate =
    parsedDate &&
    !Number.isNaN(parsedDate.getTime()) &&
    parsedDate.toISOString().slice(0, 10) === date;

  if (!description || description.length > 160) {
    return { error: "Add an expense description of up to 160 characters." };
  }
  if (amountPaise === null) {
    return { error: "Enter an amount greater than zero with up to 2 decimal places." };
  }
  if (!validDate) {
    return { error: "Choose a valid expense date." };
  }
  if (!mongoose.isValidObjectId(body.paidBy)) {
    return { error: "Choose who paid for this expense." };
  }
  if (!trip.members.some((member) => member._id.equals(body.paidBy))) {
    return { error: "The person who paid must be a member of this trip." };
  }

  return {
    expense: {
      description,
      amountPaise,
      paidBy: body.paidBy,
      date: parsedDate
    }
  };
}

router.get("/", asyncHandler(async (request, response) => {
  const trips = await Trip.find({ owner: request.userId }).sort({ createdAt: -1 }).lean();
  return response.json(
    trips.map((trip) => ({
      ...trip,
      summary: calculateTripBalances(trip)
    }))
  );
}));

router.post("/", asyncHandler(async (request, response) => {
  const result = readTrip(request.body);
  if (result.error) {
    return response.status(400).json({ message: result.error });
  }

  const trip = await Trip.create({ ...result.trip, owner: request.userId });
  return response.status(201).json(trip);
}));

router.post("/:tripId/expenses", asyncHandler(async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.tripId)) {
    return response.status(400).json({ message: "Invalid trip." });
  }

  const trip = await Trip.findOne({ _id: request.params.tripId, owner: request.userId });
  if (!trip) {
    return response.status(404).json({ message: "Trip not found." });
  }

  const result = readTripExpense(request.body, trip);
  if (result.error) {
    return response.status(400).json({ message: result.error });
  }

  trip.expenses.push(result.expense);
  await trip.save();
  return response.status(201).json(trip);
}));

router.delete("/:tripId/expenses/:expenseId", asyncHandler(async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.tripId)) {
    return response.status(400).json({ message: "Invalid trip." });
  }

  const trip = await Trip.findOne({ _id: request.params.tripId, owner: request.userId });
  if (!trip) {
    return response.status(404).json({ message: "Trip not found." });
  }

  const expense = trip.expenses.id(request.params.expenseId);
  if (!expense) {
    return response.status(404).json({ message: "Trip expense not found." });
  }

  expense.deleteOne();
  await trip.save();
  return response.status(204).end();
}));

export default router;
