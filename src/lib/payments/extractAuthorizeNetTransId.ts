/**
 * Accept Hosted may append the transaction id under several query/body key names.
 * (Aligned with platform billing return handler.)
 */
export const AUTHORIZE_NET_TRANS_ID_PARAM_KEYS = [
  "transId",
  "trans_id",
  "transaction_id",
  "transactionId",
  "TransactionID",
  "TRANSACTION_ID",
  "transactionID",
  "x_trans_id",
  "X_TRANS_ID",
  "txn_id",
  "refTransID",
  "ref_trans_id",
  "paymentTransactionId",
  "payment_trans_id",
] as const;

export function extractAuthorizeNetTransIdFromSearchParams(searchParams: URLSearchParams): string | null {
  for (const k of AUTHORIZE_NET_TRANS_ID_PARAM_KEYS) {
    const v = searchParams.get(k) ?? searchParams.get(k.toLowerCase());
    if (v?.trim()) return v.trim();
  }
  return null;
}
