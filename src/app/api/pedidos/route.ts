import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MercadoPagoConfig, Payment } from "mercadopago";

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

    console.log("CLIENTE:", {
      nome,
      email,
      endereco,
      whatsapp,
    });

    console.log("CARRINHO:", cart);

    // -----------------------------------------
    // VALIDAÇÃO
    // -----------------------------------------

    if (
      !nome ||
      !email ||
      !endereco ||
      !whatsapp
    ) {
      return NextResponse.json(
        {
          error:
            "Nome, e-mail, endereço e WhatsApp são obrigatórios.",
        },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(cart) ||
      cart.length === 0
    ) {
      return NextResponse.json(
        {
          error: "O carrinho está vazio.",
        },
        { status: 400 }
      );
    }

    // -----------------------------------------
    // SUPABASE
    // -----------------------------------------

    const supabase = await createClient();

    // -----------------------------------------
    // CALCULA O TOTAL
    // -----------------------------------------

    const total = cart.reduce(
      (soma: number, item: CartItem) => {
        return (
          soma +
          Number(item.price) *
            Number(item.quantity)
        );
      },
      0
    );

    console.log("TOTAL:", total);

    if (!Number.isFinite(total) || total <= 0) {
      return NextResponse.json(
        {
          error: "Valor do pedido inválido.",
        },
        { status: 400 }
      );
    }

    // -----------------------------------------
    // CRIA O PEDIDO
    // -----------------------------------------

    const { data: order, error: orderError } =
      await supabase
        .from("orders")
        .insert({
          customer_name: nome,
          customer_email: email,
          customer_address: endereco,
          customer_whatsapp: whatsapp,
          total: total,
          status: "pending",
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

    // -----------------------------------------
    // CRIA OS ITENS DO PEDIDO
    // -----------------------------------------

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
            "Pedido criado, mas não foi possível registrar os itens.",
          details: itemsError.message,
          order_id: orderId,
        },
        { status: 500 }
      );
    }

    // -----------------------------------------
    // MERCADO PAGO
    // -----------------------------------------

    const accessToken =
      process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();

    if (!accessToken) {
      console.error(
        "MERCADOPAGO_ACCESS_TOKEN NÃO CONFIGURADO."
      );

      return NextResponse.json(
        {
          error:
            "Mercado Pago não está configurado no servidor.",
          order_id: orderId,
        },
        { status: 500 }
      );
    }

    const client =
      new MercadoPagoConfig({
        accessToken,
      });

    const payment = new Payment(client);

    // -----------------------------------------
    // CRIA PAGAMENTO PIX
    // -----------------------------------------

    console.log(
      "CRIANDO PAGAMENTO PIX..."
    );

    const pagamento =
      await payment.create({
        body: {
          transaction_amount: Number(
            total.toFixed(2)
          ),

          description:
            `Pedido ${orderId} - Camiseta da Várzea`,

          payment_method_id: "pix",

          payer: {
            email: email,
            first_name: nome,
          },

          external_reference: String(
            orderId
          ),

          notification_url:
            `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhook/mercadopago`,
        },
      });

    console.log(
      "PAGAMENTO MERCADO PAGO:",
      {
        id: pagamento.id,
        status: pagamento.status,
        status_detail:
          pagamento.status_detail,
      }
    );

    // -----------------------------------------
    // VERIFICA SE O MERCADO PAGO ACEITOU
    // -----------------------------------------

    if (!pagamento.id) {
      console.error(
        "MERCADO PAGO NÃO RETORNOU PAYMENT ID:",
        pagamento
      );

      return NextResponse.json(
        {
          error:
            "Mercado Pago não retornou o ID do pagamento.",
          details: pagamento,
          order_id: orderId,
        },
        { status: 502 }
      );
    }

    // -----------------------------------------
    // ATUALIZA PEDIDO COM PAYMENT ID
    // -----------------------------------------

    const { error: updateError } =
      await supabase
        .from("orders")
        .update({
          payment_id: String(
            pagamento.id
          ),
        })
        .eq("id", orderId);

    if (updateError) {
      console.error(
        "ERRO AO SALVAR PAYMENT ID:",
        updateError
      );
    }

    // -----------------------------------------
    // DADOS DO PIX
    // -----------------------------------------

    const pointOfInteraction =
      pagamento.point_of_interaction;

    const transactionData =
      pointOfInteraction
        ?.transaction_data;

    const qrCode =
      transactionData?.qr_code ?? null;

    const qrCodeBase64 =
      transactionData?.qr_code_base64 ?? null;

    const ticketUrl =
      transactionData?.ticket_url ?? null;

    console.log("PIX GERADO:", {
      qrCodeExiste: !!qrCode,
      qrCodeBase64Existe:
        !!qrCodeBase64,
      ticketUrl,
    });

    // -----------------------------------------
    // RETORNO PARA O CHECKOUT
    // -----------------------------------------

    return NextResponse.json({
      success: true,

      order_id: orderId,

      payment_id: pagamento.id,

      payment_status:
        pagamento.status ?? "pending",

      payment_status_detail:
        pagamento.status_detail ?? null,

      qr_code: qrCode,

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

    // -----------------------------------------
    // MOSTRA O ERRO REAL DO MERCADO PAGO
    // -----------------------------------------

    const mercadoPagoError =
      error?.cause ??
      error?.response?.data ??
      error?.message ??
      error;

    console.error(
      "DETALHES DO ERRO:",
      mercadoPagoError
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível criar o pagamento.",
        details: mercadoPagoError,
      },
      { status: 402 }
    );
  }
}
