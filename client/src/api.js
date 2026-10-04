const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("ledgerlyToken");
  const headers = {
    "Content-Type": "application/json",
    ...options.headers
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Can't reach the app server. Start MongoDB and run `npm run dev` in the project folder.");
    }
    throw error;
  }

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    const error = new Error(result.message || `Request failed (${response.status}).`);
    error.status = response.status;
    if (response.status === 401 && token && !path.startsWith("/auth/login")) {
      localStorage.removeItem("ledgerlyToken");
      window.dispatchEvent(new Event("ledgerly:session-expired"));
    }
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
