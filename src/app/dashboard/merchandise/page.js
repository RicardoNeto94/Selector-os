"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function MerchandisePage() {

  const supabase = createClientComponentClient();

  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadCategories() {

    setLoading(true);

    const { data } = await supabase
      .from("merchandise_categories")
      .select("*")
      .order("position");

    setCategories(data || []);

    setLoading(false);

  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function createCategory() {

    if (!newCategory.trim()) return;

    await supabase
      .from("merchandise_categories")
      .insert([
        {
          name: newCategory,
          position: categories.length + 1
        }
      ]);

    setNewCategory("");

    loadCategories();

  }

  async function deleteCategory(id) {

    const confirmed = window.confirm(
      "Delete category?"
    );

    if (!confirmed) return;

    await supabase
      .from("merchandise_categories")
      .delete()
      .eq("id", id);

    loadCategories();

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
          Bombay Collection
        </div>

        <h1 className="text-3xl font-light">
          Merchandise
        </h1>

        <p className="mt-2 text-[var(--text-muted)]">
          Manage Bombay Collection categories.
        </p>

      </div>

      <div className="panel p-6">

        <div className="flex gap-4">

          <input
            className="so-input flex-1"
            placeholder="New Category..."
            value={newCategory}
            onChange={(e) =>
              setNewCategory(e.target.value)
            }
          />

          <button
            className="button"
            onClick={createCategory}
          >
            Add Category
          </button>

        </div>

      </div>

      <div className="panel p-6">

        <div className="text-lg font-medium mb-5">
          Categories
        </div>

        {loading && (
          <div className="text-sm text-[var(--text-muted)]">
            Loading...
          </div>
        )}

        {!loading && categories.length === 0 && (
          <div className="text-sm text-[var(--text-muted)]">
            No categories yet.
          </div>
        )}

        <div className="space-y-3">

          {categories.map((category) => (

            <div
              key={category.id}
              className="
              border
              border-[var(--border)]
              rounded-2xl
              p-4
              flex
              items-center
              justify-between
            "
            >

              <div>

                <div className="font-medium">
                  {category.name}
                </div>

                <div
                  className="
                  text-xs
                  text-[var(--text-muted)]
                  mt-1
                "
                >
                  Merchandise Category
                </div>

              </div>

              <div className="flex gap-2">

                <Link
                  href={`/dashboard/merchandise/${category.id}`}
                  className="button"
                >
                  Products
                </Link>

                <button
                  className="button"
                  onClick={() =>
                    deleteCategory(category.id)
                  }
                >
                  Delete
                </button>

              </div>

            </div>

          ))}

        </div>

      </div>

    </div>

  );

}