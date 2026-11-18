"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { stripe } from "../../../../utils/stripe";

export async function createInvoiceCheckoutSession(quoteId: string) {
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

  const { data: quote, error } = await supabase
    .from("quotes")
    .select(
      `
      id,
      public_token,
      business_id,
      business:business_id ( stripe_account ),
      customer:customer_id ( name, email ),
      car:car_id ( year, make, model ),
      quote_jobs (
        quote_job_items ( title, quantity, unit_price )
      )
    `,
    )
    .eq("id", quoteId)
    .single();

  if (error || !quote) {
    throw new Error("Invoice or quote not found.");
  }

  const businessData = quote.business as any;
  const connectedAccountId = businessData?.stripe_account;

  if (!connectedAccountId) {
    throw new Error("This shop has not connected their Stripe account yet.");
  }

  // Safely handle customer data whether Supabase returns an object or an array
  const customerData = Array.isArray(quote.customer)
    ? quote.customer[0]
    : quote.customer;
  const customerEmail = customerData?.email || undefined;

  let lineItems: any[] = [];

  quote.quote_jobs?.forEach((job) => {
    job.quote_job_items?.forEach((item) => {
      const unitCost = Number(item.unit_price) || 0;
      const qty = Number(item.quantity) || 1;

      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: item.title || "Auto Repair Service",
          },
          unit_amount: Math.round(unitCost * 100),
        },
        quantity: qty,
      });
    });
  });

  if (lineItems.length === 0) {
    throw new Error("Cannot checkout an empty invoice.");
  }

  // Create Stripe Checkout Session with `as any` to satisfy strict SDK version property types
  const session = await stripe.checkout.sessions.create(
    {
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/quote/${quote.public_token}?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/quote/${quote.public_token}?canceled=true`,
      customer_email: customerEmail,
    } as any,
    {
      stripeAccount: connectedAccountId,
    },
  );

  return { url: session.url };
}
