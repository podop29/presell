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
  { id: "pack_5", credits: 5, price: 900, label: "5 Credits", perCredit: "$1.80" },
  { id: "pack_15", credits: 15, price: 1900, label: "15 Credits", perCredit: "$1.27" },
  { id: "pack_50", credits: 50, price: 4900, label: "50 Credits", perCredit: "$0.98" },
];
