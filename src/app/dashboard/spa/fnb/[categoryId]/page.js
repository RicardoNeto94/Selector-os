"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SpaCategoryProductsPage() {

  const supabase = createClient();
  const params = useParams();

  const categoryId = params.categoryId;

  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);

  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [expandedId, setExpandedId] =
  useState(null);

  async function loadData() {

    const { data: categoryData } = await supabase
      .from("spa_categories")
      .select("*")
      .eq("id", categoryId)
      .single();

    const { data: productsData } = await supabase
      .from("spa_products")
      .select("*")
      .eq("category_id", categoryId)
      .order("position");

    setCategory(categoryData);
    setProducts(productsData || []);

  }

  useEffect(() => {

    if (categoryId) {
      loadData();
    }

  }, [categoryId]);

  async function addProduct() {

    if (!newName.trim()) return;

    await supabase
      .from("spa_products")
      .insert([
        {
          category_id: categoryId,
          name: newName,
          price: newPrice || null,
          position: products.length + 1
        }
      ]);

    setNewName("");
    setNewPrice("");

    loadData();

  }

  async function deleteProduct(id) {

    const confirmed = window.confirm(
      "Delete product?"
    );

    if (!confirmed) return;

    await supabase
      .from("spa_products")
      .delete()
      .eq("id", id);

    loadData();

  }

  return (

    <div className="so-main-inner space-y-8">

      <div>

        <div
          className="
          text-xs
          uppercase
          tracking-[0.25em]
          text-[var(--text-muted)]
          mb-3
        "
        >
          Burman Spa
        </div>

        <h1 className="text-3xl font-light">
          {category?.name || "Category"}
        </h1>

      </div>

      {/* ADD PRODUCT */}

      <div className="panel p-6">

        <div className="grid md:grid-cols-3 gap-4">

          <input
            className="so-input"
            placeholder="Product Name"
            value={newName}
            onChange={(e) =>
              setNewName(e.target.value)
            }
          />

          <input
            className="so-input"
            placeholder="Price"
            value={newPrice}
            onChange={(e) =>
              setNewPrice(e.target.value)
            }
          />

          <button
            className="button"
            onClick={addProduct}
          >
            Add Product
          </button>

        </div>

      </div>

      {/* PRODUCTS */}

<div className="panel p-6">

  <div className="text-lg font-medium mb-5">
    Products
  </div>

  <div className="space-y-3">

    {products.map((product) => (

      <div
        key={product.id}
        className="
        border
        border-[var(--border)]
        rounded-2xl
        overflow-hidden
      "
      >

        {/* HEADER */}

        <button
          type="button"
          className="
          w-full
          p-4

          flex
          items-center
          justify-between

          text-left
        "
          onClick={() =>
            setExpandedId(
              expandedId === product.id
                ? null
                : product.id
            )
          }
        >

          <div>

            <div className="font-medium">
              {product.name || "Unnamed Product"}
            </div>

            <div
              className="
              text-xs
              text-[var(--text-muted)]
            "
            >
              {product.brand || "No Brand"}
            </div>

          </div>

          <div className="flex items-center gap-4">

            <div>
              €{product.price || 0}
            </div>

            <div>
              {expandedId === product.id
                ? "▲"
                : "▼"}
            </div>

          </div>

        </button>

        {/* EXPANDED CONTENT */}

        {expandedId === product.id && (

          <div
            className="
            p-5
            border-t
            border-[var(--border)]
          "
          >

            <div className="grid gap-4">

              <input
                className="so-input"
                value={product.name || ""}
                onChange={(e) => {

                  setProducts(
                    products.map(p =>
                      p.id === product.id
                        ? {
                            ...p,
                            name: e.target.value
                          }
                        : p
                    )
                  );

                }}
              />

              <textarea
                className="so-input min-h-[100px]"
                placeholder="Description..."
                value={product.description || ""}
                onChange={(e) => {

                  setProducts(
                    products.map(p =>
                      p.id === product.id
                        ? {
                            ...p,
                            description: e.target.value
                          }
                        : p
                    )
                  );

                }}
              />

              <div className="grid md:grid-cols-3 gap-4">

                <input
                  className="so-input"
                  placeholder="Brand"
                  value={product.brand || ""}
                  onChange={(e) => {

                    setProducts(
                      products.map(p =>
                        p.id === product.id
                          ? {
                              ...p,
                              brand: e.target.value
                            }
                          : p
                      )
                    );

                  }}
                />

                <input
                  className="so-input"
                  placeholder="Price"
                  value={product.price || ""}
                  onChange={(e) => {

                    setProducts(
                      products.map(p =>
                        p.id === product.id
                          ? {
                              ...p,
                              price: e.target.value
                            }
                          : p
                      )
                    );

                  }}
                />

                <label
                  className="
                  flex
                  items-center
                  gap-3
                  px-4
                "
                >

                  <input
                    type="checkbox"
                    checked={product.is_visible ?? true}
                    onChange={(e) => {

                      setProducts(
                        products.map(p =>
                          p.id === product.id
                            ? {
                                ...p,
                                is_visible:
                                  e.target.checked
                              }
                            : p
                        )
                      );

                    }}
                  />

                  Visible

                </label>

              </div>

              <div className="flex gap-3">

                <button
                  className="button"
                  onClick={async () => {

                    await supabase
                      .from("spa_products")
                      .update({
                        name: product.name,
                        description:
                          product.description,
                        brand: product.brand,
                        price: product.price,
                        is_visible:
                          product.is_visible
                      })
                      .eq("id", product.id);

                    loadData();

                  }}
                >
                  Save
                </button>

                <button
                  className="button"
                  onClick={() =>
                    deleteProduct(product.id)
                  }
                >
                  Delete
                </button>

              </div>

            </div>

          </div>

        )}

      </div>

    ))}

  </div>

</div>



      <div>

        <Link
          href="/dashboard/spa/fnb"
          className="text-sm text-[var(--text-muted)]"
        >
          ← Back to Categories
        </Link>

      </div>

    </div>

  );

}