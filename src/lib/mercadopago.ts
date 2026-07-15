// =============================================================================
// Mercado Pago — creación de pagos PIX y consulta de estado.
// Requiere MP_ACCESS_TOKEN (se configura en Vercel; nunca en el cliente).
// Docs: https://www.mercadopago.com.br/developers/es/reference/payments
// =============================================================================

const MP_API = "https://api.mercadopago.com/v1";

function token() {
  const t = (process.env.MP_ACCESS_TOKEN || "").trim();
  if (!t) throw new Error("MP_ACCESS_TOKEN no configurado");
  return t;
}

export type PixPayment = {
  id: number;
  status: string;                 // pending | approved | rejected | ...
  qr_code: string;                // PIX copia-e-cola
  qr_code_base64: string;         // imagen del QR (base64, sin prefijo data:)
};

// Crea un pago PIX por el monto dado. `reference` = id de nuestra fila payments.
export async function createPixPayment(input: {
  amount: number;
  description: string;
  payerEmail: string;
  payerName?: string;
  reference: string;
  notificationUrl: string;
}): Promise<PixPayment> {
  const res = await fetch(`${MP_API}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": input.reference, // evita pagos duplicados
    },
    body: JSON.stringify({
      transaction_amount: Number(input.amount),
      description: input.description,
      payment_method_id: "pix",
      external_reference: input.reference,
      notification_url: input.notificationUrl,
      payer: {
        email: input.payerEmail,
        first_name: input.payerName || "Aluno",
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`MP error ${res.status}: ${data?.message || JSON.stringify(data)}`);
  }
  const tx = data.point_of_interaction?.transaction_data ?? {};
  return {
    id: data.id,
    status: data.status,
    qr_code: tx.qr_code ?? "",
    qr_code_base64: tx.qr_code_base64 ?? "",
  };
}

// Consulta el estado actual de un pago (usado por el webhook).
export async function getPayment(mpPaymentId: string): Promise<{ status: string; external_reference?: string }> {
  const res = await fetch(`${MP_API}/payments/${mpPaymentId}`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`MP get ${res.status}`);
  return { status: data.status, external_reference: data.external_reference };
}
