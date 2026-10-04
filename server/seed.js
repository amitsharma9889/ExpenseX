import "dotenv/config";
import mongoose from "mongoose";
import Customer from "./models/Customer.js";
import Expense from "./models/Expense.js";
import Trip from "./models/Trip.js";
import User from "./models/User.js";
import bcrypt from "bcryptjs";

try {
  await mongoose.connect(
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/expense-tracker"
  );

  await Expense.deleteMany({});
  await Customer.deleteMany({});
  await Trip.deleteMany({});

  const demoPasswordHash = await bcrypt.hash("Demo1234!", 12);
  const demoUser = await User.findOneAndUpdate(
    { email: "amit@example.com" },
    { name: "Amit Sharma", email: "amit@example.com", passwordHash: demoPasswordHash },
    { new: true, upsert: true, runValidators: true }
  );

  const customers = await Customer.insertMany([
    { name: "Olivia Martin", email: "olivia@example.com", company: "Northstar Studio", owner: demoUser._id },
    { name: "James Chen", email: "james@example.com", company: "Brightside Labs", owner: demoUser._id },
    { name: "Ava Patel", email: "ava@example.com", company: "Fieldwork Co.", owner: demoUser._id }
  ]);

  await Expense.insertMany([
    {
      description: "Client kickoff lunch",
      category: "Meals",
      amountPaise: 6840,
      date: new Date(),
      customer: customers[0]._id,
      owner: demoUser._id
    },
    {
      description: "Design software subscription",
      category: "Software",
      amountPaise: 2499,
      date: new Date(Date.now() - 86400000 * 2),
      customer: customers[1]._id,
      owner: demoUser._id
    },
    {
      description: "Train to project site",
      category: "Travel",
      amountPaise: 5375,
      date: new Date(Date.now() - 86400000 * 5),
      customer: customers[2]._id,
      owner: demoUser._id
    },
    {
      description: "Workshop supplies",
      category: "Office",
      amountPaise: 3275,
      date: new Date(Date.now() - 86400000 * 9),
      customer: customers[0]._id,
      owner: demoUser._id
    }
  ]);

  const demoTrip = new Trip({
    name: "Goa weekend",
    owner: demoUser._id,
    members: [
      { name: "Amit Sharma" },
      { name: "Ravi Kumar" },
      { name: "Neha Singh" }
    ]
  });
  demoTrip.expenses.push(
    {
      description: "Hotel booking",
      amountPaise: 1200000,
      paidBy: demoTrip.members[0]._id,
      date: new Date(Date.now() - 86400000 * 4)
    },
    {
      description: "Fuel",
      amountPaise: 420000,
      paidBy: demoTrip.members[1]._id,
      date: new Date(Date.now() - 86400000 * 3)
    },
    {
      description: "Group dinner",
      amountPaise: 300000,
      paidBy: demoTrip.members[2]._id,
      date: new Date(Date.now() - 86400000 * 2)
    }
  );
  await demoTrip.save();

  console.log("Added demo customers, expenses, and a Goa group trip.");
  console.log("Demo sign-in: amit@example.com / Demo1234!");
} catch (error) {
  console.error("Could not seed the database:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
