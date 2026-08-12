"use client";

import { useEffect, useState } from "react";

type CartItem = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
};

export default function CarrinhoPage() {
  const [cart, setCart] = useState<CartItem[]>([]);

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

  function atualizarCarrinho(novoCarrinho: CartItem[]) {
    setCart(novoCarrinho);
    localStorage.setItem("cart", JSON.stringify(novoCarrinho));
  }

  function aumentar(id: string) {
    const novoCarrinho = cart.map((item) =>
      item.id === id
        ? {
            ...item,
            quantity: item.quantity + 1,
          }
        : item
    );

    atualizarCarrinho(novoCarrinho);
  }

  function diminuir(id: string) {
    const novoCarrinho = cart
      .map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: item.quantity - 1,
            }
          : item
      )
      .filter((item) => item.quantity > 0);

    atualizarCarrinho(novoCarrinho);
  }

  function remover(id: string) {
    const novoCarrinho = cart.filter((item) => item.id !== id);

    atualizarCarrinho(novoCarrinho);
  }

  function finalizarCompra() {
    window.location.href = "/checkout";
  }

  const total = cart.reduce(
    (valor, item) => valor + item.price * item.quantity,
    0
  );

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

        <h1 className="text-4xl font-bold">
          Seu carrinho
        </h1>

        {cart.length === 0 ? (

          <div className="bg-white rounded-2xl border p-12 text-center mt-8">

            <h2 className="text-2xl font-semibold">
              Seu carrinho está vazio
            </h2>

            <p className="text-gray-500 mt-3">
              Adicione uma camisa para começar sua compra.
            </p>

            <a
              href="/produtos"
              className="inline-block mt-6 bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition"
            >
              Ver produtos
            </a>

          </div>

        ) : (

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">

            <div className="lg:col-span-2 space-y-4">

              {cart.map((item) => (

                <div
                  key={item.id}
                  className="bg-white rounded-2xl border p-5 flex gap-5"
                >

                  <div className="w-28 h-28 bg-gray-100 rounded-xl overflow-hidden shrink-0">

                    {item.image_url ? (

                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />

                    ) : (

                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                        Sem imagem
                      </div>

                    )}

                  </div>

                  <div className="flex-1">

                    <h2 className="font-semibold text-lg">
                      {item.name}
                    </h2>

                    <p className="text-gray-500 mt-1">
                      R$ {item.price.toFixed(2)}
                    </p>

                    <div className="flex items-center gap-3 mt-4">

                      <button
                        type="button"
                        onClick={() => diminuir(item.id)}
                        className="w-9 h-9 border rounded-lg hover:bg-gray-100"
                      >
                        −
                      </button>

                      <span className="font-semibold">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() => aumentar(item.id)}
                        className="w-9 h-9 border rounded-lg hover:bg-gray-100"
                      >
                        +
                      </button>

                    </div>

                    <button
                      type="button"
                      onClick={() => remover(item.id)}
                      className="text-red-600 text-sm mt-4 hover:underline"
                    >
                      Remover
                    </button>

                  </div>

                  <div className="font-bold text-lg">
                    R$ {(item.price * item.quantity).toFixed(2)}
                  </div>

                </div>

              ))}

            </div>

            <div className="bg-white rounded-2xl border p-6 h-fit">

              <h2 className="text-xl font-bold">
                Resumo
              </h2>

              <div className="flex justify-between mt-6">

                <span className="text-gray-500">
                  Subtotal
                </span>

                <span className="font-semibold">
                  R$ {total.toFixed(2)}
                </span>

              </div>

              <div className="flex justify-between mt-3">

                <span className="text-gray-500">
                  Frete
                </span>

                <span className="font-semibold">
                  A combinar
                </span>

              </div>

              <div className="border-t mt-5 pt-5 flex justify-between">

                <span className="font-bold">
                  Total
                </span>

                <span className="font-bold text-xl">
                  R$ {total.toFixed(2)}
                </span>

              </div>

              <button
                type="button"
                onClick={finalizarCompra}
                className="w-full mt-6 bg-black text-white py-4 rounded-xl font-semibold hover:bg-gray-800 transition"
              >
                Finalizar compra
              </button>

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