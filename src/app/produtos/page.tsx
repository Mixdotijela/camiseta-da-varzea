import { createClient } from "@/lib/supabase/server";

export default async function ProdutosPage() {
  const supabase = await createClient();

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select(
      "id, name, slug, description, price, compare_price, stock"
    )
    .eq("active", true)
    .order("created_at", { ascending: false });

  const { data: images, error: imagesError } = await supabase
    .from("product_images")
    .select("id, product_id, image_url, position")
    .order("position", { ascending: true });

  // Mostrar o erro completo no terminal
  if (productsError) {
    console.error("ERRO PRODUCTS:", {
      message: productsError.message,
      details: productsError.details,
      hint: productsError.hint,
      code: productsError.code,
    });
  }

  if (imagesError) {
    console.error("ERRO PRODUCT_IMAGES:", {
      message: imagesError.message,
      details: imagesError.details,
      hint: imagesError.hint,
      code: imagesError.code,
    });
  }

  return (
    <main className="min-h-screen bg-gray-50">

      {/* HEADER */}
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

            <a
              href="/produtos"
              className="font-semibold"
            >
              Produtos
            </a>

            <a href="/login">
              Entrar
            </a>

            <a href="/carrinho">
              🛒 Carrinho
            </a>

          </nav>

        </div>
      </header>

      {/* TÍTULO */}
      <section className="max-w-7xl mx-auto px-6 py-12">

        <p className="text-sm text-gray-500 uppercase tracking-widest">
          Nossa coleção
        </p>

        <h1 className="text-4xl font-bold mt-2">
          Todas as camisas
        </h1>

        <p className="text-gray-500 mt-3">
          Escolha sua camisa e vista a paixão pelo futebol.
        </p>

      </section>

      {/* PRODUTOS */}
      <section className="max-w-7xl mx-auto px-6 pb-20">

        {products && products.length > 0 ? (

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

            {products.map((product) => {

              const productImage = images?.find(
                (image) =>
                  image.product_id === product.id
              );

              return (

                <article
                  key={product.id}
                  className="bg-white rounded-2xl overflow-hidden border shadow-sm hover:shadow-lg transition"
                >

                  {/* IMAGEM */}
                  <div className="aspect-square bg-gray-100 overflow-hidden">

                    {productImage?.image_url ? (

                      <img
                        src={productImage.image_url}
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

                  {/* INFORMAÇÕES */}
                  <div className="p-5">

                    <h2 className="font-semibold text-lg">
                      {product.name}
                    </h2>

                    <p className="text-gray-500 text-sm mt-2 line-clamp-2">
                      {product.description}
                    </p>

                    {/* PREÇO */}
                    <div className="mt-4">

                      {product.compare_price && (

                        <span className="text-gray-400 line-through text-sm mr-2">
                          R${" "}
                          {Number(
                            product.compare_price
                          ).toFixed(2)}
                        </span>

                      )}

                      <span className="font-bold text-xl">
                        R${" "}
                        {Number(
                          product.price
                        ).toFixed(2)}
                      </span>

                    </div>

                    {/* ESTOQUE */}
                    <p className="text-sm mt-2">

                      {product.stock > 0 ? (

                        <span className="text-green-600">
                          {product.stock} disponíveis
                        </span>

                      ) : (

                        <span className="text-red-600">
                          Esgotado
                        </span>

                      )}

                    </p>

                    {/* BOTÃO */}
                    <a
                      href={`/produtos/${product.slug}`}
                      className="block text-center mt-5 bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition"
                    >
                      Ver produto
                    </a>

                  </div>

                </article>

              );
            })}

          </div>

        ) : (

          /* NENHUM PRODUTO */
          <div className="bg-white rounded-2xl border p-12 text-center">

            <h2 className="text-xl font-semibold">
              Nenhum produto encontrado
            </h2>

            <p className="text-gray-500 mt-2">
              Cadastre um produto no Supabase para ele aparecer aqui.
            </p>

          </div>

        )}

      </section>

      {/* FOOTER */}
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