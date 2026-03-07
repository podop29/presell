import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { addCredits, getBalance } from "@/lib/credits";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyError, notifySuccess } from "@/lib/discord";

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    if (!sig) {
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("Missing STRIPE_WEBHOOK_SECRET");
      notifyError("Missing STRIPE_WEBHOOK_SECRET", new Error("STRIPE_WEBHOOK_SECRET env var not set"));
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 }
      );
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      notifyError("Stripe webhook signature failed", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      const credits = parseInt(session.metadata?.credits ?? "0", 10);
      const sessionId = session.id;

      if (!userId || credits <= 0) {
        console.error("Invalid session metadata:", session.metadata);
        notifyError("Invalid Stripe session metadata", new Error("Missing userId or invalid credits"), { metadata: JSON.stringify(session.metadata) });
        return NextResponse.json({ received: true });
      }

      // Idempotency: check if we already credited this session
      const { data: existing } = await supabaseAdmin
        .from("credit_transactions")
        .select("id")
        .eq("reference_id", sessionId)
        .eq("type", "purchase")
        .limit(1);

      if (existing && existing.length > 0) {
        // Already processed
        return NextResponse.json({ received: true });
      }

      // Ensure user_credits row exists
      await getBalance(userId);

      // Add credits
      await addCredits(
        userId,
        credits,
        "purchase",
        `Purchased ${credits} credits`,
        sessionId
      );

      notifySuccess("Credits purchased", { credits: String(credits), userId });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    notifyError("Stripe webhook error", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
