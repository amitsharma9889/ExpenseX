# Ledgerly — MERN expense tracker

A small full-stack expense tracker for keeping customer records and recording expenses against each customer. It is intentionally built with straightforward React components and Express routes, so it is approachable to explain in an interview.

## Features

- Add, edit, and delete customer records.
- Create an account and sign in; each account only sees its own customers, expenses, and trips.
- Add, edit, and delete expenses linked to a customer.
- Create group trips, record who paid each shared expense, and calculate per-person balances and suggested repayments.
- Filter the dashboard by customer.
- See total spending, current-month spending, transaction count, average transaction, and a category breakdown.
- Validate expense amounts and store them as integer paise in MongoDB to avoid floating-point rounding errors.
- Load realistic customer, expense, and group-trip demo records.

## Requirements

- Node.js 18 or newer
- MongoDB running locally, or a MongoDB connection string

## Run locally

Open a terminal in the project folder:

```bash
npm run install:all
```

Copy `server/.env.example` to `server/.env` if you need to change the MongoDB connection, API port, frontend origin, or JWT signing key. The defaults connect to `mongodb://127.0.0.1:27017/expense-tracker`. The local frontend is allowed at both `localhost:5173` and `127.0.0.1:5173`. For production, set `JWT_SECRET` to a random value of at least 32 characters and configure it as a private server environment variable.

Load sample customers, expenses, and a group trip (this resets these collections for this demo database):

```bash
npm run seed
```

The seed command also creates a demo account: `amit@example.com` / `Demo1234!`. Creating your own account is available from the app's sign-in screen.

Start the API and React development server:

```bash
npm run dev
```

Open http://localhost:5173. The API runs at http://localhost:5000.

Run the server's amount-conversion tests:

```bash
npm test
```

## How it works

1. **React** displays the dashboard and sends HTTP requests using `fetch` in `client/src/api.js`.
2. **Express** serves account routes and protects customer, expense, and trip routes with bearer tokens.
3. **Mongoose** validates and stores password hashes, account-owned customer and expense documents, and trips in **MongoDB**.
4. Expense amounts are accepted as decimal strings such as `"12.34"` and converted to `1234` paise before storage. Totals add integer paise; the UI formats the result as INR. Existing demo records stored with the old `amountCents` field are migrated to `amountPaise` when the server starts. Expense dates are calendar dates, so the UI avoids shifting them when displaying dates across time zones.
5. For group trips, each person's balance is what they paid minus their equal share. If the total cannot split evenly by a paisa, the extra paisa is assigned in the order the friends were added. Suggested payments settle the balances without rounding errors.

## API at a glance

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Check that the API is running |
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Get the signed-in account |
| GET, POST | `/api/customers` | List or create customers |
| PUT, DELETE | `/api/customers/:id` | Edit or delete a customer |
| GET, POST | `/api/expenses` | List or create expenses |
| PUT, DELETE | `/api/expenses/:id` | Edit or delete an expense |
| GET, POST | `/api/trips` | List or create group trips |
| POST | `/api/trips/:tripId/expenses` | Add a shared trip expense |
| DELETE | `/api/trips/:tripId/expenses/:expenseId` | Remove a shared trip expense |

Deleting a customer with recorded expenses is blocked to avoid leaving unassigned expense records. Customer email addresses must be unique.

## A simple interview walkthrough

- Start by explaining the three main pieces: React UI, Express API, and MongoDB data models.
- Show how an expense refers to a customer using a MongoDB ObjectId.
- Point out `server/utils/money.js`: converting the form amount to integer paise prevents imprecise decimal addition.
- Add an expense, filter by its customer, and show the dashboard totals changing.
- Create a trip, add expenses under the friends who paid, and explain the final net balances and suggested repayments.
- Explain that account passwords are hashed before storage, and bearer-token authentication scopes data to the signed-in account.
- Explain that the summary is calculated from the expense records in the browser, while the API validates writes and MongoDB persists them.

This is a portfolio/demo starter, not a production accounting system. Authentication uses seven-day bearer tokens stored in browser local storage. Records created before account support have no owner and are not shown to signed-in accounts; export or back up anything important before switching an existing database to account-based access. Use HTTPS and private environment variables when hosting it, and add rate limiting, email verification, and password reset before using it for real financial data. It uses a fixed INR display and does not include multi-currency support.
