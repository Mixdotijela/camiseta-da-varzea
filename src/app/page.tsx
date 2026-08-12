import { createClient } from "@/lib/supabase/server";

export default async function Home() {
const supabase = await createClient();

const { data: products } = await supabase
.from("products")
.select("id, name, slug, description, price, compare_price, stock")
.eq("active", true)
.order("created_at", { ascending: false });

const { data: images } = await supabase
.from("product_images")
.select("id, product_id, image_url, position")
.order("position", { ascending: true });

return (

  <main className="min-h-screen bg-gray-50">
    <header className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <a href="/" className="text-2xl font-bold">
          CAMISETA DA VÁRZEA
        </a>

    <nav className="flex gap-6">
      <a href="/" className="font-semibold">Início</a>
      <a href="/produtos">Produtos</a>
      <a href="/login">Entrar</a>
      <a href="/carrinho">🛒 Carrinho</a>
    </nav>
  </div>
</header>

<section className="bg-black text-white">
  <div className="max-w-7xl mx-auto px-6 py-24">
    <p className="text-sm uppercase tracking-widest text-gray-400">
      CAMISETA DA VÁRZEA
    </p>

    <h2 className="text-5xl md:text-6xl font-bold mt-4">
      Vista a camisa.
    </h2>

    <p className="mt-6 text-gray-300 max-w-xl text-lg">
      Camisas para quem vive o futebol de verdade.
    </p>

    <a
      href="/produtos"
      className="inline-block mt-8 bg-white text-black px-6 py-3 rounded-lg font-semibold"
    >
      Comprar agora
    </a>
  </div>
</section>

<section className="max-w-7xl mx-auto px-6 py-16">
  <div className="flex justify-between items-end mb-8">
    <div>
      <p className="text-sm text-gray-500">
        Confira nossa coleção
      </p>

      <h2 className="text-3xl font-bold mt-1">
        Camisas em destaque
      </h2>
    </div>

    <a href="/produtos" className="text-sm font-semibold">
      Ver todas →
    </a>
  </div>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    {products?.map((product) => {
      const image = images?.find(
        (item) => item.product_id === product.id
      );

      return (
        <article
          key={product.id}
          className="bg-white rounded-2xl overflow-hidden shadow-sm border"
        >
          <div className="aspect-square bg-gray-100">
            {image?.image_url ? (
              <img
                src={image.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-gray-400">
                  Sem imagem
                </span>
              </div>
            )}
          </div>

          <div className="p-5">
            <h3 className="font-semibold text-lg">
              {product.name}
            </h3>

            <p className="text-gray-500 text-sm mt-2">
              {product.description}
            </p>

            <div className="mt-4">
              {product.compare_price && (
                <span className="text-gray-400 line-through text-sm mr-2">
                  R$ {Number(product.compare_price).toFixed(2)}
                </span>
              )}

              <span className="font-bold text-xl">
                R$ {Number(product.price).toFixed(2)}
              </span>
            </div>

            <p className="text-sm text-gray-500 mt-2">
              {product.stock > 0
                ? product.stock + " disponíveis"
                : "Esgotado"}
            </p>

            <a
              href={"/produtos/" + product.slug}
              className="block text-center mt-5 bg-black text-white py-3 rounded-lg font-semibold"
            >
              Ver produto
            </a>
          </div>
        </article>
      );
    })}
  </div>
</section>

<footer className="bg-black text-white">
  <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row justify-between gap-6">
    <div>
      <h2 className="font-bold text-xl">
        CAMISETA DA VÁRZEA
      </h2>

      <p className="text-gray-400 text-sm mt-2">
        Futebol de verdade. Camisas de verdade.
      </p>
    </div>

    <div className="text-sm text-gray-400">
      © 2026 Camiseta da Várzea
    </div>
  </div>
</footer>

  </main>
);
}
