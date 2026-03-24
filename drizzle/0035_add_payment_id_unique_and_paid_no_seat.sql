-- Enforce idempotency by payment id for webhook retries.
CREATE UNIQUE INDEX IF NOT EXISTS payment_transactions_razorpay_payment_id_unique
  ON payment_transactions (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

-- Status value `paid_no_seat` is stored in VARCHAR status column.
-- No enum migration required.
