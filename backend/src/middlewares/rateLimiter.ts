import rateLimit from "express-rate-limit";

// Applies to login endpoints only. Deliberately stricter than a general
// API limiter would be, since login is the highest-value brute-force target.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in a few minutes." },
});

// Slightly looser — registration is lower-value to brute force (you can't
// "guess" your way into someone else's account by registering), but still
// worth capping to stop automated bulk account creation / email-bombing
// via sendRegistrationEmail.
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many registration attempts. Please try again later." },
});