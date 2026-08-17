import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  MercadoPagoConfig,
  Payment,
} from "mercadopago";

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export async function POST(request: Request) {
  try {
    console.log("================================");
    console.log("CRIANDO PEDIDO");
    console.log("================================");

    const body = await request.json();

    const {
      nome,
      email,
      endereco,
      whatsapp,
      cart,
    } = body;

    console.log("DADOS:", {
      nome,
      email,
      endereco,
      whatsapp,
    });

    console.log("CARRINHO:", cart);

    // -----------------------------
    // VALIDAÇÃO
    // -----------------------------

    if (!nome || !email || !endereco || !whatsapp) {
      return NextResponse.json(
        {
          error:
            "Nome, e-mail, endereço e WhatsApp são obrigatórios.",
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json(
        {
          error: "Carrinho vazio.",
        },
        { status: 400 }
      );
    }

    // -----------------------------
    // CALCULAR SUBTOTAL
    // -----------------------------

    const subtotal = cart.reduce(
      (total: number, item: CartItem) => {
        return (
          total +
          Number(item.price) *
            Number(item.quantity)
        );
      },
      0
    );

    if (!Number.isFinite(subtotal) || subtotal <= 0) {
      return NextResponse.json(
        {
          error: "Subtotal inválido.",
        },
        { status: 400 }
      );
    }

    console.log("SUBTOTAL:", subtotal);

    // -----------------------------
    // SUPABASE
    // -----------------------------

    const supabase = await createClient();

    // -----------------------------
    // CRIAR PEDIDO
    // -----------------------------

    const { data: order, error: orderError } =
      await supabase
        .from("orders")
        .insert({
          customer_name: nome,
          customer_address: endereco,
          customer_whatsapp: whatsapp,

          status: "pending",
          payment_status: "pending",
          payment_method: "pix",

          subtotal: Number(
            subtotal.toFixed(2)
          ),

          shipping_fee: 0,
        })
        .select("id")
        .single();

    if (orderError || !order) {
      console.error(
        "ERRO AO CRIAR PEDIDO:",
        orderError
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível criar o pedido.",
          details: orderError?.message,
        },
        { status: 500 }
      );
    }

    const orderId = order.id;

    console.log(
      "PEDIDO CRIADO:",
      orderId
    );

    // -----------------------------
    // CRIAR ITENS
    // -----------------------------

    const orderItems = cart.map(
      (item: CartItem) => ({
        order_id: orderId,
        product_id: item.id,
        quantity: Number(item.quantity),
        price: Number(item.price),
      })
    );

    const { error: itemsError } =
      await supabase
        .from("order_items")
        .insert(orderItems);

    if (itemsError) {
      console.error(
        "ERRO AO CRIAR ITENS:",
        itemsError
      );

      return NextResponse.json(
        {
          error:
            "Pedido criado, mas os itens não puderam ser registrados.",
          details: itemsError.message,
          order_id: orderId,
        },
        { status: 500 }
      );
    }

    console.log(
      "ITENS CRIADOS COM SUCESSO"
    );

    // -----------------------------
    // MERCADO PAGO
    // -----------------------------

    const accessToken =
      process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();

    if (!accessToken) {
      console.error(
        "MERCADOPAGO_ACCESS_TOKEN NÃO CONFIGURADO"
      );

      return NextResponse.json(
        {
          error:
            "Mercado Pago não está configurado.",
          order_id: orderId,
        },
        { status: 500 }
      );
    }

    const client =
      new MercadoPagoConfig({
        accessToken,
      });

    const payment =
      new Payment(client);

    console.log(
      "CRIANDO PIX NO MERCADO PAGO..."
    );

    // -----------------------------
    // CRIAR PAGAMENTO PIX
    // -----------------------------

    const pagamento =
      await payment.create({
        body: {
          transaction_amount:
            Number(
              subtotal.toFixed(2)
            ),

          description:
            `Pedido ${orderId} - Camiseta da Várzea`,

          payment_method_id: "pix",

          payer: {
            email: email,
            first_name: nome,
          },

          external_reference:
            String(orderId),

          notification_url:
            `${process.env.NEXT_PUBLIC_SITE_URL}/api/pedidos/mercadopago`,
        },
      });

    console.log(
      "MERCADO PAGO:",
      {
        id: pagamento.id,
        status: pagamento.status,
        status_detail:
          pagamento.status_detail,
      }
    );

    if (!pagamento.id) {
      return NextResponse.json(
        {
          error:
            "Mercado Pago não retornou o ID do pagamento.",
          order_id: orderId,
        },
        { status: 502 }
      );
    }

    // -----------------------------
    // SALVAR PAYMENT ID
    // -----------------------------

    const { error: paymentError } =
      await supabase
        .from("orders")
        .update({
          payment_id:
            String(pagamento.id),

          payment_status:
            pagamento.status ??
            "pending",
        })
        .eq("id", orderId);

    if (paymentError) {
      console.error(
        "ERRO AO SALVAR PAYMENT ID:",
        paymentError
      );
    }

    // -----------------------------
    // PEGAR DADOS DO PIX
    // -----------------------------

    const transactionData =
      pagamento
        .point_of_interaction
        ?.transaction_data;

    const qrCode =
      transactionData?.qr_code ??
      null;

    const qrCodeBase64 =
      transactionData?.qr_code_base64 ??
      null;

    const ticketUrl =
      transactionData?.ticket_url ??
      null;

    console.log("PIX GERADO:", {
      qrCode: !!qrCode,
      qrCodeBase64:
        !!qrCodeBase64,
      ticketUrl,
    });

    // -----------------------------
    // RETORNO
    // -----------------------------

    return NextResponse.json({
      success: true,

      order_id: orderId,

      payment_id:
        pagamento.id,

      payment_status:
        pagamento.status ??
        "pending",

      qr_code:
        qrCode,

      qr_code_base64:
        qrCodeBase64,

      ticket_url:
        ticketUrl,
    });

  } catch (error: any) {
    console.error(
      "================================"
    );

    console.error(
      "ERRO AO CRIAR PEDIDO:"
    );

    console.error(error);

    console.error(
      "================================"
    );

    const detalhes =
      error?.cause ??
      error?.response?.data ??
      error?.message ??
      error;

    console.error(
      "DETALHES:",
      detalhes
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível criar o pagamento.",
        details: detalhes,
      },
      { status: 500 }
    );
  }
}
