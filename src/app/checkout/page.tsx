"use client";

import { useEffect, useState } from "react";

type CartItem = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
};

type PagamentoPix = {
  qr_code: string | null;
  qr_code_base64: string | null;
  ticket_url: string | null;
  payment_id: string | number | null;
  payment_status: string | null;
};

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([]);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [endereco, setEndereco] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const [carregando, setCarregando] = useState(false);
  const [pedidoCriado, setPedidoCriado] = useState(false);
  const [pedidoId, setPedidoId] = useState("");

  const [pagamento, setPagamento] = useState<PagamentoPix>({
    qr_code: null,
    qr_code_base64: null,
    ticket_url: null,
    payment_id: null,
    payment_status: null,
  });

  useEffect(() => {
    const savedCart = localStorage.getItem("cart");

    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch {
        setCart([]);
      }
    }
  }, []);

  const total = cart.reduce(
    (valor, item) => valor + item.price * item.quantity,
    0
  );

  async function finalizarPedido(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (cart.length === 0) {
      alert("Seu carrinho está vazio.");
      return;
    }

    if (!nome || !email || !endereco || !whatsapp) {
      alert("Preencha todos os campos.");
      return;
    }

    setCarregando(true);

    try {
      const response = await fetch("/api/pedidos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome,
          email,
          endereco,
          whatsapp,
          cart,
        }),
      });

      const data = await response.json();

      console.log("RESPOSTA DO PEDIDO:", data);

      if (!response.ok) {
        alert(
          data.error ||
            "Não foi possível criar o pedido."
        );
        return;
      }

      setPedidoId(data.order_id);

      setPagamento({
        qr_code: data.qr_code ?? null,
        qr_code_base64:
          data.qr_code_base64 ?? null,
        ticket_url: data.ticket_url ?? null,
        payment_id: data.payment_id ?? null,
        payment_status:
          data.payment_status ?? null,
      });

      setPedidoCriado(true);

      localStorage.removeItem("cart");
      setCart([]);
    } catch (error) {
      console.error("ERRO CHECKOUT:", error);

      alert(
        "Erro ao conectar com o servidor. Tente novamente."
      );
    } finally {
      setCarregando(false);
    }
  }

  if (pedidoCriado) {
    return (
      <main className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-6 py-5">
            <a
              href="/"
              className="text-2xl font-bold"
            >
              CAMISETA DA VÁRZEA
            </a>
          </div>
        </header>

        <section className="max-w-2xl mx-auto px-6 py-12">
          <div className="bg-white border rounded-2xl p-8 text-center">

            <div className="text-6xl mb-6">
              🟢
            </div>

            <h1 className="text-3xl font-bold">
              Pedido criado!
            </h1>

            <p className="text-gray-500 mt-4">
              Seu pedido foi registrado com sucesso.
            </p>

            {/* PEDIDO */}
            <div className="bg-gray-50 rounded-xl p-5 mt-6">
              <p className="text-sm text-gray-500">
                Número do pedido
              </p>

              <p className="font-bold text-lg mt-2 break-all">
                {pedidoId}
              </p>
            </div>

            {/* PAGAMENTO */}
            <div className="mt-6 border-2 border-green-200 rounded-2xl p-6">

              <h2 className="text-2xl font-bold">
                Pague com Pix
              </h2>

              <p className="text-gray-500 mt-2">
                Escaneie o QR Code pelo aplicativo do seu banco.
              </p>

              {/* QR CODE */}
              {pagamento.qr_code_base64 ? (
                <div className="flex justify-center mt-6">
                  <div className="bg-white border rounded-xl p-4">
                    <img
                      src={
                        pagamento.qr_code_base64.startsWith(
                          "data:image"
                        )
                          ? pagamento.qr_code_base64
                          : `data:image/png;base64,${pagamento.qr_code_base64}`
                      }
                      alt="QR Code Pix"
                      className="w-64 h-64"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-6">
                  <p className="text-yellow-800">
                    O Mercado Pago não retornou o QR Code.
                  </p>
                </div>
              )}

              {/* COPIA E COLA */}
              {pagamento.qr_code && (
                <div className="mt-6 text-left">

                  <label className="block font-semibold mb-2">
                    Pix Copia e Cola
                  </label>

                  <div className="flex gap-2">

                    <input
                      type="text"
                      readOnly
                      value={pagamento.qr_code}
                      className="flex-1 border rounded-xl px-4 py-3 text-sm bg-gray-50"
                    />

                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            pagamento.qr_code || ""
                          );

                          alert(
                            "Código Pix copiado!"
                          );
                        } catch {
                          alert(
                            "Não foi possível copiar automaticamente."
                          );
                        }
                      }}
                      className="bg-black text-white px-5 py-3 rounded-xl font-semibold"
                    >
                      Copiar
                    </button>

                  </div>

                  <p className="text-xs text-gray-500 mt-2">
                    Copie o código e cole no aplicativo do seu banco.
                  </p>

                </div>
              )}

              {/* STATUS */}
              <div className="mt-6 bg-gray-50 rounded-xl p-4">

                <p className="text-sm text-gray-500">
                  Status do pagamento
                </p>

                <p className="font-bold mt-1">
                  {pagamento.payment_status ===
                  "approved"
                    ? "✅ Pagamento aprovado"
                    : "⏳ Aguardando pagamento"}
                </p>

              </div>

              {/* ID PAGAMENTO */}
              {pagamento.payment_id && (
                <p className="text-xs text-gray-400 mt-4 break-all">
                  ID do pagamento:{" "}
                  {pagamento.payment_id}
                </p>
              )}

            </div>

            {/* LINK MERCADO PAGO */}
            {pagamento.ticket_url && (
              <a
                href={pagamento.ticket_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-6 border border-gray-300 py-3 rounded-xl font-semibold hover:bg-gray-50"
              >
                Abrir pagamento no Mercado Pago
              </a>
            )}

            <a
              href="/produtos"
              className="inline-block mt-6 bg-black text-white px-6 py-3 rounded-xl font-semibold"
            >
              Continuar comprando
            </a>

          </div>
        </section>

        <footer className="bg-black text-white mt-20">
          <div className="max-w-7xl mx-auto px-6 py-10">
            <h2 className="font-bold text-xl">
              CAMISETA DA VÁRZEA
            </h2>

            <p className="text-gray-400 text-sm mt-2">
              Futebol de verdade. Camisas de verdade.
            </p>
          </div>
        </footer>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">

      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">

          <a
            href="/"
            className="text-2xl font-bold"
          >
            CAMISETA DA VÁRZEA
          </a>

          <nav className="flex gap-6">
            <a href="/">
              Início
            </a>

            <a href="/produtos">
              Produtos
            </a>

            <a href="/login">
              Entrar
            </a>

            <a
              href="/carrinho"
              className="font-semibold"
            >
              🛒 Carrinho
            </a>
          </nav>

        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 py-12">

        <a
          href="/carrinho"
          className="text-sm text-gray-500 hover:text-black"
        >
          ← Voltar para o carrinho
        </a>

        <h1 className="text-4xl font-bold mt-6">
          Finalizar compra
        </h1>

        {cart.length === 0 ? (

          <div className="bg-white border rounded-2xl p-10 text-center mt-8">

            <h2 className="text-2xl font-bold">
              Seu carrinho está vazio
            </h2>

            <p className="text-gray-500 mt-3">
              Adicione algum produto antes de finalizar a compra.
            </p>

            <a
              href="/produtos"
              className="inline-block mt-6 bg-black text-white px-6 py-3 rounded-lg"
            >
              Ver produtos
            </a>

          </div>

        ) : (

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">

            <form
              onSubmit={finalizarPedido}
              className="lg:col-span-2 bg-white border rounded-2xl p-6"
            >

              <h2 className="text-2xl font-bold">
                Seus dados
              </h2>

              <div className="mt-6">

                <label className="block font-medium mb-2">
                  Nome completo
                </label>

                <input
                  type="text"
                  value={nome}
                  onChange={(e) =>
                    setNome(e.target.value)
                  }
                  placeholder="Digite seu nome"
                  className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
                  required
                />

              </div>

              <div className="mt-5">

                <label className="block font-medium mb-2">
                  E-mail
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="seuemail@gmail.com"
                  className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
                  required
                />

              </div>

              <div className="mt-5">

                <label className="block font-medium mb-2">
                  Endereço
                </label>

                <textarea
                  value={endereco}
                  onChange={(e) =>
                    setEndereco(e.target.value)
                  }
                  placeholder="Rua, número, bairro, cidade e complemento"
                  rows={4}
                  className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
                  required
                />

              </div>

              <div className="mt-5">

                <label className="block font-medium mb-2">
                  WhatsApp
                </label>

                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) =>
                    setWhatsapp(e.target.value)
                  }
                  placeholder="(11) 99999-9999"
                  className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
                  required
                />

              </div>

              <div className="mt-8 border-t pt-6">

                <h2 className="text-xl font-bold">
                  Forma de pagamento
                </h2>

                <div className="mt-4 border-2 border-black rounded-xl p-5">

                  <div className="flex items-center gap-3">

                    <span className="text-2xl">
                      🟢
                    </span>

                    <div>

                      <p className="font-bold">
                        Pix
                      </p>

                      <p className="text-sm text-gray-500">
                        Pagamento rápido e seguro
                      </p>

                    </div>

                  </div>

                </div>

              </div>

              <button
                type="submit"
                disabled={carregando}
                className="w-full mt-8 bg-black text-white py-4 rounded-xl font-semibold text-lg hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {carregando
                  ? "Criando pedido..."
                  : "Finalizar pedido"}
              </button>

            </form>

            <div className="bg-white border rounded-2xl p-6 h-fit">

              <h2 className="text-xl font-bold">
                Resumo do pedido
              </h2>

              <div className="mt-6 space-y-4">

                {cart.map((item) => (

                  <div
                    key={item.id}
                    className="flex justify-between gap-4"
                  >

                    <div>

                      <p className="font-medium">
                        {item.name}
                      </p>

                      <p className="text-sm text-gray-500">
                        {item.quantity}x R${" "}
                        {item.price.toFixed(2)}
                      </p>

                    </div>

                    <p className="font-semibold">
                      R${" "}
                      {(
                        item.price *
                        item.quantity
                      ).toFixed(2)}
                    </p>

                  </div>

                ))}

              </div>

              <div className="border-t mt-6 pt-6 flex justify-between">

                <span className="font-bold">
                  Total
                </span>

                <span className="font-bold text-xl">
                  R$ {total.toFixed(2)}
                </span>

              </div>

              <div className="mt-5 bg-gray-50 rounded-xl p-4">

                <p className="text-sm text-gray-500">
                  Forma de pagamento
                </p>

                <p className="font-bold mt-1">
                  🟢 Pix
                </p>

              </div>

            </div>

          </div>

        )}

      </section>

      <footer className="bg-black text-white mt-20">

        <div className="max-w-7xl mx-auto px-6 py-10">

          <h2 className="font-bold text-xl">
            CAMISETA DA VÁRZEA
          </h2>

          <p className="text-gray-400 text-sm mt-2">
            Futebol de verdade. Camisas de verdade.
          </p>

        </div>

      </footer>

    </main>
  );
}
