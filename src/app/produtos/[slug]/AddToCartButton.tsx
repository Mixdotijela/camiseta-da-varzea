"use client";

import { useState } from "react";

type Product = {
id: string;
name: string;
price: number;
image_url: string | null;
};

type CartItem = Product & {
quantity: number;
};

type Props = {
product: Product;
};

export default function AddToCartButton({ product }: Props) {
const [added, setAdded] = useState(false);

function adicionarAoCarrinho() {
const savedCart = localStorage.getItem("cart");

let cart: CartItem[] = [];

if (savedCart) {
  try {
    cart = JSON.parse(savedCart);
  } catch {
    cart = [];
  }
}

const existingItem = cart.find(
  (item) => item.id === product.id
);

if (existingItem) {
  cart = cart.map((item) =>
    item.id === product.id
      ? {
          ...item,
          quantity: item.quantity + 1,
        }
      : item
  );
} else {
  cart.push({
    ...product,
    quantity: 1,
  });
}

localStorage.setItem(
  "cart",
  JSON.stringify(cart)
);

setAdded(true);

setTimeout(() => {
  setAdded(false);
}, 2000);

}

return ( <button
   type="button"
   onClick={adicionarAoCarrinho}
   className="w-full bg-black text-white py-4 rounded-xl font-semibold text-lg hover:bg-gray-800 transition"
 >
{added
? "✓ Adicionado ao carrinho"
: "🛒 Adicionar ao carrinho"} </button>
);
}
