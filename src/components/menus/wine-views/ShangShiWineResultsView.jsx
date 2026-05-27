"use client";

import { useMemo,useState,useEffect } from "react";

const ITEMS_PER_PAGE = 12;

function getWine(item){

  if(!item){
    return null;
  }

  const wine =
    item.wines ||
    item.wine ||
    null;

  if(!wine){
    return null;
  }

  return {

    id:
      wine.id || "",

    name:
      wine.name || "Unknown Wine",

    producer:
      wine.producer || "",

    country:
      wine.country || "",

    region:
      wine.region || "",

    subregion:
      wine.subregion || "",

    wine_type:
      wine.wine_type || "Collection",

    vintage:
      wine.vintage || "NV",

    price:
      wine.price ?? 0,

    description:
      wine.description || ""

  };

}

function matches(value,filter){

  if(!filter){
    return true;
  }

  return (
    String(value || "")
      .trim()
      .toLowerCase()

    ===

    String(filter || "")
      .trim()
      .toLowerCase()
  );

}

export default function ShangShiWineResultsView({
menu,
items,
filters={},
onBack
}){

const [currentPage,setCurrentPage] =
useState(1);

const [expandedWine,setExpandedWine] =
useState(null);

const [localFilters,setLocalFilters] =
useState({

wine_type:"",
country:"",
region:"",
vintage:"",
name:"",
...(filters || {})

});

useEffect(()=>{

setCurrentPage(1);

},[localFilters]);


/* =====================================
FILTER
===================================== */

const filtered =
useMemo(()=>{

return items.filter(item=>{

const w =
getWine(item);

if(!w){
return false;
}

return(

matches(
w.wine_type,
localFilters.wine_type
)

&&

matches(
w.country,
localFilters.country
)

&&

matches(
w.region,
localFilters.region
)

&&

matches(
w.vintage,
localFilters.vintage
)

&&

matches(
w.name,
localFilters.name
)

);

});

},[
items,
localFilters
]);


/* =====================================
CATEGORIES
===================================== */

const categories =
[
...new Set(

items.map(item=>{

const w =
getWine(item);

if(!w){
return null;
}

return (
w.wine_type ||
"Collection"
);

})

)

].filter(Boolean);


/* =====================================
SORT
===================================== */

const sortedItems =
[...filtered]
.sort((a,b)=>{

const wa =
getWine(a);

const wb =
getWine(b);

return (

Number(
wa?.price||0
)

-

Number(
wb?.price||0
)

);

});


/* =====================================
PAGINATION
===================================== */

const totalPages =
Math.ceil(
sortedItems.length
/
ITEMS_PER_PAGE
);

const paginatedItems =
sortedItems.slice(

(currentPage-1)
*
ITEMS_PER_PAGE,

currentPage
*
ITEMS_PER_PAGE

);


/* =====================================
RENDER
===================================== */

return(

<div
className="
h-[100dvh]
overflow-y-auto
px-6
md:px-10
pb-24
pt-10
"
style={{
background:`

radial-gradient(
circle at top,
rgba(
201,
169,
106,
.05
),
transparent 35%
),

linear-gradient(
180deg,
#003223 0%,
#001a12 100%
)

`,

WebkitOverflowScrolling:"touch",
overscrollBehavior:"contain",
touchAction:"pan-y"

}}
>

<div
className="
max-w-[850px]
mx-auto
"
>

{/* HEADER */}

<div
className="
text-center
mb-14
"
>

<img
src="/shangshi-logo.png"
className="
h-20
mx-auto
mb-6
"
/>

<div
className="
text-[#C9A96A]
uppercase
tracking-[0.5em]
text-[9px]
mb-3
"
>

CURATED WINE COLLECTION

</div>

<div
className="
text-[#C9A96A]/50
text-[12px]
"
>

{filtered.length}
{" wines available"}

</div>

</div>


{/* STICKY NAV */}

<div
className="
sticky
top-4
z-50
mb-16
"
>

<div
className="
backdrop-blur-3xl

bg-black/10

border
border-[#C9A96A]/10

rounded-full

px-8
py-4

flex
justify-between
items-center
"
>

<button
onClick={onBack}
className="
text-[#C9A96A]/70
uppercase
tracking-[0.3em]
text-[10px]
"
>

← Back

</button>


<div
className="
flex
gap-6
flex-wrap
justify-center
"
>

{categories.map(cat=>(

<button
key={cat}

onClick={()=>{

setCurrentPage(1);

setExpandedWine(null);

setLocalFilters({

...localFilters,

wine_type:
localFilters.wine_type===cat
? ""
: cat

});

}}

className={`

uppercase
tracking-[0.3em]
text-[9px]
transition-all

${

localFilters.wine_type===cat

?

"text-[#E3C588]"

:

"text-[#C9A96A]/50"

}

`}
>

{cat}

</button>

))}

</div>


<div
className="
text-[#C9A96A]/40
text-[10px]
"
>

{currentPage}
/
{totalPages}

</div>

</div>

</div>


{/* WINES */}

<div
className="
space-y-6
"
>

{paginatedItems.map(item=>{

const w =
getWine(item);

if(!w){
return null;
}

const expanded =
expandedWine===item.id;

return(

<div
key={item.id}
className="
border-b
border-[#C9A96A]/10
pb-6
cursor-pointer
"

onClick={()=>{

setExpandedWine(
expanded
? null
: item.id
);

}}
>

<div
className="
flex
justify-between
gap-8
"
>

<div>

<div
className="
text-[#C9A96A]/35
uppercase
tracking-[0.25em]
text-[9px]
mb-2
"
>

{w.producer}

</div>

<div
className="
text-white
text-[18px]
font-light
leading-tight
"
>

{w.name}

</div>

<div
className="
mt-2
text-[#C9A96A]/55
text-[12px]
"
>

{w.country}
{" · "}
{w.vintage || "NV"}

</div>

</div>

<div
className="
text-[#C9A96A]
text-[18px]
whitespace-nowrap
"
>

€{w.price}

</div>

</div>

{expanded && (

<div
className="
mt-5
pt-5
text-[#C9A96A]/45
text-[12px]
leading-relaxed
"
>

{w.description ||
"Selected for Shang Shi collection."}

</div>

)}

</div>

);

})}

</div>


{/* PAGINATION */}

<div
className="
flex
justify-center
gap-6
mt-16
"
>

<button
disabled={currentPage===1}
onClick={()=>
setCurrentPage(p=>p-1)
}
className="
text-[#C9A96A]/50
"
>

←

</button>

{
Array.from({

length:Math.min(
5,
totalPages
)

})

.map((_,i)=>{

const startPage =

Math.max(
1,
currentPage - 2
);

const page =

startPage + i;

if(
page > totalPages
) return null;

return(

<button
key={page}

onClick={()=>
setCurrentPage(page)
}

className={

currentPage===page

?

"text-[#C9A96A]"

:

"text-[#C9A96A]/30"

}
>

{page}

</button>

);

})
}

<button
disabled={
currentPage===totalPages
}
onClick={()=>
setCurrentPage(
p=>p+1
)
}
className="
text-[#C9A96A]/50
"
>

→

</button>

</div>

</div>

</div>

);

}