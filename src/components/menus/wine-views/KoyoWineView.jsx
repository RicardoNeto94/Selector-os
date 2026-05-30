"use client";

import { useState } from "react";
import WineResultsView from "./KoyoWineResultsView";

function getWine(item) {

  if (
    Array.isArray(item?.wines)
  ) {
    return item.wines[0] || {};
  }

  return item?.wines || item || {};

}

function normalize(str){

  return String(
    str || ""
  ).trim();

}

export default function KoyoWineView({
  menu,
  items
}) {

  const [filters,setFilters] =
    useState({

      wine_type:"",
      country:"",
      region:"",
      vintage:"",
      grapes:"",
      price:""

    });

  const [showResults,setShowResults] =
    useState(false);

  const [showAdvanced,setShowAdvanced] =
    useState(false);

  const [transitioning,setTransitioning] =
    useState(false);

  const wines =
    items.map(getWine);

  /* ================================
     FILTERS
  ================================= */

  const countries =
  [
    ...new Set(
      wines
        .map(w=>normalize(w.country))
        .filter(Boolean)
    )
  ].sort();

  const filteredRegionsSource =
    wines.filter(w=>

      !filters.country ||

      normalize(
        w.country
      )===filters.country

    );

  const regions =
  [
    ...new Set(

      filteredRegionsSource
        .map(
          w=>normalize(
            w.region
          )
        )
        .filter(Boolean)

    )
  ].sort();

  const filteredVintageSource =
    filteredRegionsSource
      .filter(w=>

        !filters.region ||

        normalize(
          w.region
        )===filters.region

      );

  const vintages =
  [
    ...new Set(

      filteredVintageSource
        .map(
          w=>w.vintage
        )
        .filter(Boolean)

    )
  ].sort((a,b)=>b-a);

  const filteredGrapeSource =
    filteredVintageSource
      .filter(w=>

        !filters.vintage ||

        String(
          w.vintage
        )===String(
          filters.vintage
        )

      );

  const grapes =
  [
    ...new Set(

      filteredGrapeSource
        .map(
          w=>normalize(
            w.grapes
          )
        )
        .filter(Boolean)

    )
  ].sort();

  /* ================================
     RESULTS
  ================================= */

  const filteredItems =
    items.filter(item => {

      const w =
        getWine(item);

      if(!w){
        return false;
      }

      return (

        (!filters.wine_type ||

          normalize(w.wine_type)
          ===
          normalize(filters.wine_type)
        )

        &&

        (!filters.country ||

          normalize(w.country)
          ===
          normalize(filters.country)
        )

        &&

        (!filters.region ||

          normalize(w.region)
          ===
          normalize(filters.region)
        )

        &&

        (!filters.vintage ||

          String(w.vintage)
          ===
          String(filters.vintage)
        )

      );

    });


  return(

    <div
      className="
      fixed
      inset-0

      min-h-[100dvh]
      w-screen

      overflow-x-hidden
      overflow-y-auto

      bg-[#f5f1e8]
    "
      style={{
        background:`

          radial-gradient(
            circle at top,
            rgba(120,90,40,.05),
            transparent 40%
          ),

          linear-gradient(
            180deg,
            #f5f1e8 0%,
            #ece4d8 100%
          )

        `
      }}
    >

      {/* PAPER TEXTURE */}

      <div
        className="
        absolute
        inset-0

        pointer-events-none

        opacity-[0.05]

        mix-blend-multiply
      "
        style={{

          backgroundImage: `
            url('/textures/rice-paper.png')
          `

        }}
      />

      {/* JAPANESE BRANCH */}

      <div
        className="
        absolute

        top-0
        right-[-40px]

        w-[420px]
        h-[620px]

        pointer-events-none

        opacity-[0.12]
      "
        style={{

          backgroundImage:`
            url('/textures/japanese-branch.png')
          `,

          backgroundRepeat:"no-repeat",
          backgroundSize:"contain",
          backgroundPosition:"top right",

          mixBlendMode:"multiply"

        }}
      />
{/* JAPANESE STAMP */}

<div
  className="
  absolute

  bottom-[80px]
  left-[30px]

  w-[140px]
  h-[140px]

  pointer-events-none

  opacity-[0.05]
"
  style={{

    backgroundImage:`
      url('/textures/japanese-stamp.png')
    `,

    backgroundRepeat:"no-repeat",
    backgroundSize:"contain",
    backgroundPosition:"center",

    mixBlendMode:"multiply"

  }}
/>
      {/* ATMOSPHERIC INK */}

      <div
        className="
        absolute
        inset-0

        pointer-events-none

        opacity-[0.05]
      "
        style={{

          background:`

            radial-gradient(
              circle at 20% 10%,
              rgba(120,90,40,.12),
              transparent 35%
            ),

            radial-gradient(
              circle at 80% 90%,
              rgba(60,40,20,.08),
              transparent 40%
            )

          `

        }}
      />
{/* CALLIGRAPHY */}

<div
  className="
  absolute

  top-[140px]
  left-[20px]

  w-[120px]
  h-[70vh]

  pointer-events-none

  opacity-[0.04]
"
  style={{

    backgroundImage:`
      url('/textures/japanese-calligraphy.png')
    `,

    backgroundRepeat:"no-repeat",
    backgroundSize:"contain",
    backgroundPosition:"top left",

    mixBlendMode:"multiply"

  }}
/>
      {/* CONTENT */}

      <div
        className={`
          w-full

          relative
          z-10

          px-6
          md:px-10
          lg:px-14

pt-[9vh]
md:pt-[10vh]
          pb-20

          transition-all
          duration-300

          ${
            transitioning
            ?
            "opacity-0 blur-sm scale-[0.985]"
            :
            "opacity-100 scale-100"
          }
        `}
      >

        {/* HERO */}

        <div
          className="
          text-center
          mb-12
        "
        >

          <img
            src="/koyologo.png"
            className="
            h-16
            md:h-20

            mx-auto

            mb-8

            opacity-90
          "
          />

          <div
            className="
            text-[#7d6854]

            uppercase

            tracking-[0.45em]

            text-[9px]

            mb-4
          "
          >

            OMAKASE WINE SELECTION

          </div>

          <div
            className="
            w-16
            h-[1px]

            mx-auto

            bg-[#d4c4b2]

            mb-5
          "
          />

          <p
            className="
            text-[#857260]

            text-[13px]

            font-light
          "
          >

            Curated bottles for the omakase experience

          </p>

          <div
            className="
            mt-5

            text-[#a19080]

            text-[9px]

            tracking-[0.35em]

            uppercase
          "
          >

            {items.length} Wines Available

          </div>

        </div>

        {/* TYPES */}

        <div
          className="
          flex
          justify-center

          gap-6

          flex-wrap

          mb-12
        "
        >

          {[
            ...new Set(

              wines
                .map(w=>
                  normalize(
                    w.wine_type
                  )
                )
                .filter(Boolean)

            )

          ].map(type=>(

            <button
              key={type}

              onClick={()=>
                setFilters({
                  ...filters,
                  wine_type:
                    filters.wine_type===type
                    ? ""
                    : type
                })
              }

              className={`
                uppercase

                tracking-[0.22em]

                text-[9px]

                transition-all

                ${
                  filters.wine_type===type
                  ?
                  "text-[#1e1b16]"
                  :
                  "text-[#8e7b67]"
                }
              `}
            >

              {type}

            </button>

          ))}

        </div>

        {/* ADVANCED */}

<div
  className="
  flex
  items-center
  justify-center

  gap-5

  mb-8
"
>

  <button
    onClick={()=>
      setShowAdvanced(
        !showAdvanced
      )
    }
    className="
px-5
h-8

rounded-full

border
border-[#d8cabc]

bg-[rgba(255,255,255,0.35)]

backdrop-blur-sm

text-[#6f5c4d]

text-[9px]

uppercase

tracking-[0.28em]

transition-all

hover:bg-[#efe6db]
hover:border-[#cdb9a6]
"
  >

    Advanced Filters

  </button>

  <div
    className="
    w-[40px]
    h-[1px]

    bg-[#d7cabd]
  "
  />

  <button

    onClick={()=>{

      setFilters({

        wine_type:"",
        country:"",
        region:"",
        vintage:"",
        grapes:"",
        price:""

      });

    }}

    className="
px-5
h-8

rounded-full

border
border-[#d8cabc]

bg-[rgba(255,255,255,0.25)]

backdrop-blur-sm

text-[#8b7563]

text-[9px]

uppercase

tracking-[0.28em]

transition-all

hover:bg-[#efe6db]
hover:border-[#cdb9a6]
"
  >

    Reset Filters

  </button>

</div>
{showAdvanced && (

  <div
    className="
    grid
    grid-cols-2
md:grid-cols-4

    gap-x-10
    gap-y-8

    mb-14
  "
  >

    {[

      {
        key:"country",
        label:"Country",
        values:countries
      },

      {
        key:"region",
        label:"Region",
        values:regions
      },

      {
        key:"vintage",
        label:"Vintage",
        values:vintages
      },

      {
        key:"grapes",
        label:"Grape",
        values:grapes
      }

    ].map(field=>(

      <select
        key={field.key}
        value={filters[field.key]}
        onChange={(e)=>
          setFilters({
            ...filters,
            [field.key]:
              e.target.value
          })
        }
        className="
h-11

rounded-full

border
border-[#ddd0c2]

bg-[rgba(255,255,255,0.35)]

backdrop-blur-sm

px-5

text-[#6b5849]

text-[11px]

tracking-[0.05em]

transition-all

hover:bg-[rgba(255,255,255,0.55)]
focus:outline-none
focus:border-[#c9b39d]
"
      >

        <option value="">
          {field.label}
        </option>

        {field.values.map(v=>(

          <option
            key={v}
            className="text-black"
          >
            {v}
          </option>

        ))}

      </select>

    ))}

  </div>

)}

        {/* BUTTON */}

        <div className="pt-2">

          <button
            onClick={()=>{

              setTransitioning(true);

              setTimeout(()=>{

                setShowResults(true);

              },300);

            }}
            className="
w-full
max-w-[340px]

mx-auto

h-12

bg-[rgba(255,255,255,0.45)]

shadow-[0_10px_40px_rgba(120,90,40,0.06)]

hover:scale-[1.01]

rounded-full

border
border-[#d8cabc]

bg-[rgba(255,255,255,0.30)]

backdrop-blur-sm

text-[#5e4c3f]

uppercase

tracking-[0.38em]

text-[9px]

transition-all

hover:bg-[#efe6db]
hover:border-[#cdb9a6]

flex
items-center
justify-center
"
          >

            Explore Selection

          </button>

        </div>

      </div>

      {
        showResults && (

          <div
            className="
            fixed
            inset-0
            z-50

            bg-[#f5f1e8]

            overflow-y-auto
          "
          >

            <WineResultsView
              menu={menu}
items={filteredItems}
              filters={filters}

              onBack={()=>{

                setShowResults(false);

                setTimeout(()=>{

                  setTransitioning(false);

                },50);

              }}
            />

          </div>

        )
      }

    </div>

  );

}  