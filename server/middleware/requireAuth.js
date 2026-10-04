import jwt from "jsonwebtoken";

export function requireAuth(request, response, next) {
  const authorization = request.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return response.status(401).json({ message: "Sign in to continue." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "local-development-secret");
    if (typeof payload !== "object" || typeof payload.sub !== "string") {
      return response.status(401).json({ message: "Your session is invalid. Please sign in again." });
    }
    request.userId = payload.sub;
    return next();
  } catch {
    return response.status(401).json({ message: "Your session expired. Please sign in again." });
  }
}
