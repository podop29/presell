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
  { id: "pack_3", credits: 3, price: 300, label: "3 Credits", perCredit: "$1.00" },
  { id: "pack_10", credits: 10, price: 1200, label: "10 Credits", perCredit: "$1.20" },
  { id: "pack_25", credits: 25, price: 2500, label: "25 Credits", perCredit: "$1.00" },
  { id: "pack_50", credits: 50, price: 3900, label: "50 Credits", perCredit: "$0.78" },
];
