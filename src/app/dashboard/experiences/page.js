"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// DND
import {
  DndContext,
  closestCenter
} from "@dnd-kit/core";

import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

export default function ExperiencesPage() {

  const supabase = createClientComponentClient();

  const [experiences, setExperiences] = useState([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("dining");

  const [selectedExp, setSelectedExp] = useState(null);

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

  // ================= CREATE =================
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
    await supabase
      .from("experience_items")
      .insert([
        {
          section_id,
          name: "New Dish",
          description: "",
          position: 1
        }
      ]);

    loadExperiences();
  };

  // ================= SORTABLE ITEM =================
  function SortableItem({ item }) {

    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition
    } = useSortable({ id: item.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition
    };

    const price = item.experience_prices?.[0];

    return (
      <div
        ref={setNodeRef}
        style={{
          ...style,
          display: "grid",
          gridTemplateColumns: "40px 1fr 2fr 120px auto",
          gap: 10,
          marginBottom: 10,
          padding: "8px 0",
          borderBottom: "1px solid rgba(0,0,0,0.05)",
          alignItems: "center"
        }}
      >

        <div {...attributes} {...listeners} style={{ cursor: "grab", opacity: 0.5 }}>
          ☰
        </div>

        <input
          className="so-input"
          defaultValue={item.name}
          onBlur={async (e) => {
            await supabase
              .from("experience_items")
              .update({ name: e.target.value })
              .eq("id", item.id);
          }}
        />

        <textarea
          className="so-input"
          defaultValue={item.description || ""}
          onBlur={async (e) => {
            await supabase
              .from("experience_items")
              .update({ description: e.target.value })
              .eq("id", item.id);
          }}
        />

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
  }

  // ================= UI =================
  return (
    <div className="so-main-inner">

      <h1 className="so-page-title" style={{ marginBottom: 30 }}>
        Snacks Menu Room Service
      </h1>

      {/* CREATE */}
      <div className="so-card" style={{ marginBottom: 40 }}>
        <div className="so-card-content" style={{ display: "flex", gap: 10 }}>
          <input
            className="so-input"
            placeholder="New Item..."
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

      {/* CARDS */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: 20
      }}>
        {experiences.map(exp => (
          <div
            key={exp.id}
            className="so-card"
            style={{ padding: 20, cursor: "pointer" }}
            onClick={() => setSelectedExp(exp)}
          >
            <h2>{exp.name}</h2>
            <p style={{ opacity: 0.6 }}>{exp.type}</p>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {selectedExp && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999
        }}>

          <div style={{
            background: "#fff",
            width: "90%",
            maxWidth: 1000,
            maxHeight: "85vh",
            overflow: "auto",
            borderRadius: 16,
            padding: 30,
            position: "relative"
          }}>

            <button
              onClick={() => setSelectedExp(null)}
              style={{
                position: "absolute",
                top: 15,
                right: 20,
                fontSize: 20,
                border: "none",
                background: "none",
                cursor: "pointer"
              }}
            >
              ✕
            </button>

<div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20
  }}
>

  <h2>{selectedExp.name}</h2>
  <input
  className="so-input"
  placeholder="Image URL"
  defaultValue={selectedExp.image_url || ""}
  onBlur={async (e) => {

    await supabase
      .from("experiences")
      .update({
        image_url: e.target.value
      })
      .eq("id", selectedExp.id);

    loadExperiences();

  }}
/>

  <button
    style={{
      background: "#b91c1c",
      color: "#fff",
      border: "none",
      padding: "10px 16px",
      borderRadius: 8,
      cursor: "pointer"
    }}
    onClick={async () => {

      const confirmed = window.confirm(
        `Delete "${selectedExp.name}"?`
      );

      if (!confirmed) return;

      await supabase
        .from("experiences")
        .delete()
        .eq("id", selectedExp.id);

      setSelectedExp(null);

      loadExperiences();

    }}
  >
    Delete Experience
  </button>

</div>
            <button
              className="so-btn-secondary"
              onClick={() => addSection(selectedExp.id)}
              style={{ marginBottom: 20 }}
            >
              + Add Section
            </button>

            {experiences
              .find(e => e.id === selectedExp.id)
              ?.experience_sections?.map(section => {

                const items = section.experience_items || [];

                return (
                  <div key={section.id} style={{ marginBottom: 20 }}>

                    {/* 🔥 EDITABLE SECTION */}
                    <div style={{
                      display: "flex",
                      gap: 10,
                      marginBottom: 10,
                      alignItems: "center"
                    }}>

                      <input
                        className="so-input"
                        defaultValue={section.name}
                        onBlur={async (e) => {
                          await supabase
                            .from("experience_sections")
                            .update({ name: e.target.value })
                            .eq("id", section.id);

                          loadExperiences();
                        }}
                      />

                      <select
                        className="so-input"
                        defaultValue={section.type || "snacks"}
                        onChange={async (e) => {
                          await supabase
                            .from("experience_sections")
                            .update({ type: e.target.value })
                            .eq("id", section.id);

                          loadExperiences();
                        }}
                      >
                        <option value="snacks">Snacks</option>
                        <option value="drinks">Drinks</option>
                        <option value="amenities">Amenities</option>
                      </select>

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

                    <button onClick={() => addItem(section.id)}>
                      + Dish
                    </button>

                    <DndContext
                      collisionDetection={closestCenter}
                      onDragEnd={async (event) => {

                        const { active, over } = event;
                        if (!over || active.id === over.id) return;

                        const oldIndex = items.findIndex(i => i.id === active.id);
                        const newIndex = items.findIndex(i => i.id === over.id);

                        const newItems = arrayMove(items, oldIndex, newIndex);

                        setExperiences(prev =>
                          prev.map(e =>
                            e.id === selectedExp.id
                              ? {
                                  ...e,
                                  experience_sections: e.experience_sections.map(sec =>
                                    sec.id === section.id
                                      ? { ...sec, experience_items: newItems }
                                      : sec
                                  )
                                }
                              : e
                          )
                        );

                        for (let i = 0; i < newItems.length; i++) {
                          await supabase
                            .from("experience_items")
                            .update({ position: i + 1 })
                            .eq("id", newItems[i].id);
                        }

                      }}
                    >

                      <SortableContext
                        items={items.map(i => i.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {items
                          .sort((a, b) => a.position - b.position)
                          .map(item => (
                            <SortableItem key={item.id} item={item} />
                          ))}
                      </SortableContext>

                    </DndContext>

                  </div>
                );
              })}

          </div>
        </div>
      )}

    </div>
  );
}