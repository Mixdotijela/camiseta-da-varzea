import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("================================");
    console.log("WEBHOOK MERCADO PAGO");
    console.log("================================");
    console.log("BODY:", body);

    // O Mercado Pago envia eventos do tipo "payment"
    if (body?.type !== "payment") {
      console.log("Evento ignorado:", body?.type);

      return NextResponse.json({
        received: true,
        ignored: true,
      });
    }

    const paymentId = body?.data?.id;

    if (!paymentId) {
      console.error("Webhook sem payment ID");

      return NextResponse.json(
        {
          error: "Payment ID não informado.",
        },
        { status: 400 }
      );
    }

    const accessToken =
      process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();

    if (!accessToken) {
      console.error(
        "MERCADOPAGO_ACCESS_TOKEN não configurado."
      );

      return NextResponse.json(
        {
          error: "Access Token não configurado.",
        },
        { status: 500 }
      );
    }

    // Consulta o pagamento diretamente no Mercado Pago
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    const payment = await response.json();

    console.log("STATUS MERCADO PAGO:", response.status);
    console.log("PAGAMENTO:", payment);

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Não foi possível consultar o pagamento.",
          details: payment,
        },
        { status: response.status }
      );
    }

    const orderId =
      payment?.external_reference;

    if (!orderId) {
      console.error(
        "Pagamento sem external_reference."
      );

      return NextResponse.json({
        received: true,
        warning:
          "Pagamento recebido, mas sem external_reference.",
      });
    }

    const supabase = await createClient();

    // Converte o status do Mercado Pago
    let status = "pending";

    if (payment.status === "approved") {
      status = "paid";
    } else if (
      payment.status === "cancelled" ||
      payment.status === "rejected"
    ) {
      status = "cancelled";
    } else if (payment.status === "refunded") {
      status = "refunded";
    }

    console.log("PEDIDO:", orderId);
    console.log("NOVO STATUS:", status);

    const { error } = await supabase
      .from("orders")
      .update({
        status,
        payment_id: String(payment.id),
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
          details: error.message,
        },
        { status: 500 }
      );
    }

    console.log(
      "PEDIDO ATUALIZADO COM SUCESSO"
    );

    return NextResponse.json({
      received: true,
      order_id: orderId,
      payment_id: payment.id,
      payment_status: payment.status,
      order_status: status,
    });
  } catch (error) {
    console.error(
      "ERRO NO WEBHOOK:",
      error
    );

    return NextResponse.json(
      {
        error: "Erro interno no webhook.",
      },
      { status: 500 }
    );
  }
}

