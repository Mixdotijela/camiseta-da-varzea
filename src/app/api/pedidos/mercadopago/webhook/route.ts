import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("================================");
    console.log("WEBHOOK MERCADO PAGO");
    console.log("================================");
    console.log("BODY:", body);

    // ==========================================
    // VERIFICAR TIPO DO EVENTO
    // ==========================================

    if (body?.type !== "payment") {
      console.log(
        "Evento ignorado:",
        body?.type
      );

      return NextResponse.json({
        received: true,
        ignored: true,
      });
    }

    // ==========================================
    // PEGAR ID DO PAGAMENTO
    // ==========================================

    const paymentId = body?.data?.id;

    if (!paymentId) {
      console.error(
        "Webhook sem payment ID"
      );

      return NextResponse.json(
        {
          error:
            "Payment ID não informado.",
        },
        { status: 400 }
      );
    }

    console.log(
      "PAYMENT ID:",
      paymentId
    );

    // ==========================================
    // ACCESS TOKEN
    // ==========================================

    const accessToken =
      process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();

    if (!accessToken) {
      console.error(
        "MERCADOPAGO_ACCESS_TOKEN não configurado."
      );

      return NextResponse.json(
        {
          error:
            "Access Token não configurado.",
        },
        { status: 500 }
      );
    }

    // ==========================================
    // CONSULTAR PAGAMENTO NO MERCADO PAGO
    // ==========================================

    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        method: "GET",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          Accept:
            "application/json",
        },
      }
    );

    const payment =
      await response.json();

    console.log(
      "STATUS MERCADO PAGO:",
      response.status
    );

    console.log(
      "PAGAMENTO:",
      payment
    );

    // ==========================================
    // ERRO AO CONSULTAR PAGAMENTO
    // ==========================================

    if (!response.ok) {
      console.error(
        "ERRO AO CONSULTAR PAGAMENTO:",
        payment
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível consultar o pagamento.",

          details:
            payment,
        },
        {
          status:
            response.status,
        }
      );
    }

    // ==========================================
    // PEGAR ID DO PEDIDO
    // ==========================================

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

    console.log(
      "PEDIDO:",
      orderId
    );

    // ==========================================
    // SUPABASE
    // ==========================================

    const supabase =
      await createClient();

    // ==========================================
    // STATUS DO PEDIDO
    // ==========================================

    let orderStatus = "pending";

    if (
      payment.status ===
      "approved"
    ) {
      orderStatus = "paid";
    } else if (
      payment.status ===
        "cancelled" ||
      payment.status ===
        "rejected"
    ) {
      orderStatus = "cancelled";
    } else if (
      payment.status ===
      "refunded"
    ) {
      orderStatus = "refunded";
    }

    console.log(
      "STATUS DO MERCADO PAGO:",
      payment.status
    );

    console.log(
      "STATUS DO PEDIDO:",
      orderStatus
    );

    // ==========================================
    // ATUALIZAR PEDIDO
    // ==========================================

    const { error } =
      await supabase
        .from("orders")
        .update({
          status:
            orderStatus,

          // IMPORTANTE:
          // aqui usamos o status do Mercado Pago
          // e NÃO "paid"
          payment_status:
            payment.status,

          payment_id:
            String(payment.id),
        })
        .eq(
          "id",
          orderId
        );

    // ==========================================
    // ERRO SUPABASE
    // ==========================================

    if (error) {
      console.error(
        "================================"
      );

      console.error(
        "ERRO AO ATUALIZAR PEDIDO:"
      );

      console.error(
        error
      );

      console.error(
        "================================"
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível atualizar o pedido.",

          details:
            error.message,
        },
        { status: 500 }
      );
    }

    // ==========================================
    // SUCESSO
    // ==========================================

    console.log(
      "================================"
    );

    console.log(
      "PEDIDO ATUALIZADO COM SUCESSO"
    );

    console.log(
      "PEDIDO:",
      orderId
    );

    console.log(
      "PAYMENT ID:",
      payment.id
    );

    console.log(
      "PAYMENT STATUS:",
      payment.status
    );

    console.log(
      "ORDER STATUS:",
      orderStatus
    );

    console.log(
      "================================"
    );

    return NextResponse.json({
      received: true,

      order_id:
        orderId,

      payment_id:
        payment.id,

      payment_status:
        payment.status,

      order_status:
        orderStatus,
    });
  } catch (error) {
    console.error(
      "================================"
    );

    console.error(
      "ERRO NO WEBHOOK:"
    );

    console.error(
      error
    );

    console.error(
      "================================"
    );

    return NextResponse.json(
      {
        error:
          "Erro interno no webhook.",

        details:
          error instanceof Error
            ? error.message
            : "Erro desconhecido.",
      },
      { status: 500 }
    );
  }
}
