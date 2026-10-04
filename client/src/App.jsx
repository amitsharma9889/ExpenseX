import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "./api.js";

const CATEGORIES = ["Travel", "Meals", "Software", "Office", "Other"];
const CATEGORY_COLORS = {
  Travel: "#6e8fe6",
  Meals: "#eda76b",
  Software: "#9d83da",
  Office: "#58aa8a",
  Other: "#a2a9b5"
};

function formatMoney(paise) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR"
  }).format(paise / 100);
}

function formatDate(value) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(year, month - 1, day));
}

function dateForInput(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitForm(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const details = {
      email: form.get("email"),
      password: form.get("password")
    };
    if (mode === "register") {
      details.name = form.get("name");
    }

    try {
      const result = await apiRequest(`/auth/${mode === "register" ? "register" : "login"}`, {
        method: "POST",
        body: JSON.stringify(details)
      });
      onAuthenticated(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <a className="brand auth-brand" href="#login" aria-label="ExpenseX">
          <span className="brand-mark">X</span>
          <span>ExpenseX<span className="brand-period">.</span></span>
        </a>
        <div className="auth-eyebrow">YOUR MONEY, IN GOOD ORDER</div>
        <h1>{mode === "register" ? "Create your account" : "Welcome back"}</h1>
        <p className="auth-intro">
          {mode === "register"
            ? "Create a private workspace for your customers, expenses, and trip splits."
            : "Sign in to see your customers, expenses, and shared trips."}
        </p>
        <div className="auth-tabs" role="tablist" aria-label="Account access">
          <button type="button" className={mode === "login" ? "selected" : ""} onClick={() => { setMode("login"); setError(""); }}>Sign in</button>
          <button type="button" className={mode === "register" ? "selected" : ""} onClick={() => { setMode("register"); setError(""); }}>Create account</button>
        </div>
        <form className="form-fields auth-form" onSubmit={submitForm}>
          {error && <div className="form-error" role="alert">{error}</div>}
          {mode === "register" && (
            <label>Your name<input name="name" autoComplete="name" placeholder="e.g. Amit Sharma" required maxLength="100" /></label>
          )}
          <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength="160" /></label>
          <label>Password<input name="password" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} placeholder={mode === "register" ? "At least 8 characters" : "Enter your password"} minLength={mode === "register" ? 8 : undefined} maxLength="72" required /></label>
          <button className="button button-primary auth-submit" disabled={submitting}>
            {submitting ? "Please wait…" : mode === "register" ? "Create account" : "Sign in"}
          </button>
        </form>
        <p className="auth-privacy">Your account data is private to your sign-in.</p>
      </section>
    </main>
  );
}

function App() {
  const [customers, setCustomers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("all");
  const [modal, setModal] = useState(null);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  function openModal(nextModal) {
    setFormError("");
    setModal(nextModal);
  }

  async function loadData() {
    setError("");
    try {
      const [customerData, expenseData, tripData] = await Promise.all([
        apiRequest("/customers"),
        apiRequest("/expenses"),
        apiRequest("/trips")
      ]);
      setCustomers(customerData);
      setExpenses(expenseData);
      setTrips(tripData);
      setSelectedTripId((current) =>
        tripData.some((trip) => trip._id === current) ? current : tripData[0]?._id || ""
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem("ledgerlyToken");

    function expireSession() {
      if (active) {
        setUser(null);
        setCustomers([]);
        setExpenses([]);
        setTrips([]);
        setSelectedCustomer("all");
        setSelectedTripId("");
      }
    }

    window.addEventListener("ledgerly:session-expired", expireSession);
    if (!token) {
      setAuthChecking(false);
      return () => {
        active = false;
        window.removeEventListener("ledgerly:session-expired", expireSession);
      };
    }

    apiRequest("/auth/me")
      .then((result) => {
        if (active) setUser(result.user);
      })
      .catch(() => {
        localStorage.removeItem("ledgerlyToken");
      })
      .finally(() => {
        if (active) setAuthChecking(false);
      });

    return () => {
      active = false;
      window.removeEventListener("ledgerly:session-expired", expireSession);
    };
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user?.id]);

  function handleAuthenticated(result) {
    localStorage.setItem("ledgerlyToken", result.token);
    setUser(result.user);
    setSelectedCustomer("all");
    setSelectedTripId("");
    setLoading(true);
  }

  function logout() {
    localStorage.removeItem("ledgerlyToken");
    setUser(null);
    setCustomers([]);
    setExpenses([]);
    setTrips([]);
    setSelectedCustomer("all");
    setSelectedTripId("");
  }

  const visibleExpenses = useMemo(() => {
    if (selectedCustomer === "all") {
      return expenses;
    }
    return expenses.filter((expense) => expense.customer?._id === selectedCustomer);
  }, [expenses, selectedCustomer]);

  const totals = useMemo(() => {
    const totalPaise = visibleExpenses.reduce((sum, expense) => sum + expense.amountPaise, 0);
    const now = new Date();
    const thisMonthPaise = visibleExpenses
      .filter((expense) => {
        const [year, month] = expense.date.slice(0, 10).split("-").map(Number);
        return month === now.getMonth() + 1 && year === now.getFullYear();
      })
      .reduce((sum, expense) => sum + expense.amountPaise, 0);

    return {
      totalPaise,
      thisMonthPaise,
      count: visibleExpenses.length,
      averagePaise: visibleExpenses.length ? Math.round(totalPaise / visibleExpenses.length) : 0
    };
  }, [visibleExpenses]);

  const categoryTotals = useMemo(() => {
    const grouped = {};
    for (const expense of visibleExpenses) {
      grouped[expense.category] = (grouped[expense.category] || 0) + expense.amountPaise;
    }
    return Object.entries(grouped)
      .map(([category, amountPaise]) => ({ category, amountPaise }))
      .sort((first, second) => second.amountPaise - first.amountPaise);
  }, [visibleExpenses]);

  async function saveCustomer(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const customer = {
      name: form.get("name"),
      email: form.get("email"),
      company: form.get("company")
    };

    try {
      const path = modal.customer ? `/customers/${modal.customer._id}` : "/customers";
      const method = modal.customer ? "PUT" : "POST";
      await apiRequest(path, { method, body: JSON.stringify(customer) });
      setModal(null);
      setFormError("");
      await loadData();
    } catch (requestError) {
      setFormError(requestError.message);
    }
  }

  async function saveExpense(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const expense = {
      description: form.get("description"),
      category: form.get("category"),
      amount: form.get("amount"),
      date: form.get("date"),
      customer: form.get("customer")
    };

    try {
      const path = modal.expense ? `/expenses/${modal.expense._id}` : "/expenses";
      const method = modal.expense ? "PUT" : "POST";
      await apiRequest(path, { method, body: JSON.stringify(expense) });
      setModal(null);
      setFormError("");
      await loadData();
    } catch (requestError) {
      setFormError(requestError.message);
    }
  }

  async function saveTrip(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const trip = {
      name: form.get("name"),
      members: form.get("members")
    };

    try {
      const savedTrip = await apiRequest("/trips", {
        method: "POST",
        body: JSON.stringify(trip)
      });
      setSelectedTripId(savedTrip._id);
      setModal(null);
      setFormError("");
      await loadData();
    } catch (requestError) {
      setFormError(requestError.message);
    }
  }

  async function saveTripExpense(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const expense = {
      description: form.get("description"),
      amount: form.get("amount"),
      date: form.get("date"),
      paidBy: form.get("paidBy")
    };

    try {
      await apiRequest(`/trips/${selectedTripId}/expenses`, {
        method: "POST",
        body: JSON.stringify(expense)
      });
      setModal(null);
      setFormError("");
      await loadData();
    } catch (requestError) {
      setFormError(requestError.message);
    }
  }

  async function deleteTripExpense(expense) {
    const trip = trips.find((item) => item._id === selectedTripId);
    if (!trip || !window.confirm(`Delete "${expense.description}" from ${trip.name}?`)) {
      return;
    }

    try {
      await apiRequest(`/trips/${trip._id}/expenses/${expense._id}`, { method: "DELETE" });
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function deleteExpense(expense) {
    if (!window.confirm(`Delete "${expense.description}"?`)) {
      return;
    }
    try {
      await apiRequest(`/expenses/${expense._id}`, { method: "DELETE" });
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function deleteCustomer(customer) {
    if (!window.confirm(`Delete ${customer.name}?`)) {
      return;
    }
    try {
      await apiRequest(`/customers/${customer._id}`, { method: "DELETE" });
      if (selectedCustomer === customer._id) {
        setSelectedCustomer("all");
      }
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function selectCustomer(customerId) {
    setSelectedCustomer((current) => (current === customerId ? "all" : customerId));
    document.getElementById("overview")?.scrollIntoView({ behavior: "smooth" });
  }

  const maxCategoryPaise = Math.max(...categoryTotals.map((item) => item.amountPaise), 1);
  const selectedCustomerName =
    selectedCustomer === "all"
      ? "All customers"
      : customers.find((customer) => customer._id === selectedCustomer)?.name || "Customer";
  const selectedTrip = trips.find((trip) => trip._id === selectedTripId);
  const tripSummary = selectedTrip?.summary;

  if (authChecking) {
    return <main className="auth-screen"><div className="auth-loading">Checking your account…</div></main>;
  }
  if (!user) {
    return <AuthPage onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" aria-label="ExpenseX home">
          <span className="brand-mark">X</span>
          <span>ExpenseX<span className="brand-period">.</span></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <a className="nav-link active" href="#overview"><span className="nav-icon">▦</span> Overview</a>
          <a className="nav-link" href="#transactions"><span className="nav-icon">↗</span> Transactions</a>
          <a className="nav-link" href="#customers"><span className="nav-icon">♙</span> Customers</a>
          <a className="nav-link" href="#travel-splits"><span className="nav-icon">⇄</span> Travel split</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-icon">✦</span>
            <strong>Good records, clear mind.</strong>
            <p>Keep every project expense in one tidy place.</p>
          </div>
          <div className="profile">
            <div className="profile-avatar">{initials(user.name)}</div>
            <div className="profile-details"><strong>{user.name}</strong><span>{user.email}</span></div>
            <button className="logout-button" onClick={logout} title="Sign out" aria-label="Sign out">↪</button>
          </div>
        </div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> <strong>Overview</strong></div>
          <div className="topbar-actions">
            <span className="today-label">{new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(new Date())}</span>
            <button className="button button-secondary" onClick={() => openModal({ type: "customer" })}>
              <span className="plus">+</span> Add customer
            </button>
            <button className="button button-primary" onClick={() => openModal({ type: "expense" })}>
              <span className="plus">+</span> Add expense
            </button>
          </div>
        </header>

        <section className="page-heading">
          <div>
            <div className="eyebrow">YOUR BUSINESS AT A GLANCE</div>
            <h1>Good afternoon, {user.name.split(" ")[0]} <span className="wave">✳</span></h1>
            <p>Here’s what’s happening with your expenses.</p>
          </div>
          <label className="filter-select">
            <span className="filter-label">Showing</span>
            <select value={selectedCustomer} onChange={(event) => setSelectedCustomer(event.target.value)}>
              <option value="all">All customers</option>
              {customers.map((customer) => (
                <option value={customer._id} key={customer._id}>{customer.name}</option>
              ))}
            </select>
          </label>
        </section>

        {error && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button className="retry-button" onClick={loadData}>Retry</button>
            <button onClick={() => setError("")} aria-label="Dismiss error">×</button>
          </div>
        )}

        <section className="stats-grid" aria-label="Expense summary">
          <article className="stat-card">
            <div className="stat-top"><span>Total expenses</span><span className="stat-icon green">↗</span></div>
            <div className="stat-value">{formatMoney(totals.totalPaise)}</div>
            <div className="stat-foot"><span className="stat-dot"></span> {selectedCustomerName}</div>
          </article>
          <article className="stat-card">
            <div className="stat-top"><span>This month</span><span className="stat-icon blue">◷</span></div>
            <div className="stat-value">{formatMoney(totals.thisMonthPaise)}</div>
            <div className="stat-foot">Spending in {new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date())}</div>
          </article>
          <article className="stat-card">
            <div className="stat-top"><span>Transactions</span><span className="stat-icon purple">▤</span></div>
            <div className="stat-value">{totals.count}</div>
            <div className="stat-foot">Across your selected customers</div>
          </article>
          <article className="stat-card">
            <div className="stat-top"><span>Average expense</span><span className="stat-icon orange">⌁</span></div>
            <div className="stat-value">{formatMoney(totals.averagePaise)}</div>
            <div className="stat-foot">Per transaction</div>
          </article>
        </section>

        <section className="panel trip-panel" id="travel-splits">
          <div className="panel-heading trip-heading">
            <div>
              <h2>Split a trip with friends</h2>
              <p>Track what everyone paid and see a fair equal split.</p>
            </div>
            <button className="button button-secondary" onClick={() => openModal({ type: "trip" })}>
              <span className="plus">+</span> New trip
            </button>
          </div>
          {trips.length === 0 ? (
            <div className="trip-empty">
              <span className="empty-icon">⇄</span>
              <div>
                <strong>No group trips yet</strong>
                <p>Create a trip, add your friends, and record who paid for each shared expense.</p>
              </div>
              <button className="button button-primary" onClick={() => openModal({ type: "trip" })}>Create your first trip</button>
            </div>
          ) : (
            <>
              <div className="trip-toolbar">
                <label className="trip-picker">
                  <span>Choose a trip</span>
                  <select value={selectedTripId} onChange={(event) => setSelectedTripId(event.target.value)}>
                    {trips.map((trip) => <option key={trip._id} value={trip._id}>{trip.name}</option>)}
                  </select>
                </label>
                {selectedTrip && (
                  <button className="button button-primary" onClick={() => openModal({ type: "tripExpense" })}>
                    <span className="plus">+</span> Add shared expense
                  </button>
                )}
              </div>
              {selectedTrip && tripSummary && (
                <div className="trip-content">
                  <div className="trip-summary">
                    <div><span>Total trip spending</span><strong>{formatMoney(tripSummary.totalPaise)}</strong></div>
                    <div><span>Friends sharing equally</span><strong>{selectedTrip.members.length} people</strong></div>
                    <div><span>Shared expenses</span><strong>{selectedTrip.expenses.length}</strong></div>
                  </div>
                  <div className="trip-columns">
                    <section className="trip-balances">
                      <h3>Each person's balance</h3>
                      <p>Positive means they should receive money; negative means they owe.</p>
                      <div className="balance-list">
                        {tripSummary.members.map((member) => (
                          <div className="balance-row" key={member.memberId}>
                            <span className="mini-avatar">{initials(member.name)}</span>
                            <strong>{member.name}</strong>
                            <small>Paid {formatMoney(member.paidPaise)}</small>
                            <b className={member.balancePaise > 0 ? "balance-positive" : member.balancePaise < 0 ? "balance-negative" : ""}>
                              {member.balancePaise > 0
                                ? `Gets ${formatMoney(member.balancePaise)}`
                                : member.balancePaise < 0
                                  ? `Owes ${formatMoney(-member.balancePaise)}`
                                  : "Settled"}
                            </b>
                          </div>
                        ))}
                      </div>
                    </section>
                    <section className="trip-settlements">
                      <h3>Suggested payments</h3>
                      <p>Pay these amounts to settle everyone up.</p>
                      {tripSummary.settlements.length ? (
                        <div className="settlement-list">
                          {tripSummary.settlements.map((settlement, index) => (
                            <div className="settlement-row" key={`${settlement.from}-${settlement.to}-${index}`}>
                              <span><strong>{settlement.from}</strong><span> pays </span><strong>{settlement.to}</strong></span>
                              <b>{formatMoney(settlement.amountPaise)}</b>
                            </div>
                          ))}
                        </div>
                      ) : <div className="settled-note">Everyone is settled. Add trip expenses to calculate balances.</div>}
                    </section>
                  </div>
                  {selectedTrip.expenses.length > 0 && (
                    <section className="trip-expenses">
                      <h3>Trip expenses</h3>
                      {selectedTrip.expenses.slice().reverse().map((expense) => {
                        const payer = selectedTrip.members.find((member) => member._id === expense.paidBy);
                        return (
                          <div className="trip-expense-row" key={expense._id}>
                            <span className="trip-expense-description"><strong>{expense.description}</strong><small>{payer?.name || "Trip member"} paid · {formatDate(expense.date)}</small></span>
                            <b>{formatMoney(expense.amountPaise)}</b>
                            <button className="trip-delete-button" onClick={() => deleteTripExpense(expense)} aria-label={`Delete ${expense.description}`}>Delete</button>
                          </div>
                        );
                      })}
                    </section>
                  )}
                </div>
              )}
            </>
          )}
        </section>

        <div className="dashboard-grid">
          <section className="panel transactions-panel" id="transactions">
            <div className="panel-heading">
              <div><h2>Recent expenses</h2><p>Your latest recorded transactions</p></div>
              <span className="count-pill">{visibleExpenses.length} records</span>
            </div>
            {loading ? (
              <div className="empty-state">Loading your expenses…</div>
            ) : visibleExpenses.length ? (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>DESCRIPTION</th><th>CUSTOMER</th><th>DATE</th><th>AMOUNT</th><th></th></tr></thead>
                  <tbody>
                    {visibleExpenses.map((expense) => (
                      <tr key={expense._id}>
                        <td>
                          <div className="expense-description">
                            <span className="category-dot" style={{ background: CATEGORY_COLORS[expense.category] }}></span>
                            <span><strong>{expense.description}</strong><small>{expense.category}</small></span>
                          </div>
                        </td>
                        <td>
                          <button className="customer-cell" onClick={() => expense.customer && selectCustomer(expense.customer._id)}>
                            <span className="mini-avatar">{initials(expense.customer?.name)}</span>
                            {expense.customer?.name || "Unknown"}
                          </button>
                        </td>
                        <td className="date-cell">{formatDate(expense.date)}</td>
                        <td className="amount-cell">{formatMoney(expense.amountPaise)}</td>
                        <td className="row-actions">
                          <button onClick={() => openModal({ type: "expense", expense })} aria-label={`Edit ${expense.description}`}>✎</button>
                          <button onClick={() => deleteExpense(expense)} aria-label={`Delete ${expense.description}`}>×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-icon">↗</span>
                <strong>No expenses yet</strong>
                <p>Add your first expense to start tracking your spending.</p>
                {customers.length > 0 && <button className="button button-secondary" onClick={() => openModal({ type: "expense" })}>Add an expense</button>}
              </div>
            )}
          </section>

          <aside className="right-column">
            <section className="panel category-panel">
              <div className="panel-heading compact">
                <div><h2>By category</h2><p>Where your money goes</p></div>
                <span className="chart-icon">◔</span>
              </div>
              {categoryTotals.length ? (
                <div className="category-list">
                  {categoryTotals.map((item) => (
                    <div className="category-item" key={item.category}>
                      <div className="category-meta">
                        <span><i style={{ background: CATEGORY_COLORS[item.category] }}></i>{item.category}</span>
                        <strong>{formatMoney(item.amountPaise)}</strong>
                      </div>
                      <div className="progress-track">
                        <span style={{ width: `${(item.amountPaise / maxCategoryPaise) * 100}%`, background: CATEGORY_COLORS[item.category] }}></span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div className="small-empty">Add an expense to see your category breakdown.</div>}
            </section>

            <section className="panel customers-panel" id="customers">
              <div className="panel-heading compact">
                <div><h2>Customers</h2><p>{customers.length} active customers</p></div>
                <button className="icon-button" onClick={() => openModal({ type: "customer" })} aria-label="Add customer">+</button>
              </div>
              {customers.length ? (
                <div className="customer-list">
                  {customers.map((customer, index) => (
                    <div className={`customer-item ${selectedCustomer === customer._id ? "selected" : ""}`} key={customer._id}>
                      <button className={`customer-main avatar-${index % 4}`} onClick={() => selectCustomer(customer._id)}>
                        <span className="customer-avatar">{initials(customer.name)}</span>
                        <span className="customer-info"><strong>{customer.name}</strong><small>{customer.company || customer.email}</small></span>
                      </button>
                      <div className="customer-tools">
                        <button onClick={() => openModal({ type: "customer", customer })} aria-label={`Edit ${customer.name}`}>✎</button>
                        <button onClick={() => deleteCustomer(customer)} aria-label={`Delete ${customer.name}`}>×</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="small-empty">Add a customer before recording an expense.</div>
              )}
              <button className="add-customer-link" onClick={() => openModal({ type: "customer" })}>+ Add a customer</button>
            </section>
          </aside>
        </div>
        <footer className="page-footer"><span>ExpenseX</span><span>Simple books. Better focus.</span></footer>
      </main>

      {modal && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setModal(null)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-heading">
              <div>
                <div className="eyebrow">
                  {modal.type === "trip" ? "FRIENDS & TRAVEL" : modal.type === "tripExpense" ? "SHARED TRIP EXPENSE" : modal.type === "customer" ? "CUSTOMER RECORD" : "TRANSACTION RECORD"}
                </div>
                <h2 id="modal-title">
                  {modal.type === "trip"
                    ? "Create a trip"
                    : modal.type === "tripExpense"
                      ? "Add a shared expense"
                      : modal.type === "customer"
                    ? modal.customer ? "Edit customer" : "Add a customer"
                    : modal.expense ? "Edit expense" : "Add an expense"}
                </h2>
              </div>
              <button className="modal-close" onClick={() => setModal(null)} aria-label="Close">×</button>
            </div>
            {modal.type === "trip" ? (
              <form className="form-fields" onSubmit={saveTrip}>
                {formError && <div className="form-error" role="alert">{formError}</div>}
                <label>Trip name<input name="name" placeholder="e.g. Goa weekend" required maxLength="100" /></label>
                <label>Friends <span className="optional">(one name per line, at least 2 people)</span><textarea name="members" rows="5" placeholder={"Amit Sharma\nRavi Kumar\nNeha Singh"} required /></label>
                <div className="form-tip">Every trip expense will be split equally between all friends in this trip.</div>
                <div className="form-actions"><button type="button" className="button button-quiet" onClick={() => setModal(null)}>Cancel</button><button className="button button-primary">Create trip</button></div>
              </form>
            ) : modal.type === "tripExpense" && selectedTrip ? (
              <form className="form-fields" onSubmit={saveTripExpense}>
                {formError && <div className="form-error" role="alert">{formError}</div>}
                <div className="form-tip">This expense will be shared equally across all {selectedTrip.members.length} friends in {selectedTrip.name}.</div>
                <label>What was paid for?<input name="description" placeholder="e.g. Hotel, fuel, dinner" required maxLength="160" /></label>
                <div className="form-row">
                  <label>Amount (INR)<div className="input-prefix"><span>₹</span><input name="amount" type="number" min="0.01" step="0.01" placeholder="0.00" required /></div></label>
                  <label>Date<input name="date" type="date" defaultValue={dateForInput()} required /></label>
                </div>
                <label>Who paid?<select name="paidBy" required>{selectedTrip.members.map((member) => <option key={member._id} value={member._id}>{member.name}</option>)}</select></label>
                <div className="form-actions"><button type="button" className="button button-quiet" onClick={() => setModal(null)}>Cancel</button><button className="button button-primary">Add shared expense</button></div>
              </form>
            ) : modal.type === "customer" ? (
              <form className="form-fields" onSubmit={saveCustomer}>
                {formError && <div className="form-error" role="alert">{formError}</div>}
                <label>Full name<input name="name" placeholder="e.g. Morgan Lee" defaultValue={modal.customer?.name || ""} required maxLength="100" /></label>
                <label>Email address<input name="email" type="email" placeholder="morgan@company.com" defaultValue={modal.customer?.email || ""} required maxLength="160" /></label>
                <label>Company <span className="optional">(optional)</span><input name="company" placeholder="Company name" defaultValue={modal.customer?.company || ""} maxLength="100" /></label>
                <div className="form-actions"><button type="button" className="button button-quiet" onClick={() => setModal(null)}>Cancel</button><button className="button button-primary">{modal.customer ? "Save changes" : "Add customer"}</button></div>
              </form>
            ) : customers.length ? (
              <form className="form-fields" onSubmit={saveExpense}>
                {formError && <div className="form-error" role="alert">{formError}</div>}
                <label>Description<input name="description" placeholder="e.g. Client meeting lunch" defaultValue={modal.expense?.description || ""} required maxLength="160" /></label>
                <div className="form-row">
                  <label>Amount (INR)<div className="input-prefix"><span>₹</span><input name="amount" type="number" min="0.01" step="0.01" placeholder="0.00" defaultValue={modal.expense ? (modal.expense.amountPaise / 100).toFixed(2) : ""} required /></div></label>
                  <label>Date<input name="date" type="date" defaultValue={modal.expense ? modal.expense.date.slice(0, 10) : dateForInput()} required /></label>
                </div>
                <div className="form-row">
                  <label>Category<select name="category" defaultValue={modal.expense?.category || CATEGORIES[0]}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
                  <label>Customer<select name="customer" defaultValue={modal.expense?.customer?._id || customers[0]._id} required>{customers.map((customer) => <option key={customer._id} value={customer._id}>{customer.name}</option>)}</select></label>
                </div>
                <div className="form-actions"><button type="button" className="button button-quiet" onClick={() => setModal(null)}>Cancel</button><button className="button button-primary">{modal.expense ? "Save changes" : "Add expense"}</button></div>
              </form>
            ) : (
              <div className="no-customer-message">
                <p>Add a customer first so this expense can be connected to a project.</p>
                <button className="button button-primary" onClick={() => openModal({ type: "customer" })}>Add a customer</button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
