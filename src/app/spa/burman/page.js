"use client";
import { useEffect } from "react";

export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";

export default function BurmanSpaPage() {

  useEffect(() => {

  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";

  return () => {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  };

}, []);

  return (

    <main
  className="
h-screen
overflow-hidden
bg-[#f5f1e8]
overscroll-none
"
>

      <div
        className="
h-screen
overflow-hidden
overscroll-none
grid
md:grid-cols-[30%_70%]
"
      >

        {/* IMAGE */}

        <div
          className="
          relative
          hidden
          md:block
        "
        >
<div
  className="absolute inset-0"
  style={{
    background: `
      linear-gradient(
        to right,
        rgba(51,39,31,0.12),
        rgba(51,39,31,0.03)
      )
    `
  }}
/>
          <Image
  src="/spa/spa-hero.jpg"
  alt="Burman Spa wellness lounge"
  fill
  priority
  unoptimized
  className="object-cover"
/>

        </div>

        {/* CONTENT */}

        <div
          className="
          flex
          items-center
          justify-center

          px-10
          lg:px-16

          py-6
xl:py-12
        "
        >

          <div
            className="
            w-full
            max-w-[820px]
          "
          >

            {/* LOGO */}

            <div className="text-center mb-6">

              <Image
                src="/spa/spa-logo.png"
                alt="Burman Spa"
                width={200}
                height={200}
                className="mx-auto mb-6"
              />

              <div
                className="
                text-[#9b866f]
                uppercase
                tracking-[0.35em]
                text-[15px]
              "
              >
              </div>

            </div>

            {/* TITLE */}

            <div className="text-center">

              <h1
  className="
  text-[#b79a63]
  text-[28px]
  md:text-[34px]
  xl:text-[42px]
  tracking-[0.04em]
  mb-3
"
  style={{
    fontFamily: "Cormorant Garamond, serif",
    fontWeight: 300
  }}
>
  Wellness Collection
</h1>

              <div
                className="
                w-20
                h-px
                bg-[#d9cdbf]
                mx-auto
                mb-3
              "
              />

              <p
                className="
                max-w-[620px]
                mx-auto

                text-[#8b7764]

                uppercase

                tracking-[0.10em]

                leading-6

                text-[10px]

                mb-8
              "
              >
                Discover our curated wellness products
                and spa food & beverage selection
                designed to complement your experience.
              </p>

            </div>

            {/* CARDS */}

<div
  className="
  grid
  md:grid-cols-3
  gap-4
  mb-8
"
>

{/* TREATMENTS */}

  <Link
    href="/spa/burman/treatments"
    className="
    group

bg-[rgba(255,255,255,0.55)]

border
border-[#e4d8cb]

rounded-[20px]

p-5

min-h-[170px]

flex
flex-col
items-center
justify-center

text-center

transition-all
duration-300

hover:bg-white/80

"

>

<div
  className="
  text-[#c3a463]
  text-3xl
  mb-8
"
>
  ✦
</div>

<h2
  className="
  text-[#33271f]
  text-[20px]
  font-light
  mb-6
"
>
  Treatments
</h2>

<div
  className="
  w-12
  h-px
  bg-[#d9cdbf]
  mb-3
"
/>

<p
  className="
  text-[#7c6958]
  leading-6
"
>
  Massages, facials,
  body rituals and
  wellness journeys.
</p>

<div
  className="
  mt-4
  text-[#c3a463]
  text-3xl
"
>
  →
</div>

  </Link>

{/* SELF CARE */}

  <Link
    href="/spa/burman/products"
    className="
    group


bg-[rgba(255,255,255,0.55)]

border
border-[#e4d8cb]

rounded-[20px]

p-5

min-h-[170px]

flex
flex-col
items-center
justify-center

text-center

transition-all
duration-300

hover:bg-white/80

"

>

<div
  className="
  text-[#c3a463]
  text-3xl
  mb-8
"
>
  ❦
</div>

<h2
  className="
  text-[#33271f]
  text-[20px]
  font-light
  mb-6
"
>
  Self Care
</h2>

<div
  className="
  w-12
  h-px
  bg-[#d9cdbf]
  mb-3
"
/>

<p
  className="
  text-[#7c6958]
  leading-6
"
>
  Explore skincare,
  body care, oils,
  rituals and wellness
  products.
</p>

<div
  className="
  mt-4
  text-[#c3a463]
  text-3xl
"
>
  →
</div>

  </Link>

{/* FOOD & BEVERAGE */}

  <Link
    href="/spa/burman/fnb"
    className="
    group

bg-[rgba(255,255,255,0.55)]

border
border-[#e4d8cb]

rounded-[20px]

p-5

min-h-[170px]

flex
flex-col
items-center
justify-center

text-center

transition-all
duration-300

hover:bg-white/80

"

>

<div
  className="
  text-[#c3a463]
  text-3xl
  mb-8
"
>
  ◇
</div>

<h2
  className="
  text-[#33271f]
  text-[20px]
  font-light
  mb-6
"
>
  Food & Beverage
</h2>

<div
  className="
  w-12
  h-px
  bg-[#d9cdbf]
  mb-3
"
/>

<p
  className="
  text-[#7c6958]
  leading-6
"
>
  Fresh juices,
  smoothies, teas,
  healthy snacks and
  beverages.
</p>

<div
  className="
  mt-4
  text-[#c3a463]
  text-3xl
"
>
  →
</div>

  </Link>

</div>


          </div>

        </div>

      </div>

    </main>

  );

}