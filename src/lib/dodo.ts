import DodoPayments from 'dodopayments';

if (!process.env.DODO_PAYMENTS_TOKEN_SECRET) {
  console.warn("Dodo Payments token secret missing from environment variables.");
}

export const dodoClient = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_TOKEN_SECRET || '',
  environment: (process.env.DODO_PAYMENTS_ENVIRONMENT as 'test_mode' | 'live_mode') || 'test_mode',
});
