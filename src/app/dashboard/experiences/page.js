"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function ExperiencesPage() {

  const supabase = createClientComponentClient();

  const [experiences, setExperiences] = useState([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("dining");

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

  const handleCreate = async () => {
    if (!name) return;

    await supabase.from("experiences").insert([
      {
        name,
        type,
        position: experiences.length + 1
      }
    ]);

    setName("");
    loadExperiences();
  };

  const addSection = async (experience_id) => {
    await supabase.from("experience_sections").insert([
      {
        experience_id,
        name: "New Section",
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

    if (item) {
      await supabase.from("experience_prices").insert([
        { item_id: item.id, price: 10 }
      ]);
    }

    loadExperiences();
  };

  return (
    <div className="so-main-inner">

      {/* HEADER */}
      <div style={{ marginBottom: 30 }}>
        <h1 className="so-page-title">Experiences</h1>
      </div>

      {/* CREATE */}
      <div className="so-card" style={{ marginBottom: 30 }}>

        <div className="so-card-content" style={{ display: "flex", gap: 10 }}>

          <input
            className="so-input"
            placeholder="Name (Koyo, Shang Shi...)"
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
        <div key={exp.id} className="so-card" style={{ marginBottom: 20 }}>

          <div className="so-card-content">

            {/* EXPERIENCE TITLE */}
            <div style={{ marginBottom: 10, fontWeight: 600 }}>
              {exp.name}
            </div>

            {/* IMAGE */}
            <input
              type="file"
              onChange={() => {}}
              style={{ marginBottom: 10 }}
            />

            {/* ADD SECTION */}
            <button
              className="so-btn-secondary"
              onClick={() => addSection(exp.id)}
              style={{ marginBottom: 15 }}
            >
              + Add Section
            </button>

            {/* SECTIONS */}
            {exp.experience_sections?.map(section => (
              <div key={section.id} className="so-subcard">

                {/* SECTION HEADER */}
                <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>

                  <input
                    className="so-input"
                    defaultValue={section.name}
                    onBlur={async (e) => {

                      const newName = e.target.value;

                      setExperiences(prev =>
                        prev.map(exp => ({
                          ...exp,
                          experience_sections: (exp.experience_sections || []).map(sec =>
                            sec.id === section.id
                              ? { ...sec, name: newName }
                              : sec
                          )
                        }))
                      );

                      await supabase
                        .from("experience_sections")
                        .update({ name: newName })
                        .eq("id", section.id);

                    }}
                  />

                  <button
                    className="so-btn-secondary"
                    onClick={() => addItem(section.id)}
                  >
                    + Add Dish
                  </button>

                  <button
                    className="so-btn-danger"
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

                {/* ITEMS */}
                {section.experience_items?.map(item => {
                  const price = item.experience_prices?.[0];

                  return (
                    <div key={item.id} className="so-item-row">

                      <input
                        className="so-input"
                        defaultValue={item.name}
                        onBlur={async (e) => {

                          const newName = e.target.value;

                          setExperiences(prev =>
                            prev.map(exp => ({
                              ...exp,
                              experience_sections: exp.experience_sections?.map(sec => ({
                                ...sec,
                                experience_items: sec.experience_items?.map(it =>
                                  it.id === item.id ? { ...it, name: newName } : it
                                )
                              }))
                            }))
                          );

                          await supabase
                            .from("experience_items")
                            .update({ name: newName })
                            .eq("id", item.id);

                        }}
                      />

                      <textarea
                        className="so-input"
                        defaultValue={item.description || ""}
                        placeholder="Description"
                        onBlur={async (e) => {

                          const newDesc = e.target.value;

                          setExperiences(prev =>
                            prev.map(exp => ({
                              ...exp,
                              experience_sections: exp.experience_sections?.map(sec => ({
                                ...sec,
                                experience_items: sec.experience_items?.map(it =>
                                  it.id === item.id ? { ...it, description: newDesc } : it
                                )
                              }))
                            }))
                          );

                          await supabase
                            .from("experience_items")
                            .update({ description: newDesc })
                            .eq("id", item.id);

                        }}
                      />

                      <input
                        type="number"
                        className="so-input small"
                        defaultValue={price?.price || ""}
                        onBlur={async (e) => {

                          const newPrice = e.target.value;

                          if (price) {
                            await supabase
                              .from("experience_prices")
                              .update({ price: newPrice })
                              .eq("id", price.id);
                          } else {
                            await supabase
                              .from("experience_prices")
                              .insert([
                                { item_id: item.id, price: newPrice }
                              ]);
                          }

                        }}
                      />

                      <button
                        className="so-btn-danger"
                        onClick={async () => {

                          setExperiences(prev =>
                            prev.map(exp => ({
                              ...exp,
                              experience_sections: exp.experience_sections?.map(sec => ({
                                ...sec,
                                experience_items: sec.experience_items?.filter(it => it.id !== item.id)
                              }))
                            }))
                          );

                          await supabase
                            .from("experience_items")
                            .delete()
                            .eq("id", item.id);

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