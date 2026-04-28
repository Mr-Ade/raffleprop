import https from 'https';

function flwRequest<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const options: https.RequestOptions = {
      hostname: 'api.flutterwave.com',
      path,
      method,
      headers: {
        Authorization: `Bearer ${process.env['FLUTTERWAVE_SECRET_KEY']}`,
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
          reject(new Error(`Flutterwave response parse error: ${raw}`));
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

export interface FlwInitResponse {
  status: string;
  message: string;
  data: {
    link: string;
  };
}

export interface FlwVerifyResponse {
  status: string;
  message: string;
  data: {
    id: number;
    tx_ref: string;
    flw_ref: string;
    amount: number;
    currency: string;
    charged_amount: number;
    status: 'successful' | 'failed' | 'pending';
    payment_type: string;
    customer: { email: string; phone_number: string };
    meta: Record<string, unknown>;
  };
}

export const flutterwave = {
  async initializePayment(params: {
    txRef: string;
    amount: number;
    currency?: string;
    customerEmail: string;
    customerPhone: string;
    customerName: string;
    redirectUrl?: string;
    meta?: Record<string, unknown>;
    /**
     * Flutterwave sub-account ID for escrow routing.
     * When set, funds are split/routed to this sub-account's bank.
     * Falls back to FLUTTERWAVE_SUBACCOUNT_ID env var if not provided.
     */
    subaccountId?: string;
  }): Promise<FlwInitResponse> {
    const subId = params.subaccountId ?? process.env['FLUTTERWAVE_SUBACCOUNT_ID'];
    return flwRequest<FlwInitResponse>('POST', '/v3/payments', {
      tx_ref: params.txRef,
      amount: params.amount,
      currency: params.currency ?? 'NGN',
      redirect_url: params.redirectUrl ?? `${process.env['FRONTEND_URL']}/purchase/verify`,
      customer: {
        email: params.customerEmail,
        phone_number: params.customerPhone,
        name: params.customerName,
      },
      meta: params.meta,
      ...(subId ? { subaccounts: [{ id: subId }] } : {}),
    });
  },

  async verifyTransaction(id: number): Promise<FlwVerifyResponse> {
    return flwRequest<FlwVerifyResponse>('GET', `/v3/transactions/${id}/verify`);
  },

  async initiateRefund(params: {
    id: number; // Flutterwave transaction id
    amount?: number;
  }): Promise<{ status: string; message: string }> {
    return flwRequest('POST', `/v3/transactions/${params.id}/refund`, {
      ...(params.amount !== undefined ? { amount: params.amount } : {}),
    });
  },
};
