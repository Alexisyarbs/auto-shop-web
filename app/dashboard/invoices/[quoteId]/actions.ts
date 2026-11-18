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

  // 1. Fetch quote, shop, and customer details
  const { data: quote, error } = await supabase
    .from("quotes")
    .select(
      `
      id,
      public_token,
      shop_id,
      shop:shop_id ( 
        id,
        business_id
      ),
      customer:customer_id ( name, email ),
      quote_jobs (
        customer_decision,
        quote_job_items ( name, quantity, unit_price )
      )
    `,
    )
    .eq("id", quoteId)
    .single();

  if (error || !quote) {
    throw new Error("Quote or invoice not found for checkout.");
  }

  const publicToken = quote.public_token;
  const shopInfo = quote.shop as any;
  const shopId = shopInfo?.id;
  let businessId = shopInfo?.business_id;

  const customerObj = Array.isArray(quote.customer)
    ? quote.customer[0]
    : quote.customer;
  const customerEmail = customerObj?.email || undefined;

  // 2. Build line items and calculate subtotal/total in cents (including your 8% tax model)
  let lineItems: any[] = [];
  let subtotalCents = 0;

  quote.quote_jobs?.forEach((job: any) => {
    if (job.customer_decision === "approved") {
      job.quote_job_items?.forEach((item: any) => {
        const unitCost = Number(item.unit_price) || 0;
        const qty = Number(item.quantity) || 1;
        const itemTotalCents = Math.round(unitCost * qty * 100);

        subtotalCents += itemTotalCents;

        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: {
              name: item.name || "Auto Repair Service",
            },
            unit_amount: Math.round(unitCost * 100),
          },
          quantity: qty,
        });
      });
    }
  });

  if (lineItems.length === 0) {
    throw new Error("Cannot checkout an invoice with no approved items.");
  }

  const taxCents = Math.round(subtotalCents * 0.08); // matches your 8% invoice tax
  const totalCents = subtotalCents + taxCents;

  // 3. Calculate 1% platform fee in cents
  const applicationFeeAmount = Math.round(totalCents * 0.01);

  // 4. Fetch the parent business's stripe_account ID
  if (!businessId && shopId) {
    const { data: shopRecord } = await supabase
      .from("shop")
      .select("business_id")
      .eq("id", shopId)
      .single();
    businessId = shopRecord?.business_id;
  }

  if (!businessId) {
    throw new Error("No business associated with this shop.");
  }

  const { data: businessData, error: bizError } = await supabase
    .from("business")
    .select("stripe_account")
    .eq("id", businessId)
    .single();

  if (bizError || !businessData?.stripe_account) {
    throw new Error(
      "This business has not connected their Stripe account in settings yet.",
    );
  }

  const connectedAccountId = businessData.stripe_account;

  // 5. Create Stripe Checkout Session with application_fee_amount
  const session = await stripe.checkout.sessions.create(
    {
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/quote/${publicToken}?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/quote/${publicToken}?canceled=true`,
      customer_email: customerEmail || undefined,
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount, // 👈 Automatically routes 1% to your platform balance
      },
    } as any,
    {
      stripeAccount: connectedAccountId,
    },
  );

  return { url: session.url };
}
