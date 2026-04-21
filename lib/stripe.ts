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
  { id: "pack_6", credits: 6, price: 300, label: "6 Credits", perCredit: "$0.50" },
  { id: "pack_20", credits: 20, price: 1200, label: "20 Credits", perCredit: "$0.60" },
  { id: "pack_50", credits: 50, price: 2500, label: "50 Credits", perCredit: "$0.50" },
  { id: "pack_100", credits: 100, price: 3900, label: "100 Credits", perCredit: "$0.39" },
];
