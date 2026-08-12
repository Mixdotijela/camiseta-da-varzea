import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ProdutoCarrinho = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
};

type PedidoData = {
  nome: string;
  email?: string;
  endereco: string;
  whatsapp: string;
  cart: ProdutoCarrinho[];
};

export async function POST(request: Request) {
  try {
    const body: PedidoData = await request.json();

    const {
      nome,
      endereco,
      whatsapp,
      cart,
    } = body;

    console.log("================================");
    console.log("CRIANDO PEDIDO");
    console.log("================================");

    // ==========================
    // VALIDAR
    // ==========================

    if (!nome || !endereco || !whatsapp) {
      return NextResponse.json(
        {
          error:
            "Preencha nome, endereço e WhatsApp.",
        },
        { status: 400 }
      );
    }

    if (!cart || cart.length === 0) {
      return NextResponse.json(
        {
          error: "O carrinho está vazio.",
        },
        { status: 400 }
      );
    }

    // ==========================
    // CALCULAR TOTAL
    // ==========================

    const total = cart.reduce(
      (valor, item) => {
        const preco = Number(item.price);
        const quantidade = Number(item.quantity);

        if (
          !Number.isFinite(preco) ||
          !Number.isFinite(quantidade) ||
          quantidade <= 0
        ) {
          return valor;
        }

        return valor + preco * quantidade;
      },
      0
    );

    if (!Number.isFinite(total) || total <= 0) {
      return NextResponse.json(
        {
          error:
            "Valor total do pedido inválido.",
        },
        { status: 400 }
      );
    }

    console.log("TOTAL:", total);

    // ==========================
    // SUPABASE
    // ==========================

    const supabase = await createClient();

    const orderId = crypto.randomUUID();

    // ==========================
    // CRIAR PEDIDO
    // ==========================

    const { error: orderError } =
      await supabase
        .from("orders")
        .insert({
          id: orderId,
          customer_name: nome,
          customer_address: endereco,
          customer_whatsapp: whatsapp,
          total: Number(
            total.toFixed(2)
          ),
          payment_method: "pix",
          status: "pending",
        });

    if (orderError) {
      console.error(
        "ERRO ORDERS:",
        orderError
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível criar o pedido.",
          details:
            orderError.message,
        },
        { status: 500 }
      );
    }

    // ==========================
    // ITENS
    // ==========================

    const orderItems = cart.map(
      (item) => ({
        order_id: orderId,
        product_id: item.id,
        product_name: item.name,
        quantity: Number(
          item.quantity
        ),
        unit_price: Number(
          item.price
        ),
        subtotal:
          Number(item.price) *
          Number(item.quantity),
      })
    );

    const { error: itemsError } =
      await supabase
        .from("order_items")
        .insert(orderItems);

    if (itemsError) {
      console.error(
        "ERRO ORDER_ITEMS:",
        itemsError
      );

      await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);

      return NextResponse.json(
        {
          error:
            "Não foi possível salvar os itens.",
          details:
            itemsError.message,
        },
        { status: 500 }
      );
    }

    // ==========================
    // ACCESS TOKEN
    // ==========================

    const accessToken =
      process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();

    if (!accessToken) {
      await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);

      return NextResponse.json(
        {
          error:
            "Access Token do Mercado Pago não configurado.",
        },
        { status: 500 }
      );
    }

    // ==========================
    // E-MAIL DO BUYER DE TESTE
    // ==========================

    const payerEmail =
      process.env
        .MERCADOPAGO_TEST_PAYER_EMAIL
        ?.trim()
        .toLowerCase();

    if (
      !payerEmail ||
      !payerEmail.endsWith(
        "@testuser.com"
      )
    ) {
      await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);

      return NextResponse.json(
        {
          error:
            "Configure MERCADOPAGO_TEST_PAYER_EMAIL com o e-mail do Buyer Test User.",
        },
        { status: 400 }
      );
    }

    console.log(
      "PAYER TESTE:",
      payerEmail
    );

    // ==========================
    // MERCADO PAGO ORDERS
    // ==========================

    const mercadoPagoResponse =
      await fetch(
        "https://api.mercadopago.com/v1/orders",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Accept:
              "application/json",

            Authorization:
              `Bearer ${accessToken}`,

            "X-Idempotency-Key":
              crypto.randomUUID(),
          },

          body: JSON.stringify({
            type: "online",

            total_amount:
              Number(
                total.toFixed(2)
              ).toFixed(2),

            external_reference:
              orderId,

            processing_mode:
              "automatic",

            transactions: {
              payments: [
                {
                  amount:
                    Number(
                      total.toFixed(2)
                    ).toFixed(2),

                  payment_method: {
                    id: "pix",
                    type: "bank_transfer",
                  },

                  expiration_time:
                    "P1D",
                },
              ],
            },

            payer: {
              email: payerEmail,
            },
          }),
        }
      );

    const mercadoPagoData =
      await mercadoPagoResponse.json();

    console.log(
      "STATUS MERCADO PAGO:",
      mercadoPagoResponse.status
    );

    console.log(
      "RESPOSTA MERCADO PAGO:",
      mercadoPagoData
    );

    // ==========================
    // ERRO MERCADO PAGO
    // ==========================

    if (!mercadoPagoResponse.ok) {
      console.error(
        "================================"
      );

      console.error(
        "ERRO MERCADO PAGO"
      );

      console.error(
        mercadoPagoData
      );

      console.error(
        "================================"
      );

      await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);

      return NextResponse.json(
        {
          error:
            "Mercado Pago recusou o pagamento.",

          status:
            mercadoPagoResponse.status,

          details:
            mercadoPagoData,
        },
        {
          status:
            mercadoPagoResponse.status,
        }
      );
    }

    // ==========================
    // PAGAMENTO
    // ==========================

    const pagamento =
      mercadoPagoData
        ?.transactions
        ?.payments?.[0];

    if (!pagamento) {
      await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);

      return NextResponse.json(
        {
          error:
            "Mercado Pago não retornou o pagamento.",
          details:
            mercadoPagoData,
        },
        { status: 500 }
      );
    }

    // ==========================
    // PIX
    // ==========================

    const paymentMethod =
      pagamento.payment_method;

    const qrCode =
      paymentMethod?.qr_code ??
      null;

    const qrCodeBase64 =
      paymentMethod?.qr_code_base64 ??
      null;

    const ticketUrl =
      paymentMethod?.ticket_url ??
      null;

    console.log(
      "PIX GERADO:"
    );

    console.log(
      "PAYMENT ID:",
      pagamento.id
    );

    console.log(
      "STATUS:",
      pagamento.status
    );

    console.log(
      "QR CODE:",
      !!qrCode
    );

    console.log(
      "QR BASE64:",
      !!qrCodeBase64
    );

    // ==========================
    // ATUALIZAR PEDIDO
    // ==========================

    await supabase
      .from("orders")
      .update({
        payment_id:
          pagamento.id
            ? String(
                pagamento.id
              )
            : null,
      })
      .eq("id", orderId);

    // ==========================
    // RETORNAR PIX
    // ==========================

    return NextResponse.json({
      success: true,

      order_id:
        orderId,

      mercado_pago_order_id:
        mercadoPagoData.id ??
        null,

      payment_id:
        pagamento.id ??
        null,

      total:
        Number(
          total.toFixed(2)
        ),

      payment_method:
        "pix",

      payment_status:
        pagamento.status ??
        "action_required",

      payment_status_detail:
        pagamento.status_detail ??
        "waiting_transfer",

      // PIX COPIA E COLA
      qr_code:
        qrCode,

      // IMAGEM QR CODE
      qr_code_base64:
        qrCodeBase64,

      // LINK
      ticket_url:
        ticketUrl,
    });
  } catch (error) {
    console.error(
      "================================"
    );

    console.error(
      "ERRO INESPERADO:"
    );

    console.error(error);

    console.error(
      "================================"
    );

    return NextResponse.json(
      {
        error:
          "Erro interno ao processar o pedido.",

        details:
          error instanceof Error
            ? error.message
            : "Erro desconhecido.",
      },
      { status: 500 }
    );
  }
}