"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import {
  ArrowsUpDownIcon,
  ArrowPathIcon,
  Bars3Icon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const EXPERIENCE_TYPES = [
  { value: "dining", label: "Dining" },
  { value: "spa", label: "Spa" },
  { value: "room_service", label: "Room Service" },
];

const SECTION_TYPES = [
  { value: "snacks", label: "Snacks" },
  { value: "drinks", label: "Drinks" },
  { value: "amenities", label: "Amenities" },
];

function typeLabel(value) {
  return (
    EXPERIENCE_TYPES.find((item) => item.value === value)?.label ||
    value ||
    "Experience"
  );
}

function sectionTypeLabel(value) {
  return (
    SECTION_TYPES.find((item) => item.value === value)?.label ||
    value ||
    "Section"
  );
}

function formatPrice(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return Number(value).toFixed(2);
}

function ActionButton({
  children,
  variant = "secondary",
  disabled = false,
  onClick,
  type = "button",
  className = "",
}) {
  const variantClass =
    variant === "primary"
      ? "border-[#963b2c] bg-[#963b2c] text-white hover:bg-[#7f3025]"
      : variant === "danger"
        ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
        : "border-[#e7ddd5] bg-white text-[#594941] hover:bg-[#faf7f4]";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2 rounded-xl border
        px-3.5 py-2.5 text-[11px] font-medium transition
        focus:outline-none focus:ring-2 focus:ring-[#963b2c]/20
        disabled:cursor-not-allowed disabled:opacity-45
        ${variantClass}
        ${className}
      `}
    >
      {children}
    </button>
  );
}

function EmptyState({ title, detail, action }) {
  return (
    <div className="rounded-[22px] border border-dashed border-[#ddd0c6] bg-[#fcfaf8] px-6 py-12 text-center">
      <SparklesIcon className="mx-auto h-7 w-7 text-[#b3a49b]" />

      <div className="mt-4 text-sm font-medium text-[#3d2d27]">
        {title}
      </div>

      <div className="mx-auto mt-2 max-w-md text-xs leading-5 text-[#8b7d75]">
        {detail}
      </div>

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export default function ExperiencesPage() {
  const supabase = createClient();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    })
  );

  const [experiences, setExperiences] = useState([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("dining");
  const [selectedExp, setSelectedExp] = useState(null);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState(null);

  const showNotice = (message, tone = "success") => {
    setNotice({ message, tone });

    window.setTimeout(() => {
      setNotice(null);
    }, 3200);
  };

  const loadExperiences = async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }

    const { data, error } = await supabase
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

    if (error) {
      console.error("EXPERIENCES LOAD ERROR:", error);
      showNotice("Experiences could not be loaded.", "error");
    } else {
      setExperiences(data || []);

      if (selectedExp) {
        const refreshedSelection = (data || []).find(
          (experience) => experience.id === selectedExp.id
        );

        setSelectedExp(refreshedSelection || null);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    loadExperiences();
  }, []);

  const currentExperience = useMemo(() => {
    if (!selectedExp) {
      return null;
    }

    return (
      experiences.find(
        (experience) => experience.id === selectedExp.id
      ) || selectedExp
    );
  }, [experiences, selectedExp]);

  const sections = useMemo(() => {
    return [...(currentExperience?.experience_sections || [])].sort(
      (a, b) => Number(a.position || 0) - Number(b.position || 0)
    );
  }, [currentExperience]);

  const itemCount = useMemo(() => {
    return experiences.reduce((total, experience) => {
      return (
        total +
        (experience.experience_sections || []).reduce(
          (sectionTotal, section) =>
            sectionTotal + (section.experience_items || []).length,
          0
        )
      );
    }, 0);
  }, [experiences]);

  const handleCreate = async () => {
    const trimmedName = name.trim();

    if (!trimmedName || creating) {
      return;
    }

    setCreating(true);

    const { error } = await supabase.from("experiences").insert([
      {
        name: trimmedName,
        type,
        position: experiences.length + 1,
      },
    ]);

    if (error) {
      console.error("EXPERIENCE CREATE ERROR:", error);
      showNotice("The experience could not be created.", "error");
    } else {
      setName("");
      showNotice("Experience created.");
      await loadExperiences({ silent: true });
    }

    setCreating(false);
  };

  const addSection = async (experienceId) => {
    if (working) {
      return;
    }

    setWorking(true);

    const sectionCount =
      experiences.find((experience) => experience.id === experienceId)
        ?.experience_sections?.length || 0;

    const { error } = await supabase.from("experience_sections").insert([
      {
        experience_id: experienceId,
        name: "New Section",
        type: "snacks",
        position: sectionCount + 1,
      },
    ]);

    if (error) {
      console.error("SECTION CREATE ERROR:", error);
      showNotice("The section could not be added.", "error");
    } else {
      showNotice("Section added.");
      await loadExperiences({ silent: true });
    }

    setWorking(false);
  };

  const addItem = async (sectionId) => {
    if (working) {
      return;
    }

    setWorking(true);

    const section = sections.find(
      (currentSection) => currentSection.id === sectionId
    );

    const { error } = await supabase.from("experience_items").insert([
      {
        section_id: sectionId,
        name: "New Item",
        description: "",
        position: (section?.experience_items?.length || 0) + 1,
      },
    ]);

    if (error) {
      console.error("ITEM CREATE ERROR:", error);
      showNotice("The item could not be added.", "error");
    } else {
      showNotice("Item added.");
      await loadExperiences({ silent: true });
    }

    setWorking(false);
  };

  const updateRecord = async (table, id, values, successMessage) => {
    const { error } = await supabase
      .from(table)
      .update(values)
      .eq("id", id);

    if (error) {
      console.error(`${table.toUpperCase()} UPDATE ERROR:`, error);
      showNotice("The change could not be saved.", "error");
      return false;
    }

    if (successMessage) {
      showNotice(successMessage);
    }

    return true;
  };

  const deleteRecord = async (
    table,
    id,
    confirmMessage,
    successMessage
  ) => {
    const confirmed = window.confirm(confirmMessage);

    if (!confirmed) {
      return false;
    }

    setWorking(true);

    const { error } = await supabase
      .from(table)
      .delete()
      .eq("id", id);

    if (error) {
      console.error(`${table.toUpperCase()} DELETE ERROR:`, error);
      showNotice("The item could not be deleted.", "error");
      setWorking(false);
      return false;
    }

    showNotice(successMessage);
    await loadExperiences({ silent: true });
    setWorking(false);
    return true;
  };

  function SortableItem({ item }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: item.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.6 : 1,
      zIndex: isDragging ? 20 : "auto",
    };

    const price = item.experience_prices?.[0];

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`
          group grid gap-3 rounded-2xl border bg-white p-3 transition
          md:grid-cols-[36px_minmax(160px,0.9fr)_minmax(220px,1.5fr)_110px_42px]
          ${isDragging
            ? "border-[#b88779] shadow-xl"
            : "border-[#eee5df] hover:border-[#dfd0c6] hover:shadow-sm"
          }
        `}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Move ${item.name}`}
          title="Drag to reorder item"
          className="
            flex h-10 w-9 cursor-grab items-center justify-center
            rounded-xl text-[#b1a39a] transition
            hover:bg-[#f6f1ed] hover:text-[#6f5d54] active:cursor-grabbing
          "
        >
          <Bars3Icon className="h-4 w-4" />
        </button>

        <div>
          <label className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-[#a1948d] md:hidden">
            Item
          </label>

          <input
            className="so-input w-full"
            defaultValue={item.name}
            placeholder="Item name"
            onBlur={async (event) => {
              const value = event.target.value.trim();

              if (!value || value === item.name) {
                return;
              }

              const saved = await updateRecord(
                "experience_items",
                item.id,
                { name: value }
              );

              if (saved) {
                await loadExperiences({ silent: true });
              }
            }}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-[#a1948d] md:hidden">
            Description
          </label>

          <textarea
            className="so-input min-h-[42px] w-full resize-y"
            defaultValue={item.description || ""}
            placeholder="Short guest-facing description"
            rows={1}
            onBlur={async (event) => {
              const value = event.target.value;

              if (value === (item.description || "")) {
                return;
              }

              const saved = await updateRecord(
                "experience_items",
                item.id,
                { description: value }
              );

              if (saved) {
                await loadExperiences({ silent: true });
              }
            }}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-[#a1948d] md:hidden">
            Price
          </label>

          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#9f9189]">
              €
            </span>

            <input
              type="number"
              min="0"
              step="0.01"
              className="so-input w-full pl-7"
              defaultValue={formatPrice(price?.price)}
              placeholder="0.00"
              onBlur={async (event) => {
                const value = event.target.value;

                if (price) {
                  const saved = await updateRecord(
                    "experience_prices",
                    price.id,
                    { price: value || null }
                  );

                  if (saved) {
                    await loadExperiences({ silent: true });
                  }
                } else if (value !== "") {
                  const { error } = await supabase
                    .from("experience_prices")
                    .insert([
                      {
                        item_id: item.id,
                        price: value,
                      },
                    ]);

                  if (error) {
                    console.error("PRICE CREATE ERROR:", error);
                    showNotice("The price could not be saved.", "error");
                  } else {
                    await loadExperiences({ silent: true });
                  }
                }
              }}
            />
          </div>
        </div>

        <button
          type="button"
          title="Delete item"
          aria-label={`Delete ${item.name}`}
          onClick={() =>
            deleteRecord(
              "experience_items",
              item.id,
              `Delete "${item.name}"?`,
              "Item deleted."
            )
          }
          className="
            flex h-10 w-10 items-center justify-center rounded-xl
            text-[#b9aaa2] transition hover:bg-red-50 hover:text-red-600
          "
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    );
  }

  function SortableSection({ section }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: section.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.65 : 1,
      zIndex: isDragging ? 30 : "auto",
    };

    const items = [...(section.experience_items || [])].sort(
      (a, b) => Number(a.position || 0) - Number(b.position || 0)
    );

    return (
      <section
        ref={setNodeRef}
        style={style}
        className={`
          overflow-hidden rounded-[22px] border bg-[#fcfaf8] transition
          ${isDragging
            ? "border-[#b88779] shadow-2xl"
            : "border-[#eadfd7]"
          }
        `}
      >
        <div className="flex flex-col gap-4 border-b border-[#eee5df] bg-white px-5 py-4 lg:flex-row lg:items-center">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Move ${section.name}`}
            title="Drag to reorder section"
            className="
              flex h-10 w-10 flex-shrink-0 cursor-grab items-center
              justify-center rounded-xl border border-[#ebe1da]
              text-[#a99a91] transition hover:bg-[#f7f2ee]
              active:cursor-grabbing
            "
          >
            <ArrowsUpDownIcon className="h-4 w-4" />
          </button>

          <input
            className="so-input min-w-0 flex-1"
            defaultValue={section.name}
            placeholder="Section name"
            onBlur={async (event) => {
              const value = event.target.value.trim();

              if (!value || value === section.name) {
                return;
              }

              const saved = await updateRecord(
                "experience_sections",
                section.id,
                { name: value }
              );

              if (saved) {
                await loadExperiences({ silent: true });
              }
            }}
          />

          <select
            className="so-input min-w-[150px]"
            defaultValue={section.type || "snacks"}
            onChange={async (event) => {
              const saved = await updateRecord(
                "experience_sections",
                section.id,
                { type: event.target.value }
              );

              if (saved) {
                await loadExperiences({ silent: true });
              }
            }}
          >
            {SECTION_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <ActionButton
              onClick={() => addItem(section.id)}
              disabled={working}
            >
              <PlusIcon className="h-4 w-4" />
              Add item
            </ActionButton>

            <button
              type="button"
              title="Delete section"
              aria-label={`Delete ${section.name}`}
              onClick={() =>
                deleteRecord(
                  "experience_sections",
                  section.id,
                  `Delete the "${section.name}" section and its items?`,
                  "Section deleted."
                )
              }
              className="
                flex h-10 w-10 items-center justify-center rounded-xl
                border border-red-100 bg-red-50 text-red-600 transition
                hover:bg-red-100
              "
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div className="hidden grid-cols-[36px_minmax(160px,0.9fr)_minmax(220px,1.5fr)_110px_42px] gap-3 px-3 text-[9px] uppercase tracking-[0.18em] text-[#9f9189] md:grid">
            <span />
            <span>Item</span>
            <span>Description</span>
            <span>Price</span>
            <span />
          </div>

          {items.length === 0 ? (
            <EmptyState
              title="No items in this section"
              detail={`Add the first ${sectionTypeLabel(section.type).toLowerCase()} item to start building this section.`}
              action={
                <ActionButton
                  variant="primary"
                  onClick={() => addItem(section.id)}
                  disabled={working}
                >
                  <PlusIcon className="h-4 w-4" />
                  Add first item
                </ActionButton>
              }
            />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={async (event) => {
                const { active, over } = event;

                if (!over || active.id === over.id) {
                  return;
                }

                const oldIndex = items.findIndex(
                  (item) => item.id === active.id
                );

                const newIndex = items.findIndex(
                  (item) => item.id === over.id
                );

                if (oldIndex === -1 || newIndex === -1) {
                  return;
                }

                const newItems = arrayMove(items, oldIndex, newIndex);

                setExperiences((previous) =>
                  previous.map((experience) =>
                    experience.id === currentExperience.id
                      ? {
                          ...experience,
                          experience_sections:
                            experience.experience_sections.map(
                              (currentSection) =>
                                currentSection.id === section.id
                                  ? {
                                      ...currentSection,
                                      experience_items: newItems,
                                    }
                                  : currentSection
                            ),
                        }
                      : experience
                  )
                );

                const results = await Promise.all(
                  newItems.map((item, index) =>
                    supabase
                      .from("experience_items")
                      .update({ position: index + 1 })
                      .eq("id", item.id)
                  )
                );

                if (results.some((result) => result.error)) {
                  showNotice(
                    "The item order could not be fully saved.",
                    "error"
                  );
                  await loadExperiences({ silent: true });
                }
              }}
            >
              <SortableContext
                items={items.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {items.map((item) => (
                    <SortableItem key={item.id} item={item} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </section>
    );
  }

  return (
    <div className="so-main-inner">
      {notice && (
        <div
          className={`
            fixed right-5 top-5 z-[120] flex max-w-sm items-start gap-3
            rounded-2xl border bg-white px-4 py-3 shadow-xl
            ${notice.tone === "error"
              ? "border-red-200 text-red-700"
              : "border-emerald-200 text-emerald-700"
            }
          `}
          role="status"
        >
          {notice.tone === "error" ? (
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
          ) : (
            <CheckCircleIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
          )}

          <span className="text-sm">{notice.message}</span>
        </div>
      )}

      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-[#9a8c84]">
            Guest experiences
          </div>

          <h1 className="mt-2 text-3xl font-medium tracking-[-0.03em] text-[#30231f]">
            Experience menus
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#82746c]">
            Build and organise dining, spa, and room-service experiences.
            Drag sections and items to control their guest-facing order.
          </p>
        </div>

        <ActionButton
          onClick={() => loadExperiences()}
          disabled={loading}
          className="self-start lg:self-auto"
        >
          <ArrowPathIcon
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </ActionButton>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-[20px] border border-[#eadfd7] bg-white px-5 py-4">
          <div className="text-[9px] uppercase tracking-[0.18em] text-[#9f9189]">
            Experiences
          </div>
          <div className="mt-2 text-2xl font-medium text-[#30231f]">
            {experiences.length}
          </div>
        </div>

        <div className="rounded-[20px] border border-[#eadfd7] bg-white px-5 py-4">
          <div className="text-[9px] uppercase tracking-[0.18em] text-[#9f9189]">
            Sections
          </div>
          <div className="mt-2 text-2xl font-medium text-[#30231f]">
            {experiences.reduce(
              (total, experience) =>
                total + (experience.experience_sections || []).length,
              0
            )}
          </div>
        </div>

        <div className="rounded-[20px] border border-[#eadfd7] bg-white px-5 py-4">
          <div className="text-[9px] uppercase tracking-[0.18em] text-[#9f9189]">
            Menu items
          </div>
          <div className="mt-2 text-2xl font-medium text-[#30231f]">
            {itemCount}
          </div>
        </div>

        <div className="rounded-[20px] border border-[#eadfd7] bg-white px-5 py-4">
          <div className="text-[9px] uppercase tracking-[0.18em] text-[#9f9189]">
            Active editor
          </div>
          <div className="mt-2 truncate text-sm font-medium text-[#30231f]">
            {currentExperience?.name || "None selected"}
          </div>
        </div>
      </div>

      <div className="mb-8 rounded-[24px] border border-[#e8ddd5] bg-white p-5 shadow-sm">
        <div className="mb-4">
          <div className="text-sm font-medium text-[#3b2b25]">
            Create an experience
          </div>
          <div className="mt-1 text-xs text-[#8f8179]">
            Add a guest journey now, then open it to build sections and items.
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_220px_auto]">
          <input
            className="so-input w-full"
            placeholder="Experience name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleCreate();
              }
            }}
          />

          <select
            className="so-input w-full"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            {EXPERIENCE_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <ActionButton
            variant="primary"
            onClick={handleCreate}
            disabled={!name.trim() || creating}
            className="w-full lg:w-auto"
          >
            <PlusIcon className="h-4 w-4" />
            {creating ? "Creating..." : "Create"}
          </ActionButton>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-48 animate-pulse rounded-[24px] border border-[#eadfd7] bg-white"
            />
          ))}
        </div>
      ) : experiences.length === 0 ? (
        <EmptyState
          title="No experiences yet"
          detail="Create the first experience above. You can then organise sections, descriptions, prices, and guest-facing order."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {experiences.map((experience) => {
            const sectionCount =
              experience.experience_sections?.length || 0;

            const experienceItemCount = (
              experience.experience_sections || []
            ).reduce(
              (total, section) =>
                total + (section.experience_items || []).length,
              0
            );

            return (
              <button
                type="button"
                key={experience.id}
                onClick={() => setSelectedExp(experience)}
                className="
                  group overflow-hidden rounded-[24px] border border-[#eadfd7]
                  bg-white text-left shadow-sm transition
                  hover:-translate-y-0.5 hover:border-[#d8c8bd] hover:shadow-lg
                  focus:outline-none focus:ring-2 focus:ring-[#963b2c]/20
                "
              >
                <div className="relative h-28 overflow-hidden bg-gradient-to-br from-[#edf3ef] to-[#dce8e2]">
                  {experience.image_url ? (
                    <img
                      src={experience.image_url}
                      alt=""
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <PhotoIcon className="h-7 w-7 text-[#b9aaa1]" />
                    </div>
                  )}

                  <div className="absolute left-4 top-4 rounded-full border border-white/70 bg-white/85 px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-[#654f44] backdrop-blur">
                    {typeLabel(experience.type)}
                  </div>
                </div>

                <div className="p-5">
                  <div className="text-base font-medium text-[#34251f]">
                    {experience.name}
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-xs text-[#8b7d75]">
                    <span>{sectionCount} sections</span>
                    <span>·</span>
                    <span>{experienceItemCount} items</span>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-[#f0e8e2] pt-4">
                    <span className="text-[10px] uppercase tracking-[0.16em] text-[#963b2c]">
                      Open editor
                    </span>

                    <span className="text-[#b6a79f] transition group-hover:translate-x-1 group-hover:text-[#963b2c]">
                      →
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {currentExperience && (
        <div
          className="
            fixed inset-0 z-[100] flex items-end justify-center
            bg-[#201713]/55 p-0 backdrop-blur-[3px] sm:items-center sm:p-5
          "
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setSelectedExp(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="experience-editor-title"
            className="
              flex max-h-[94vh] w-full max-w-[1180px] flex-col overflow-hidden
              rounded-t-[28px] border border-white/60 bg-[#f7f3ef]
              shadow-2xl sm:max-h-[90vh] sm:rounded-[28px]
            "
          >
            <div className="flex-shrink-0 border-b border-[#e6dbd3] bg-white px-5 py-5 sm:px-7">
              <div className="flex items-start justify-between gap-5">
                <div className="min-w-0">
                  <div className="text-[9px] uppercase tracking-[0.24em] text-[#9c8e86]">
                    Experience editor
                  </div>

                  <h2
                    id="experience-editor-title"
                    className="mt-2 truncate text-2xl font-medium tracking-[-0.025em] text-[#30231f]"
                  >
                    {currentExperience.name}
                  </h2>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#8b7d75]">
                    <span>{typeLabel(currentExperience.type)}</span>
                    <span>·</span>
                    <span>{sections.length} sections</span>
                    <span>·</span>
                    <span>
                      {sections.reduce(
                        (total, section) =>
                          total + (section.experience_items || []).length,
                        0
                      )}{" "}
                      items
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedExp(null)}
                  className="
                    flex h-10 w-10 flex-shrink-0 items-center justify-center
                    rounded-full border border-[#e7ddd5] bg-white text-[#8d7e76]
                    transition hover:bg-[#f7f2ee] hover:text-[#30231f]
                  "
                  aria-label="Close editor"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(240px,1fr)_auto_auto]">
                <div className="relative">
                  <PhotoIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#aa9b93]" />

                  <input
                    className="so-input w-full pl-10"
                    placeholder="Image URL"
                    defaultValue={currentExperience.image_url || ""}
                    onBlur={async (event) => {
                      const value = event.target.value.trim();

                      if (value === (currentExperience.image_url || "")) {
                        return;
                      }

                      const saved = await updateRecord(
                        "experiences",
                        currentExperience.id,
                        { image_url: value || null },
                        "Image updated."
                      );

                      if (saved) {
                        await loadExperiences({ silent: true });
                      }
                    }}
                  />
                </div>

                <ActionButton
                  onClick={() => addSection(currentExperience.id)}
                  disabled={working}
                >
                  <PlusIcon className="h-4 w-4" />
                  Add section
                </ActionButton>

                <ActionButton
                  variant="danger"
                  disabled={working}
                  onClick={async () => {
                    const deleted = await deleteRecord(
                      "experiences",
                      currentExperience.id,
                      `Delete "${currentExperience.name}" and all of its sections and items?`,
                      "Experience deleted."
                    );

                    if (deleted) {
                      setSelectedExp(null);
                    }
                  }}
                >
                  <TrashIcon className="h-4 w-4" />
                  Delete
                </ActionButton>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7 sm:py-6">
              {sections.length === 0 ? (
                <EmptyState
                  title="This experience has no sections"
                  detail="Create a section for snacks, drinks, amenities, or another part of the guest journey."
                  action={
                    <ActionButton
                      variant="primary"
                      onClick={() => addSection(currentExperience.id)}
                      disabled={working}
                    >
                      <PlusIcon className="h-4 w-4" />
                      Create first section
                    </ActionButton>
                  }
                />
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={async (event) => {
                    const { active, over } = event;

                    if (!over || active.id === over.id) {
                      return;
                    }

                    const oldIndex = sections.findIndex(
                      (section) => section.id === active.id
                    );

                    const newIndex = sections.findIndex(
                      (section) => section.id === over.id
                    );

                    if (oldIndex === -1 || newIndex === -1) {
                      return;
                    }

                    const newSections = arrayMove(
                      sections,
                      oldIndex,
                      newIndex
                    );

                    setExperiences((previous) =>
                      previous.map((experience) =>
                        experience.id === currentExperience.id
                          ? {
                              ...experience,
                              experience_sections: newSections,
                            }
                          : experience
                      )
                    );

                    const results = await Promise.all(
                      newSections.map((section, index) =>
                        supabase
                          .from("experience_sections")
                          .update({ position: index + 1 })
                          .eq("id", section.id)
                      )
                    );

                    if (results.some((result) => result.error)) {
                      showNotice(
                        "The section order could not be fully saved.",
                        "error"
                      );
                      await loadExperiences({ silent: true });
                    }
                  }}
                >
                  <SortableContext
                    items={sections.map((section) => section.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-4">
                      {sections.map((section) => (
                        <SortableSection
                          key={section.id}
                          section={section}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>

            <div className="flex flex-shrink-0 items-center justify-between gap-4 border-t border-[#e5dad2] bg-white px-5 py-4 sm:px-7">
              <div className="hidden items-center gap-2 text-xs text-[#91837b] sm:flex">
                <ArrowsUpDownIcon className="h-4 w-4" />
                Drag handles control guest-facing order.
              </div>

              <ActionButton
                onClick={() => setSelectedExp(null)}
                className="ml-auto"
              >
                Done
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
