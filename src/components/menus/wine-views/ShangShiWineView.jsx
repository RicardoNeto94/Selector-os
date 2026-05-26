"use client";

import { useState } from "react";
import WineResultsView from "./ShangShiWineResultsView";

function getWine(item) {
  if (Array.isArray(item?.wines)) return item.wines[0] || {};
  return item?.wines || item || {};
}

function normalize(str){
  return String(str || "").trim();
}

export default function ShangShiWineView({
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
ADAPTIVE FILTER DATA
================================ */

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
)
===
String(
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
================================ */

if(showResults){

return(

<WineResultsView
menu={menu}
items={items}
filters={filters}

onBack={()=>{

setShowResults(false);

setTimeout(()=>{

setTransitioning(false);

},50);

}}
/>

);

}

return(

<div
className="
h-[100dvh]
overflow-hidden
flex
items-center
justify-center
px-8
touch-none
"
style={{
background:`
radial-gradient(
circle at top,
rgba(201,169,106,.06),
transparent 35%
),

linear-gradient(
180deg,
#003223 0%,
#001a12 100%
)
`
}}
>

<div
className={`
w-full
max-w-[680px]

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
mb-20
"
>

<img
src="/shangshi-logo.png"
className="
h-32
mx-auto
mb-10
opacity-95
"
/>

<div
className="
text-[#E3C588]
uppercase
tracking-[0.55em]
text-[10px]
mb-4
"
>
WINE SELECTION
</div>

<div
className="
w-12
h-[1px]
mx-auto
bg-[#E3C588]/20
mb-6
"
/>

<p
className="
text-[#E3C588]/60
text-[13px]
font-light
"
>
A journey through exceptional vineyards
</p>

<div
className="
mt-6
text-[#E3C588]/40
text-[10px]
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
gap-8
flex-wrap
mb-16
"
>

{["red","white","sparkling","rose"]
.map(type=>(

<button
key={type}
onClick={()=>
setFilters({
...filters,
wine_type:type
})
}
className={`
uppercase
tracking-[0.35em]
text-[11px]
transition-all

${
filters.wine_type===type
?
"text-[#E3C588]"
:
"text-[#E3C588]/35"
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
text-center
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
text-[#E3C588]/55
text-[10px]
uppercase
tracking-[0.45em]
"
>

Advanced Filters

</button>

</div>

{showAdvanced && (

<div
className="
grid
grid-cols-1
md:grid-cols-2
gap-x-10
gap-y-8
mb-16
"
>

<select
value={filters.country}
onChange={(e)=>
setFilters({
...filters,
country:e.target.value,
region:"",
vintage:"",
grapes:""
})
}
className="
bg-transparent
border-b
border-[#E3C588]/10
pb-3
text-[#E3C588]
text-[13px]
"
>
<option value="">Country</option>

{countries.map(c=>(

<option
key={c}
className="text-black"
>
{c}
</option>

))}
</select>


<select
value={filters.region}
onChange={(e)=>
setFilters({
...filters,
region:e.target.value,
vintage:"",
grapes:""
})
}
className="
bg-transparent
border-b
border-[#E3C588]/10
pb-3
text-[#E3C588]
text-[13px]
"
>
<option value="">
Region
</option>

{regions.map(c=>(

<option
key={c}
className="text-black"
>
{c}
</option>

))}
</select>


<select
value={filters.vintage}
onChange={(e)=>
setFilters({
...filters,
vintage:e.target.value,
grapes:""
})
}
className="
bg-transparent
border-b
border-[#E3C588]/10
pb-3
text-[#E3C588]
text-[13px]
"
>
<option value="">
Vintage
</option>

{vintages.map(c=>(

<option
key={c}
className="text-black"
>
{c}
</option>

))}
</select>


<select
value={filters.grapes}
onChange={(e)=>
setFilters({
...filters,
grapes:e.target.value
})
}
className="
bg-transparent
border-b
border-[#E3C588]/10
pb-3
text-[#E3C588]
text-[13px]
"
>
<option value="">
Grape
</option>

{grapes.map(c=>(

<option
key={c}
className="text-black"
>
{c}
</option>

))}
</select>


<select
value={filters.price}
onChange={(e)=>
setFilters({
...filters,
price:e.target.value
})
}
className="
bg-transparent
border-b
border-[#E3C588]/10
pb-3
text-[#E3C588]
text-[13px]
"
>
<option value="">
Price Range
</option>

<option value="0-50">€0–50</option>
<option value="50-100">€50–100</option>
<option value="100-150">€100–150</option>
<option value="150+">€150+</option>

</select>

</div>

)}

<div className="pt-6">

<button
onClick={()=>{

setTransitioning(true);

setTimeout(()=>{

setShowResults(true);

},300);

}}
className="
w-full
border-b
border-[#E3C588]/20
pb-4
text-[#E3C588]
uppercase
tracking-[0.55em]
text-[11px]
opacity-80
hover:opacity-100
transition-all
"
>

Show Selection

</button>

</div>

</div>

</div>

);

}