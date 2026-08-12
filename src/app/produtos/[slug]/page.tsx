import { createClient } from "@/lib/supabase/server";
import AddToCartButton from "./AddToCartButton";

export default async function ProdutoPage({
params,
}: {
params: Promise<{ slug: string }>;
}) {
const { slug } = await params;

const supabase = await createClient();

const { data: product, error } = await supabase
.from("products")
.select(
"id, name, slug, description, price, compare_price, stock"
)
.eq("slug", slug)
.eq("active", true)
.single();

if (error || !product) {
return ( <main className="min-h-screen bg-gray-50"> <header className="bg-white border-b"> <div className="max-w-7xl mx-auto px-6 py-5"> <a
           href="/"
           className="text-2xl font-bold"
         >
CAMISETA DA VÁRZEA </a> </div> </header>

```
    <section className="max-w-7xl mx-auto px-6 py-20 text-center">
      <h1 className="text-3xl font-bold">
        Produto não encontrado
      </h1>

      <p className="text-gray-500 mt-3">
        Esse produto não existe ou não está disponível.
      </p>

      <a
        href="/produtos"
        className="inline-block mt-6 bg-black text-white px-6 py-3 rounded-lg"
      >
        Voltar para produtos
      </a>
    </section>
  </main>
);

}

const { data: images } = await supabase
.from("product_images")
.select("id, product_id, image_url, position")
.eq("product_id", product.id)
.order("position", {
ascending: true,
});

const mainImage =
images && images.length > 0
? images[0].image_url
: null;

return ( <main className="min-h-screen bg-gray-50"> <header className="bg-white border-b"> <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between"> <a
         href="/"
         className="text-2xl font-bold"
       >
CAMISETA DA VÁRZEA </a>

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

  <section className="max-w-7xl mx-auto px-6 py-12">
    <a
      href="/produtos"
      className="text-sm text-gray-500 hover:text-black"
    >
      ← Voltar para produtos
    </a>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-8">
      <div>
        <div className="aspect-square bg-white rounded-2xl overflow-hidden border">
          {mainImage ? (
            <img
              src={mainImage}
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

        {images && images.length > 1 && (
          <div className="grid grid-cols-4 gap-3 mt-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="aspect-square bg-white rounded-lg overflow-hidden border"
              >
                <img
                  src={image.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="py-4">
        <p className="text-sm text-gray-500 uppercase tracking-widest">
          CAMISETA DA VÁRZEA
        </p>

        <h1 className="text-4xl font-bold mt-3">
          {product.name}
        </h1>

        <p className="text-gray-500 mt-5 leading-relaxed">
          {product.description}
        </p>

        <div className="mt-8">
          {product.compare_price && (
            <span className="text-gray-400 line-through text-lg mr-3">
              R$ {Number(product.compare_price).toFixed(2)}
            </span>
          )}

          <span className="font-bold text-3xl">
            R$ {Number(product.price).toFixed(2)}
          </span>
        </div>

        <div className="mt-5">
          {product.stock > 0 ? (
            <p className="text-green-600 font-medium">
              ✓ {product.stock} unidades disponíveis
            </p>
          ) : (
            <p className="text-red-600 font-medium">
              ✕ Produto esgotado
            </p>
          )}
        </div>

        {product.stock > 0 && (
          <div className="mt-8">
            <AddToCartButton
              product={{
                id: product.id,
                name: product.name,
                price: Number(product.price),
                image_url: mainImage,
              }}
            />
          </div>
        )}
      </div>
    </div>
  </section>

  <footer className="bg-black text-white">
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
