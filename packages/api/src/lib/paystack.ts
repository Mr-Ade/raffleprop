import https from 'https';

const PAYSTACK_BASE = 'https://api.paystack.co';

function paystackRequest<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const options: https.RequestOptions = {
      hostname: 'api.paystack.co',
      path,
      method,
      headers: {
        Authorization: `Bearer ${process.env['PAYSTACK_SECRET_KEY']}`,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk: Buffer) => (raw += chunk.toString()));
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw) as T);
        } catch {
          reject(new Error(`Paystack response parse error: ${raw}`));
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

export interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    status: 'success' | 'failed' | 'abandoned';
    reference: string;
    amount: number; // in kobo
    currency: string;
    paid_at: string;
    customer: { email: string };
    metadata: Record<string, unknown>;
  };
}

export interface PaystackRefundResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    transaction: { reference: string };
    amount: number;
    status: string;
  };
}

export const paystack = {
  async initializeTransaction(params: {
    email: string;
    amount: number; // naira — will be converted to kobo
    reference: string;
    callbackUrl?: string;
    metadata?: Record<string, unknown>;
    /**
     * Paystack sub-account code for escrow routing.
     * When set, 100% of the amount is settled to this sub-account's bank.
     * bearer="account" means RaffleProp's main account absorbs gateway fees
     * so the full ticket price reaches the escrow account.
     * Falls back to PAYSTACK_SUBACCOUNT_CODE env var if not provided.
     */
    subaccountCode?: string;
  }): Promise<PaystackInitResponse> {
    const subaccount = params.subaccountCode ?? process.env['PAYSTACK_SUBACCOUNT_CODE'];
    return paystackRequest<PaystackInitResponse>('POST', '/transaction/initialize', {
      email: params.email,
      amount: params.amount * 100, // kobo
      reference: params.reference,
      callback_url: params.callbackUrl ?? `${process.env['FRONTEND_URL']}/purchase/verify`,
      metadata: params.metadata,
      ...(subaccount ? { subaccount, bearer: 'account' } : {}),
    });
  },

  async verifyTransaction(reference: string): Promise<PaystackVerifyResponse> {
    return paystackRequest<PaystackVerifyResponse>(
      'GET',
      `/transaction/verify/${encodeURIComponent(reference)}`,
    );
  },

  async refundTransaction(params: {
    transaction: string; // reference
    amount?: number; // naira — partial refund; omit for full
  }): Promise<PaystackRefundResponse> {
    return paystackRequest<PaystackRefundResponse>('POST', '/refund', {
      transaction: params.transaction,
      ...(params.amount !== undefined ? { amount: params.amount * 100 } : {}),
    });
  },
};

// Re-export base URL so tests can mock it
export { PAYSTACK_BASE };
