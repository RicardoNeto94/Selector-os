import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function GuestWineMenu({ params }) {

  const { slug } = params;

  const supabase = createServerComponentClient({ cookies });

  const { data: menu } = await supabase
    .from("wine_menus")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!menu) {
    return <div style={{padding:40}}>Wine menu not found</div>;
  }

  const { data: wines } = await supabase
    .from("wine_menu_items")
    .select("*, wines(*)")
    .eq("wine_menu_id", menu.id)
    .order("position");

  return (
    <div style={{
      minHeight:"100vh",
      background:"#0f1115",
      color:"white",
      padding:"40px",
      fontFamily:"Inter"
    }}>

      <h1 style={{fontSize:34,marginBottom:40}}>
        {menu.name}
      </h1>

      <div style={{display:"grid",gap:14}}>

        {wines?.map((item)=>{

          const wine = item.wines;

          return (
            <div key={item.id}
              style={{
                background:"#15181d",
                padding:16,
                borderRadius:10,
                border:"1px solid #23262d"
              }}
            >

              <div style={{fontWeight:600}}>
                {wine.name}
              </div>

              <div style={{fontSize:13,opacity:.7}}>
                {wine.producer}
                {wine.region ? ` • ${wine.region}` : ""}
                {wine.country ? ` • ${wine.country}` : ""}
              </div>

              <div style={{marginTop:4,fontSize:13}}>
                {wine.vintage ? `${wine.vintage} • ` : ""}
                {wine.grapes}
              </div>

            </div>
          );

        })}

      </div>

    </div>
  );
}