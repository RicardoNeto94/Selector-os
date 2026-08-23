"use client";

import { useMemo, useState } from "react";
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
  items,
  sakePairings = []
}) {

  const [filters,setFilters] =
  useState({

    wine_type:"",
    country:"",
    region:"",
    vintage:"",
    grapes:"",
    price:"",
    service_type:""

  });

  const [showResults,setShowResults] =
    useState(false);

  const [showAdvanced,setShowAdvanced] =
    useState(false);

  const [transitioning,setTransitioning] =
    useState(false);

  const [experienceMode,setExperienceMode] =
    useState("wine");

  const guestItems =
  useMemo(() => {

    return (items || []).map(item => {

      const wine =
        getWine(item);

      return {

        ...item,

        service_type:
          item?.service_type ||
          "bottle",

        glass_price:
          item?.glass_price !== null &&
          item?.glass_price !== undefined
            ? Number(
                item.glass_price
              )
            : null,

        servings: Array.isArray(item?.servings)
          ? item.servings
          : [],

        price_override:
          item?.price_override !== null &&
          item?.price_override !== undefined
            ? Number(
                item.price_override
              )
            : null,

        wines: {

          ...wine,

          price:
            item?.price_override !== null &&
            item?.price_override !== undefined
              ? Number(
                  item.price_override
                )
              : wine.price

        }

      };

    });

  },[
    items
  ]);


const wines =
  guestItems.map(
    getWine
  );


const byTheGlassCount =
  guestItems.filter(item => {

    return (

      item.service_type ===
      "glass"

      ||

      item.service_type ===
      "both"

    );

  }).length;

  const publishedPairings =
    useMemo(() =>
      (sakePairings || []).filter(
        pairing => pairing?.status === "published"
      ),
      [sakePairings]
    );

  const hasSakePairing =
    publishedPairings.length > 0;

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
  guestItems.filter(item => {

    const w =
      getWine(item);

    if(!w){
      return false;
    }

    const matchesService =

      !filters.service_type

      ||

      (
        filters.service_type ===
        "glass"

        &&

        (
          item.service_type ===
          "glass"

          ||

          item.service_type ===
          "both"
        )
      );


    return (

      (
        !filters.wine_type

        ||

        normalize(
          w.wine_type
        )
        ===
        normalize(
          filters.wine_type
        )
      )

      &&

      (
        !filters.country

        ||

        normalize(
          w.country
        )
        ===
        normalize(
          filters.country
        )
      )

      &&

      (
        !filters.region

        ||

        normalize(
          w.region
        )
        ===
        normalize(
          filters.region
        )
      )

      &&

      (
        !filters.vintage

        ||

        String(
          w.vintage
        )
        ===
        String(
          filters.vintage
        )
      )

      &&

      matchesService

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

          max-w-[1180px]
          mx-auto

          px-5
          sm:px-7
          md:px-10
          lg:px-14

          pt-[max(env(safe-area-inset-top),32px)]
          md:pt-[max(env(safe-area-inset-top),56px)]

          pb-[max(env(safe-area-inset-bottom),64px)]

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
          max-w-[760px]
          mx-auto
          text-center
          mb-12
          md:mb-16
        "
        >

          <img
            src="/koyologo.png"
            className="
            h-14
            sm:h-16
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

        {hasSakePairing && (
          <div className="w-full max-w-[620px] mx-auto mb-12 md:mb-16">
            <div className="grid grid-cols-2 p-1 rounded-full border border-[#d7c6b5] bg-white/20 backdrop-blur-sm">
              <button
                onClick={() => setExperienceMode("wine")}
                className={`min-h-12 md:min-h-14 px-3 sm:px-5 rounded-full text-[8px] sm:text-[10px] uppercase tracking-[0.20em] sm:tracking-[0.30em] transition-all duration-300 ${experienceMode === "wine" ? "bg-[#e7dacc] text-[#4f4034] shadow-sm" : "text-[#8d7968]"}`}
              >
                Wine Selection
              </button>
              <button
                onClick={() => setExperienceMode("sake")}
                className={`min-h-12 md:min-h-14 px-3 sm:px-5 rounded-full text-[8px] sm:text-[10px] uppercase tracking-[0.20em] sm:tracking-[0.30em] transition-all duration-300 ${experienceMode === "sake" ? "bg-[#e7dacc] text-[#4f4034] shadow-sm" : "text-[#8d7968]"}`}
              >
                Sake Pairing
              </button>
            </div>
          </div>
        )}

        {experienceMode === "wine" && (
          <>

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

{/* BY THE GLASS */}

{byTheGlassCount > 0 && (

  <div
    className="
      flex
      justify-center
      mb-5
      sm:mb-8
    "
  >

    <button

      onClick={() => {

        setFilters({

          ...filters,

          service_type:
            filters.service_type ===
            "glass"
              ? ""
              : "glass"

        });

      }}

      className={`
        px-6
        h-9

        rounded-full

        border

        text-[9px]

        uppercase

        tracking-[0.28em]

        transition-all

        ${
          filters.service_type ===
          "glass"

            ?

          "border-[#9f8267] bg-[#e9ddd0] text-[#3f3026]"

            :

          "border-[#d8cabc] bg-[rgba(255,255,255,0.30)] text-[#7d6854]"
        }
      `}
    >

      By the Glass · {byTheGlassCount}

    </button>

  </div>

)}

        {/* ADVANCED */}

<div
  className="
  grid
  grid-cols-[1fr_auto_1fr]
  items-center

  gap-2
  sm:gap-5

  max-w-[620px]
  mx-auto
  mb-5
  sm:mb-8
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
    block
    w-[18px]
    sm:w-[40px]
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
        price:"",
        service_type:""

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
    grid-cols-1
sm:grid-cols-2
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

          </>
        )}

        {experienceMode === "sake" && hasSakePairing && (
          <section className="w-full max-w-[640px] mx-auto">
            {publishedPairings.map((pairing, pairingIndex) => (
              <article
                key={pairing.id}
                className={pairingIndex > 0 ? "mt-16 pt-12 border-t border-[#d8cabc]" : ""}
              >
                <header className="w-full max-w-[520px] mx-auto text-center">
                  <div className="text-[#9a8068] uppercase tracking-[0.34em] sm:tracking-[0.40em] text-[8px] sm:text-[9px]">
                    Koyo Sake Journey
                  </div>
                  <h2 className="mt-4 text-[#2f2923] font-light leading-none break-words">
                    <span className="block text-[10px] sm:text-[11px] uppercase tracking-[0.32em] text-[#806b59]">
                      Koyo Signature
                    </span>
                    <span className="block mt-3 text-[clamp(1.15rem,4.5vw,1.65rem)] tracking-[0.06em]">
                      Sake Pairing
                    </span>
                  </h2>
                  {pairing.description && (
                    <p className="max-w-[540px] mx-auto mt-6 text-[#766455] text-[11px] sm:text-[12px] font-light leading-[1.9]">
                      {pairing.description}
                    </p>
                  )}
                  <div className="mt-4 text-[#756252] text-[9px] sm:text-[10px] uppercase tracking-[0.20em]">
                    {(pairing.stages || []).length} pours
                    {pairing.price !== null && pairing.price !== undefined && (
                      <> · €{Number(pairing.price).toFixed(0)}</>
                    )}
                  </div>
                </header>

                <div className="w-px h-5 mx-auto my-5 bg-[#cdb9a6]" />

                <div className="w-full">
                  {(pairing.stages || []).map((stage,index) => {
                    const sake = stage?.wines || {};
                    const isLast = index === (pairing.stages || []).length - 1;

                    return (
                      <div
                        key={stage.id}
                        className="grid grid-cols-[36px_minmax(0,1fr)] sm:grid-cols-[46px_minmax(0,1fr)] md:grid-cols-[58px_minmax(0,1fr)] gap-3 sm:gap-5 md:gap-6"
                      >
                        <div className="relative flex justify-center">
                          {!isLast && (
                            <div className="absolute top-8 bottom-0 w-px bg-[#d6c6b6]" />
                          )}
                          <div className="relative z-10 w-8 h-8 shrink-0 rounded-full border border-[#c8b29d] bg-[#f5f1e8] flex items-center justify-center text-[#806852] text-[7px] tracking-[0.10em]">
                            {String(stage.stage_number || index + 1).padStart(2,"0")}
                          </div>
                        </div>

                        <div className={`min-w-0 pt-0.5 ${!isLast ? "pb-7 sm:pb-8 md:pb-9" : "pb-2"}`}>
                          {stage.stage_name && (
                            <div className="text-[#9a8068] uppercase tracking-[0.22em] sm:tracking-[0.24em] text-[7px] sm:text-[8px] leading-relaxed">
                              {stage.stage_name}
                            </div>
                          )}
                          <h3 className="mt-1.5 text-[#302923] text-[13px] sm:text-[14px] md:text-[15px] font-light leading-[1.3] break-words">
                            {sake.name || "Sake"}
                          </h3>
                          {sake.producer && (
                            <div className="mt-1 text-[#69594c] text-[8px] sm:text-[9px] tracking-[0.04em] break-words">
                              {sake.producer}
                            </div>
                          )}
                          {[sake.region,sake.country,sake.vintage].filter(Boolean).length > 0 && (
                            <div className="mt-2 text-[#9a8775] text-[7px] sm:text-[8px] uppercase tracking-[0.16em] leading-5 break-words">
                              {[sake.region,sake.country,sake.vintage].filter(Boolean).join(" · ")}
                            </div>
                          )}
                          {stage.description && (
                            <p className="max-w-[470px] mt-3 text-[#756456] text-[10px] sm:text-[11px] font-light leading-[1.7] break-words">
                              {stage.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </section>
        )}

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
