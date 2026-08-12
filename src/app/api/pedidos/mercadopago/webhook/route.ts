import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MercadoPagoConfig, Payment } from "mercadopago";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("================================");
    console.log("WEBHOOK MERCADO PAGO");
    console.log("BODY:", body);
    console.log("================================");

    /*
     * O Mercado Pago pode enviar notificações
     * com diferentes formatos.
     */

    const paymentId =
      body?.data?.id ??
      body?.id ??
      null;

    if (!paymentId) {
      console.log("Webhook sem payment ID.");
      return NextResponse.json({
        received: true,
      });
    }

    const accessToken =
      process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken) {
      console.error(
        "MERCADOPAGO_ACCESS_TOKEN não configurado."
      );

      return NextResponse.json(
        {
          error:
            "Mercado Pago não configurado.",
        },
        { status: 500 }
      );
    }

    /*
     * Conecta ao Mercado Pago
     */

    const client = new MercadoPagoConfig({
      accessToken,
    });

    const payment = new Payment(client);

    /*
     * Busca o pagamento diretamente
     * na API do Mercado Pago.
     */

    const pagamento =
      await payment.get({
        id: String(paymentId),
      });

    console.log("PAGAMENTO:");
    console.log({
      id: pagamento.id,
      status: pagamento.status,
      external_reference:
        pagamento.external_reference,
    });

    /*
     * Nosso order_id foi colocado no
     * external_reference quando o pagamento
     * foi criado.
     */

    const orderId =
      pagamento.external_reference;

    if (!orderId) {
      console.error(
        "Pagamento sem external_reference."
      );

      return NextResponse.json({
        received: true,
      });
    }

    /*
     * Supabase
     */

    const supabase = await createClient();

    /*
     * Atualiza o pedido de acordo com
     * o status do Mercado Pago.
     */

    let status = "pending";

    if (pagamento.status === "approved") {
      status = "paid";
    } else if (
      pagamento.status === "rejected" ||
      pagamento.status === "cancelled"
    ) {
      status = "cancelled";
    } else if (
      pagamento.status === "refunded" ||
      pagamento.status === "charged_back"
    ) {
      status = "refunded";
    }

    const { error } = await supabase
      .from("orders")
      .update({
        status,
        payment_id: String(
          pagamento.id ?? ""
        ),
      })
      .eq("id", orderId);

    if (error) {
      console.error(
        "ERRO AO ATUALIZAR PEDIDO:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível atualizar o pedido.",
        },
        { status: 500 }
      );
    }

    console.log(
      `PEDIDO ${orderId} ATUALIZADO PARA: ${status}`
    );

    return NextResponse.json({
      received: true,
      order_id: orderId,
      payment_id: pagamento.id,
      payment_status: pagamento.status,
      order_status: status,
    });
  } catch (error) {
    console.error(
      "================================"
    );

    console.error(
      "ERRO WEBHOOK MERCADO PAGO:"
    );

    console.error(error);

    console.error(
      "================================"
    );

    /*
     * Retornamos 200 para evitar que o Mercado Pago
     * fique reenviando uma notificação causada por
     * um erro inesperado.
     */

    return NextResponse.json({
      received: true,
    });
  }
}
