import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Option A: Drop the apiVersion config entirely to let the SDK use its matching default version safely
  apiVersion: "2026-10-28.endive" as any, // Option B: Use a standard active release version string
});
