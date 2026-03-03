import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
    _stripe = new Stripe(key, { apiVersion: "2026-02-25.clover" });
  }
  return _stripe;
}

export interface CreditPack {
  id: string;
  credits: number;
  price: number; // in cents
  label: string;
  perCredit: string;
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: "pack_5", credits: 5, price: 700, label: "5 Credits", perCredit: "$1.40" },
  { id: "pack_15", credits: 15, price: 1500, label: "15 Credits", perCredit: "$1.00" },
  { id: "pack_50", credits: 50, price: 4000, label: "50 Credits", perCredit: "$0.80" },
];
