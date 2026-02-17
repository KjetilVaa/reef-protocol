import rateLimit from "express-rate-limit";

/** Rate limiter for registration: 10 requests per hour per IP */
export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: "Too many registrations. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Rate limiter for search: 60 requests per minute per IP */
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: "Too many search requests. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
