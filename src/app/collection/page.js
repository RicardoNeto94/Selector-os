"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function CollectionPage() {

  const supabase = createClientComponentClient();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    async function loadData() {

      const { data = [] } =
        await supabase
          .from("merchandise_categories")
          .select(`
            *,
            merchandise_products(*)
          `)
          .order("position");

      setCategories(data);
      setLoading(false);

    }

    loadData();

  }, []);

  return (

    <main
      style={{
        background:"#f5f1e8",
        minHeight:"100vh",
        padding:"60px 40px"
      }}
    >

      <div
        style={{
          maxWidth:"1200px",
          margin:"0 auto"
        }}
      >

        <Link
          href="/"
          style={{
            color:"#9b866f",
            textDecoration:"none",
            letterSpacing:"0.15em",
            textTransform:"uppercase",
            fontSize:"12px"
          }}
        >
          ← Back
        </Link>

        <div
          style={{
            textAlign:"center",
            marginTop:"40px",
            marginBottom:"80px"
          }}
        >

          <div
            style={{
              letterSpacing:"0.35em",
              textTransform:"uppercase",
              color:"#9b866f",
              fontSize:"11px",
              marginBottom:"20px"
            }}
          >
            The Burman
          </div>

          <h1
            style={{
              fontSize:"64px",
              fontWeight:"300",
              color:"#4b3a2e",
              fontFamily:"Cormorant Garamond, serif"
            }}
          >
            Collection
          </h1>

          <p
            style={{
              maxWidth:"700px",
              margin:"20px auto 0",
              color:"#7d6b5c",
              lineHeight:"2"
            }}
          >
            A curated selection of travel essentials,
            lifestyle accessories and signature pieces
            inspired by The Burman experience.
          </p>

        </div>

        {loading && (

          <div
            style={{
              textAlign:"center"
            }}
          >
            Loading...
          </div>

        )}

        {!loading && categories.map(category => {

          const products =
            (category.merchandise_products || [])
              .filter(
                p => p.is_visible !== false
              );

          if (!products.length) return null;

          return (

            <section
              key={category.id}
              style={{
                marginBottom:"80px"
              }}
            >

              <h2
                style={{
                  fontSize:"36px",
                  fontWeight:"300",
                  color:"#4b3a2e",
                  marginBottom:"30px",
                  fontFamily:"Cormorant Garamond, serif"
                }}
              >
                {category.name}
              </h2>

              <div
                style={{
                  display:"grid",
                  gridTemplateColumns:
                    "repeat(auto-fill,minmax(280px,1fr))",
                  gap:"24px"
                }}
              >

                {products.map(product => (

                  <div
                    key={product.id}
                    style={{
                      background:"white",
                      borderRadius:"24px",
                      overflow:"hidden",
                      border:"1px solid #e7ddd2"
                    }}
                  >

                    <div
  style={{
    height:"260px",
    background:"#ece5dc",
    overflow:"hidden"
  }}
>
  <img
  src={product.image_url}
  alt={product.name}
  style={{
    width:"100%",
    height:"100%",
    objectFit:"cover",
    transition:"transform .8s ease"
  }}
/>
</div>

                    <div
                      style={{
                        padding:"24px"
                      }}
                    >

                      <div
                        style={{
                          fontSize:"12px",
                          letterSpacing:"0.2em",
                          textTransform:"uppercase",
                          color:"#9b866f",
                          marginBottom:"10px"
                        }}
                      >
                        {product.brand || "Bombay"}
                      </div>

                      <div
                        style={{
                          fontSize:"22px",
                          color:"#4b3a2e",
                          marginBottom:"10px",
                          fontFamily:"Cormorant Garamond, serif"
                        }}
                      >
                        {product.name}
                      </div>

                      {product.description && (

                        <div
                          style={{
                            color:"#7d6b5c",
                            lineHeight:"1.8",
                            marginBottom:"20px"
                          }}
                        >
                          {product.description}
                        </div>

                      )}

                      <div
                        style={{
                          color:"#b79a63",
                          fontSize:"22px",
                          fontWeight:"300"
                        }}
                      >
                        €{product.price || 0}
                      </div>

                    </div>

                  </div>

                ))}

              </div>

            </section>

          );

        })}

      </div>

    </main>

  );

}