"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import "../spa.css";

export default function BurmanSpaProductsPage() {

  const supabase = createClient();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    async function loadData() {

      const { data: categoriesData = [] } =
        await supabase
          .from("spa_categories")
          .select(`
            *,
            spa_products(*)
          `)
          .eq("type", "treatments")
          .order("position");

      setCategories(categoriesData);
      setLoading(false);

    }

    loadData();

  }, []);

  return (

    <main className="spa-page">

      <div className="px-8 lg:px-16 py-14">

        <div
          className="spa-container"
          style={{
            maxWidth: "950px",
            margin: "0 auto"
          }}
        >

          {/* BACK */}

          <div className="mb-12">

            <Link
              href="/spa/burman"
              className="spa-back"
            >
              ← Back
            </Link>

          </div>

          {/* HEADER */}

          <div className="spa-header">

            <Image
              src="/spa/spa-logo.png"
              alt="Burman Spa"
              width={200}
              height={150}
              style={{
                width: "200px",
                height: "auto"
              }}
              className="mx-auto mb-6"
            />

            <h1
              className="spa-title"
              style={{
                fontFamily: "Cormorant Garamond, serif",
                fontWeight: 300,
                color: "#7b6353"
              }}
            >
              Signature Treatment Collection
            </h1>

            <div className="spa-divider" />

            <p className="spa-subtitle">
              Discover our collection of massages, facials,
body rituals and wellness journeys crafted
for restoration and relaxation.
            </p>

          </div>
          <div
  className="
  flex
  justify-center
  items-center
  gap-12

  mt-14
  mb-20
  flex-wrap
"
>

  <div className="text-center">

    <Image
      src="/spa/leaf.svg"
      alt="Natural Ingredients"
      width="36"
      height="36"
      className="mx-auto mb-3"
    />

    <div
      className="
      text-[#4b3a2e]
      text-[14px]
      font-light
    "
    >
      Expert Therapists
    </div>

  </div>

  <div
    className="
    w-px
    h-12
    bg-[#e2d7ca]
  "
  />

  <div className="text-center">

    <Image
      src="/spa/drop.svg"
      alt="Skin Balance"
      width="36"
      height="36"
      className="mx-auto mb-3"
    />

    <div
      className="
      text-[#4b3a2e]
      text-[14px]
      font-light
    "
    >
      Personalised Rituals
    </div>

  </div>

  <div
    className="
    w-px
    h-12
    bg-[#e2d7ca]
  "
  />

  <div className="text-center">

    <Image
      src="/spa/lotus.svg"
      alt="Expert Care"
      width="36"
      height="36"
      className="mx-auto mb-3"
    />

    <div
      className="
      text-[#4b3a2e]
      text-[14px]
      font-light
    "
    >
      Holistic Wellbeing
    </div>

  </div>

</div>

          {/* LOADING */}

          {loading && (

            <div className="text-center text-[#786756]">
              Loading...
            </div>

          )}

          {/* CATEGORIES */}

          {!loading && categories.map((category) => {

            const visibleProducts =
              (category.spa_products || [])
                .filter(
                  p => p.is_visible !== false
                );

            if (visibleProducts.length === 0) {
              return null;
            }

            return (

              <section
                key={category.id}
                className="mb-16"
                style={{
                  fontFamily: "Cormorant Garamond, serif"
                }}
              >

                <div className="mb-8">

                  <div
                    className="
                    w-10
                    h-px
                    bg-[#d9cdbf]
                    mb-5
                  "
                  />

                  <div
                    className="
                    text-[#4b3a2e]
                    text-[32px]
                    font-light
                  "
                  >
                    {category.name}
                  </div>

                </div>

                <div>

                  {visibleProducts.map((product) => (

                    <div
                      key={product.id}
                      className="
                      py-5
                      border-b
                      border-[#e2d7ca]
                    "
                    >

                      <div
                        className="
                        flex
                        justify-between
                        gap-6
                        items-start
                      "
                      >

                        <div className="flex-1">

                          {product.brand && (

                            <div
                              className="
                              text-[#9b866f]
                              uppercase
                              tracking-[0.35em]
                              text-[10px]
                              mb-2
                            "
                            >
                              {product.brand}
                            </div>

                          )}
                          
                          <div
                            className="
                            text-[#4b3a2e]
                            text-[17px]
                            font-light
                            mb-2
                          "
                          >
                            {product.name}
                          </div>

                          {product.description && (

                            <div
                              className="
                              text-[#8b7764]
                              text-[13px]
                              leading-6
                              max-w-[650px]
                            "
                            >
                              {product.description}
                            </div>

                          )}

                        </div>

                       <div
  className="
  min-w-[220px]
  text-right
  space-y-4
"
>

  {product.duration_1 && product.price_1 && (

    <div
      className="
      flex
      justify-end
      gap-10
      text-[#8a3a2c]
    "
    >

      <div className="text-[16px] font-light">
        {product.duration_1}
      </div>

      <div
        className="
        text-[16px]
        font-light
        min-w-[80px]
      "
      >
        €{product.price_1}
      </div>

    </div>

  )}

  {product.duration_2 && product.price_2 && (

    <div
      className="
      flex
      justify-end
      gap-10
      text-[#8a3a2c]
    "
    >

      <div className="text-[16px] font-light">
        {product.duration_2}
      </div>

      <div
        className="
        text-[16px]
        font-light
        min-w-[80px]
      "
      >
        €{product.price_2}
      </div>

    </div>

  )}

</div>

                      </div>

                    </div>

                  ))}

                </div>

              </section>

            );

          })}

          {/* FOOTER */}

          <div
            className="
            flex
            items-center
            gap-6
            mt-20
          "
          >

            <div
              className="
              flex-1
              h-px
              bg-[#e2d7ca]
            "
            />

            <div
              className="
              text-[#b79a63]
              text-xl
            "
            >
              B
            </div>

            <div
              className="
              text-[#9b866f]
              uppercase
              tracking-[0.35em]
              text-[12px]
            "
            >
              BURMAN HOTEL · TALLINN
            </div>

            <div
              className="
              flex-1
              h-px
              bg-[#e2d7ca]
            "
            />

          </div>

        </div>

      </div>

    </main>

  );

}