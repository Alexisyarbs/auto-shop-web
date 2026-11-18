"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function connectStripeAccount(
  businessId: string | null | undefined,
  businessEmail: string | null | undefined,
  existingStripeId?: string | null,
) {
  if (!businessId || !businessEmail) {
    throw new Error("Business ID and Email are required to connect Stripe.");
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    },
  );

  let stripeAccountId = existingStripeId;
  const secretKey = process.env.STRIPE_SECRET_KEY!;

  // 1. Create v2 Connected Account via direct JSON fetch
  if (!stripeAccountId) {
    const response = await fetch("https://api.stripe.com/v2/core/accounts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Stripe-Version": "2026-10-28.preview",
        "Content-Type": "application/json", // 👈 Must be application/json for v2 endpoints
      },
      body: JSON.stringify({
        contact_email: businessEmail,
        dashboard: "express",
        identity: {
          country: "US",
        },
        defaults: {
          responsibilities: {
            fees_collector: "stripe",
            losses_collector: "stripe",
          },
        },
        configuration: {
          merchant: {
            capabilities: {
              card_payments: {
                requested: true,
              },
            },
          },
        },
      }),
    });

    const accountData = await response.json();

    if (!response.ok) {
      throw new Error(
        accountData.error?.message || "Failed to create v2 Stripe account",
      );
    }

    stripeAccountId = accountData.id;

    // Save v2 account ID to your public.business table
    await supabase
      .from("business")
      .update({ stripe_account: stripeAccountId })
      .eq("id", businessId);
  }

  // 2. Create the Account Link for onboarding redirection (v1 endpoint uses form-url-encoded)
  const linkResponse = await fetch("https://api.stripe.com/v1/account_links", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      account: stripeAccountId!,
      refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/dashboard/settings?stripe=refresh`,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/dashboard/settings?stripe=success`,
      type: "account_onboarding",
    }),
  });

  const linkData = await linkResponse.json();

  if (!linkResponse.ok) {
    throw new Error(
      linkData.error?.message || "Failed to create Stripe account link",
    );
  }

  return { url: linkData.url };
}
