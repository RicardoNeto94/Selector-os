"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function ExperiencesPage() {

  const supabase = createClientComponentClient();

  const [experiences, setExperiences] = useState([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("dining");

  // ================= LOAD =================
  const loadExperiences = async () => {
    const { data } = await supabase
      .from("experiences")
      .select(`
        *,
        experience_sections (
          *,
          experience_items (
            *,
            experience_prices (*)
          )
        )
      `)
      .order("position");

    setExperiences(data || []);
  };

  useEffect(() => {
    loadExperiences();
  }, []);

  // ================= ACTIONS =================
  const handleCreate = async () => {
    if (!name) return;

    await supabase.from("experiences").insert([
      { name, type, position: experiences.length + 1 }
    ]);

    setName("");
    loadExperiences();
  };

  const addSection = async (experience_id) => {
    await supabase.from("experience_sections").insert([
      {
        experience_id,
        name: "New Section",
        type: "snacks",
        position: 1
      }
    ]);

    loadExperiences();
  };

  const addItem = async (section_id) => {
    const { data: item } = await supabase
      .from("experience_items")
      .insert([
        {
          section_id,
          name: "New Dish",
          description: "",
          position: 1
        }
      ])
      .select()
      .single();

    loadExperiences();
  };

  // ================= UI =================
  return (
    <div className="so-main-inner">

      {/* HEADER */}
      <div style={{ marginBottom: 30 }}>
        <h1 className="so-page-title">Experiences</h1>
      </div>

      {/* CREATE */}
      <div className="so-card" style={{ marginBottom: 40 }}>
        <div className="so-card-content" style={{ display: "flex", gap: 10 }}>

          <input
            className="so-input"
            placeholder="New experience..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <select
            className="so-input"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="dining">Dining</option>
            <option value="spa">Spa</option>
            <option value="room_service">Room Service</option>
          </select>

          <button className="so-btn" onClick={handleCreate}>
            Add
          </button>

        </div>
      </div>

      {/* EXPERIENCES */}
      {experiences.map(exp => (
        <div key={exp.id} className="so-card" style={{ marginBottom: 30 }}>

          <div className="so-card-content">

            {/* HEADER BLOCK */}
            <div style={{
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 20
}}>
  <h2 style={{ fontWeight: 600 }}>{exp.name}</h2>

  <button
    className="so-btn-danger"
    onClick={async () => {
      await supabase
        .from("experiences")
        .delete()
        .eq("id", exp.id);

      loadExperiences();
    }}
  >
    Delete Experience
  </button>
</div>

            {/* META */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginBottom: 20
            }}>
              <textarea
                className="so-input"
                placeholder="Schedule"
                defaultValue={exp.schedule || ""}
                onBlur={async (e) => {
                  const val = e.target.value;

                  setExperiences(prev =>
                    prev.map(x => x.id === exp.id ? { ...x, schedule: val } : x)
                  );

                  await supabase
                    .from("experiences")
                    .update({ schedule: val })
                    .eq("id", exp.id);
                }}
              />

              <textarea
                className="so-input"
                placeholder="Footer"
                defaultValue={exp.footer || ""}
                onBlur={async (e) => {
                  const val = e.target.value;

                  setExperiences(prev =>
                    prev.map(x => x.id === exp.id ? { ...x, footer: val } : x)
                  );

                  await supabase
                    .from("experiences")
                    .update({ footer: val })
                    .eq("id", exp.id);
                }}
              />
            </div>

            {/* ADD SECTION */}
            <button
              className="so-btn-secondary"
              onClick={() => addSection(exp.id)}
              style={{ marginBottom: 20 }}
            >
              + Add Section
            </button>

            {/* SECTIONS */}
            {exp.experience_sections?.map(section => (
              <div key={section.id} style={{
                borderTop: "1px solid #eee",
                paddingTop: 20,
                marginBottom: 20
              }}>

                {/* SECTION HEADER */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12
                }}>

                  <div style={{ display: "flex", gap: 10 }}>

                    <input
                      className="so-input"
                      defaultValue={section.name}
                      style={{ fontWeight: 500 }}
                      onBlur={async (e) => {
                        const val = e.target.value;

                        setExperiences(prev =>
                          prev.map(exp => ({
                            ...exp,
                            experience_sections: exp.experience_sections.map(sec =>
                              sec.id === section.id ? { ...sec, name: val } : sec
                            )
                          }))
                        );

                        await supabase
                          .from("experience_sections")
                          .update({ name: val })
                          .eq("id", section.id);
                      }}
                    />

                    <select
                      className="so-input"
                      defaultValue={section.type || "snacks"}
                      onChange={async (e) => {
                        const val = e.target.value;

                        setExperiences(prev =>
                          prev.map(exp => ({
                            ...exp,
                            experience_sections: exp.experience_sections.map(sec =>
                              sec.id === section.id ? { ...sec, type: val } : sec
                            )
                          }))
                        );

                        await supabase
                          .from("experience_sections")
                          .update({ type: val })
                          .eq("id", section.id);
                      }}
                    >
                      <option value="snacks">Snacks</option>
                      <option value="drinks">drinks</option>
                      <option value="amenities">Amenities</option>
                    </select>

                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => addItem(section.id)}>+ Dish</button>
                    <button
                      onClick={async () => {
                        await supabase
                          .from("experience_sections")
                          .delete()
                          .eq("id", section.id);
                        loadExperiences();
                      }}
                    >
                      Delete
                    </button>
                  </div>

                </div>

                {/* ITEMS */}
                {section.experience_items?.map(item => {
                  const price = item.experience_prices?.[0];

                  return (
                    <div key={item.id} style={{
  display: "grid",
  gridTemplateColumns: "60px 1fr 2fr 120px auto",
  gap: 10,
  marginBottom: 10,
  padding: "8px 0",
  borderBottom: "1px solid rgba(0,0,0,0.05)"
}}>

  {/* POSITION */}
  <input
    type="number"
    className="so-input"
placeholder="Order"
defaultValue={item.position || ""}
style={{ textAlign: "center", width: 60 }}    
onBlur={async (e) => {
  const val = parseInt(e.target.value);

  if (!val) return;

  await supabase
    .from("experience_items")
    .update({ position: val })
    .eq("id", item.id);

  loadExperiences();
}}
  />

  {/* NAME */}
  <input
    className="so-input"
    defaultValue={item.name}
    onBlur={async (e) => {
      const val = e.target.value;

      await supabase
        .from("experience_items")
        .update({ name: val })
        .eq("id", item.id);
    }}
  />

  {/* DESCRIPTION */}
  <textarea
    className="so-input"
    defaultValue={item.description || ""}
    onBlur={async (e) => {
      const val = e.target.value;

      await supabase
        .from("experience_items")
        .update({ description: val })
        .eq("id", item.id);
    }}
  />

  {/* PRICE */}
  <input
    type="number"
    className="so-input"
    defaultValue={price?.price || ""}
    onBlur={async (e) => {
      const val = e.target.value;

      if (price) {
        await supabase
          .from("experience_prices")
          .update({ price: val })
          .eq("id", price.id);
      } else {
        await supabase
          .from("experience_prices")
          .insert([{ item_id: item.id, price: val }]);
      }
    }}
  />

  {/* DELETE */}
  <button
    onClick={async () => {
      await supabase
        .from("experience_items")
        .delete()
        .eq("id", item.id);

      loadExperiences();
    }}
  >
    Delete
  </button>

</div>
                  );
                })}

              </div>
            ))}

          </div>

        </div>
      ))}

    </div>
  );
}