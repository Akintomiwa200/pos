# Real payment adapters

No credentials are bundled. Every electronic charge calls the provider over HTTPS; missing keys
produce a `503 ... is not configured` error. POS never records a sale from the hand-off alone —
the cashier must press **Check payment status**, and the backend only reports `paid` when the
provider verify API or a signature-verified webhook confirms it.

## HQ gateway setup

Create/enable a gateway at HQ for one of `paystack`, `flutterwave`, `moniepoint`, `opay`.
Server-only fields: `secretKey`, `webhookSecret`, `merchantId`, `mode` (`test` default / `live`),
`apiBase`. Web/POS responses return masked placeholders (`••••`); posting the placeholder back
does not overwrite a stored credential. Env values are used when the HQ field is empty. The HQ
gateway `mode` wins over the env mode when a gateway record exists.

## Environment variables

Global:

| Name | Purpose |
| --- | --- |
| `PAYMENT_PUBLIC_BASE_URL` | Public origin used to build `callbackUrl`, `returnUrl`, `cancelUrl`. Without it, callbacks are omitted; configure webhooks in the provider dashboard instead. |
| `PAYMENT_PAYER_EMAIL` | Fallback payer email required by Paystack/Flutterwave/Monnify initialization. |
| `PAYMENT_EVENTS_FILE` | Optional ledger path (default `data/payment-events.json`). |

Paystack:

| Name | Purpose |
| --- | --- |
| `PAYSTACK_SECRET_KEY` | Secret key; also the webhook secret fallback. |
| `PAYSTACK_WEBHOOK_SECRET` | Optional dedicated signing secret. |
| `PAYSTACK_MODE` | `test` (default) or `live`. |
| `PAYSTACK_API_BASE` | Optional base override (default `https://api.paystack.co`). |
| `PAYSTACK_PAYER_EMAIL` | Per-provider payer email override. |

Flutterwave v3:

| Name | Purpose |
| --- | --- |
| `FLUTTERWAVE_SECRET_KEY` | Secret key for `/v3/charges?type=card` and verify. |
| `FLUTTERWAVE_SECRET_HASH` / `FLUTTERWAVE_WEBHOOK_SECRET` | Webhook hash/secret. |
| `FLUTTERWAVE_MODE` | `test` (default) or `live`. |
| `FLUTTERWAVE_API_BASE` | Optional base override (default `https://api.flutterwave.com`). |
| `FLUTTERWAVE_PAYER_EMAIL` | Per-provider payer email override. |

Moniepoint (Monnify):

| Name | Purpose |
| --- | --- |
| `MONNIFY_API_KEY` | API key (Basic auth user; HQ `publicKey`). |
| `MONNIFY_SECRET_KEY` | Secret key (Basic auth password and webhook HMAC key; HQ `secretKey`). |
| `MONNIFY_CONTRACT_CODE` | Contract code (HQ `merchantId`), required by `init-transaction`. |
| `MONNIFY_WEBHOOK_SECRET` | Optional; defaults to the secret key. |
| `MONNIFY_MODE` | `test` (default) or `live`. |
| `MONNIFY_API_BASE` | Optional base override (default `https://api.monnify.com`). |
| `MONNIFY_PAYER_EMAIL` | Per-provider payer email override. |

OPay Cashier:

| Name | Purpose |
| --- | --- |
| `OPAY_PUBLIC_KEY` | Bearer key for cashier create; HQ `publicKey`. |
| `OPAY_PRIVATE_KEY` | Private key for cashier status HMAC-SHA512 and webhook verification; HQ `secretKey`. |
| `OPAY_MERCHANT_ID` | `MerchantId` header; HQ `merchantId`. |
| `OPAY_MODE` | `test` (default: sandbox cashier host) or `live`. |
| `OPAY_API_BASE` | Optional cashier create base override. |
| `OPAY_STATUS_API_BASE` | Optional status base override (default `testapi.opaycheckout.com` / `liveapi.opaycheckout.com`). |
| `OPAY_WEBHOOK_SCHEME` | `auto` (documented SHA3 callback), `sha3-callback`, `sha512-timestamp`, or `sha512-body`. |
| `OPAY_WEBHOOK_PARAM_CONTENT` | Message template for the configurable `sha512-timestamp` scheme; supports `{timestamp}` and `{body}`. |
| `OPAY_AMOUNT_IS_MINOR` | Set to `1` if your OPay account reports amounts in kobo rather than major naira. |

## Webhook URLs

Register these on each provider dashboard (they are also sent as `callbackUrl` when
`PAYMENT_PUBLIC_BASE_URL` is set):

- `POST {PAYMENT_PUBLIC_BASE_URL}/api/payments/webhooks/paystack` — header `paystack-signature` or `x-paystack-signature` (HMAC-SHA512 raw body).
- `POST {PAYMENT_PUBLIC_BASE_URL}/api/payments/webhooks/flutterwave` — `verif-hash` or `flutterwave-signature` (base64 HMAC-SHA256 raw body).
- `POST {PAYMENT_PUBLIC_BASE_URL}/api/payments/webhooks/moniepoint` — `monnify-signature` (HMAC-SHA512 of secret + raw body); required in live, sandbox may omit it.
- `POST {PAYMENT_PUBLIC_BASE_URL}/api/payments/webhooks/opay` — documented `sha512` callback signature, or configured `sign` scheme. Unverifiable events are rejected in every mode.

Debug/probe endpoints: `GET /api/payments/events?provider=&reference=`,
`GET /api/payments/events/stream` (SSE), `POST /api/payments/verify` with
`{ provider, reference, amountMinor }`.

## Known limitations

- OPay publishes more than one webhook format; the documented cashier callback is verified
  automatically, while the `sign`-header variant must be explicitly configured because the signed
  message template is account-specific. Nothing is trusted without a matching signature.
- Flutterwave verify uses `/v3/transactions/:id/verify`; the provider transaction id returned at
  initialization is stored in the event ledger. A charge whose initialization response had no id
  cannot be verified, and is reported honestly as an error.
- OPay amount units follow the major-naira convention requested for initialization. Set
  `OPAY_AMOUNT_IS_MINOR=1` if your merchant account returns minor units, otherwise amount checks
  will fail closed.
- `cash`, `split`, and `gift-card` remain local manual tenders. Bank/card/transfer/wallet tenders
  require an explicitly enabled HQ gateway; POS offers only HQ-enabled providers and cannot toggle
  them locally.
