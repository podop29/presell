import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getBalance } from "@/lib/credits";
import { getStripe, CREDIT_PACKS } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyError } from "@/lib/discord";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { packId } = (await req.json()) as { packId: string };
    const pack = CREDIT_PACKS.find((p) => p.id === packId);
    if (!pack) {
      return NextResponse.json({ error: "Invalid pack." }, { status: 400 });
    }

    const stripe = getStripe();

    // Ensure user_credits row exists
    await getBalance(user.id);

    // Get or create Stripe customer
    const { data: creditRow } = await supabaseAdmin
      .from("user_credits")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    let customerId = creditRow?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await supabaseAdmin
        .from("user_credits")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", user.id);
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: pack.price,
            product_data: {
              name: pack.label,
              description: `${pack.credits} credits for PitchKit`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        pack_id: pack.id,
        credits: String(pack.credits),
      },
      success_url: `${baseUrl}/credits?purchase=success`,
      cancel_url: `${baseUrl}/credits`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Purchase error:", err);
    notifyError("Purchase error", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
