"use client";

export const dynamic = "force-dynamic";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createClientComponentClient,
} from "@supabase/auth-helpers-nextjs";

const PAGE_SIZES = [10, 25, 50];

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  jobTitle: "",
  department: "Food & Beverage",
  roleId: "",
  locationIds: [],
};

export default function TeamAccessPage() {
  const supabase =
    createClientComponentClient();

  const [mounted, setMounted] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [inviting, setInviting] =
    useState(false);

  const [team, setTeam] =
    useState([]);

  const [roles, setRoles] =
    useState([]);

  const [locations, setLocations] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [roleFilter, setRoleFilter] =
    useState("all");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [page, setPage] =
    useState(1);

  const [pageSize, setPageSize] =
    useState(10);

  const [
    showInviteModal,
    setShowInviteModal,
  ] = useState(false);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [message, setMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    roleFilter,
    statusFilter,
    pageSize,
  ]);

  async function loadData() {
    setLoading(true);

    try {
      const [
        profilesResponse,
        rolesResponse,
        locationsResponse,
        userRolesResponse,
        venueAccessResponse,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(`
            id,
            email,
            first_name,
            last_name,
            phone,
            job_title,
            department,
            status,
            created_at
          `)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("roles")
          .select(`
            id,
            name,
            slug,
            description
          `)
          .order("name"),

        supabase
          .from("wine_locations")
          .select(`
            id,
            name
          `)
          .order("name"),

        supabase
          .from("user_roles")
          .select(`
            user_id,
            role_id,
            roles (
              id,
              name,
              slug
            )
          `),

        supabase
          .from("user_venue_access")
          .select(`
            user_id,
            location_id,
            wine_locations (
              id,
              name
            )
          `),
      ]);

      if (profilesResponse.error) {
        throw profilesResponse.error;
      }

      if (rolesResponse.error) {
        throw rolesResponse.error;
      }

      if (locationsResponse.error) {
        throw locationsResponse.error;
      }

      if (userRolesResponse.error) {
        throw userRolesResponse.error;
      }

      if (venueAccessResponse.error) {
        throw venueAccessResponse.error;
      }

      const profiles =
        profilesResponse.data || [];

      const userRoles =
        userRolesResponse.data || [];

      const venueAccess =
        venueAccessResponse.data || [];

      const teamRows = profiles.map(
        (profile) => {
          const assignedRoles =
            userRoles
              .filter(
                (row) =>
                  row.user_id === profile.id
              )
              .map((row) => row.roles)
              .filter(Boolean);

          const assignedLocations =
            venueAccess
              .filter(
                (row) =>
                  row.user_id === profile.id
              )
              .map(
                (row) =>
                  row.wine_locations
              )
              .filter(Boolean);

          return {
            ...profile,
            roles: assignedRoles,
            locations:
              assignedLocations,
          };
        }
      );

      setTeam(teamRows);

      setRoles(
        rolesResponse.data || []
      );

      setLocations(
        locationsResponse.data || []
      );
    } catch (error) {
      console.error(
        "TEAM LOAD ERROR:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Unable to load team access."
      );
    }

    setLoading(false);
  }

  const filteredTeam = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return team.filter((member) => {
      const fullName = [
        member.first_name,
        member.last_name,
      ]
        .filter(Boolean)
        .join(" ");

      const haystack = [
        fullName,
        member.email,
        member.job_title,
        member.department,
        ...(member.roles || []).map(
          (role) => role.name
        ),
        ...(member.locations || []).map(
          (location) => location.name
        ),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const roleMatch =
        roleFilter === "all" ||
        (member.roles || []).some(
          (role) =>
            role.id === roleFilter
        );

      const statusMatch =
        statusFilter === "all" ||
        member.status === statusFilter;

      return (
        (!query ||
          haystack.includes(query)) &&
        roleMatch &&
        statusMatch
      );
    });
  }, [
    team,
    search,
    roleFilter,
    statusFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredTeam.length / pageSize
    )
  );

  const safePage = Math.min(
    page,
    totalPages
  );

  const start =
    (safePage - 1) * pageSize;

  const pageTeam = filteredTeam.slice(
    start,
    start + pageSize
  );

  const activeUsers = team.filter(
    (member) =>
      member.status === "active"
  ).length;

  const pendingUsers = team.filter(
    (member) =>
      member.status === "pending"
  ).length;

  const administrators = team.filter(
    (member) =>
      (member.roles || []).some(
        (role) =>
          role.slug === "administrator"
      )
  ).length;

  function openInviteModal() {
    setForm({
      ...EMPTY_FORM,
      roleId: roles[0]?.id || "",
    });

    setMessage("");
    setErrorMessage("");
    setShowInviteModal(true);
  }

  function toggleLocation(locationId) {
    setForm((current) => {
      const exists =
        current.locationIds.includes(
          locationId
        );

      return {
        ...current,
        locationIds: exists
          ? current.locationIds.filter(
              (id) => id !== locationId
            )
          : [
              ...current.locationIds,
              locationId,
            ],
      };
    });
  }

  async function inviteTeamMember() {
    if (!form.email.trim()) {
      setErrorMessage(
        "Email address is required."
      );

      return;
    }

    if (!form.roleId) {
      setErrorMessage(
        "Select a role."
      );

      return;
    }

    setInviting(true);
    setMessage("");
    setErrorMessage("");

    try {
      const {
        data: sessionData,
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const accessToken =
        sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error(
          "Your VAXERON session has expired. Sign in again."
        );
      }

      const response = await fetch(
        "/api/team/invite",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${accessToken}`,
          },

          body: JSON.stringify(form),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Unable to invite team member."
        );
      }

      await loadData();

      setMessage(
        `Invitation sent to ${form.email.trim()}.`
      );

      setForm(EMPTY_FORM);

      setShowInviteModal(false);
    } catch (error) {
      console.error(
        "TEAM INVITE ERROR:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Unable to invite team member."
      );
    }

    setInviting(false);
  }

  function displayName(member) {
    const name = [
      member.first_name,
      member.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    return name || "Unnamed Team Member";
  }

  if (!mounted) {
    return (
      <div className="page-fade min-h-screen bg-[#f7f3ed] px-8 py-8 text-[#8f8177]">
        Loading team access...
      </div>
    );
  }

  return (
    <div className="page-fade min-h-screen bg-[#f7f3ed] text-[#30241f]">
      <div className="mx-auto max-w-[1700px] px-5 py-7 md:px-8 lg:px-10">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="flex flex-col gap-5 border-b border-[#ded3c8] pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[9px] uppercase tracking-[0.34em] text-[#a17865]">
              VAXERON Access Control
            </div>

            <h1 className="mt-3 text-[34px] font-medium tracking-[-0.04em] md:text-[44px]">
              Team & Access
            </h1>

            <p className="mt-2 max-w-[650px] text-[12px] text-[#8a7b70]">
              Manage hospitality users,
              operational roles and venue
              access.
            </p>
          </div>

          <button
            onClick={openInviteModal}
            className="min-h-10 rounded-full bg-[#963d2d] px-5 text-[10px] uppercase tracking-[0.15em] text-white"
          >
            + Add Team Member
          </button>
        </header>

        {/* =================================================
            FEEDBACK
        ================================================= */}

        {message && (
          <div className="mt-5 rounded-[16px] border border-[#cdd7c6] bg-[#f3f7ef] px-5 py-4 text-[10px] text-[#607257]">
            {message}
          </div>
        )}

        {errorMessage &&
          !showInviteModal && (
            <div className="mt-5 rounded-[16px] border border-[#dfc5bd] bg-[#fbf1ee] px-5 py-4 text-[10px] text-[#963d2d]">
              {errorMessage}
            </div>
          )}

        {/* =================================================
            SUMMARY
        ================================================= */}

        <section className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[20px] border border-[#ded3c8] bg-[#ded3c8] lg:grid-cols-4">
          {[
            ["Team Members", team.length],
            ["Active", activeUsers],
            ["Pending", pendingUsers],
            [
              "Administrators",
              administrators,
            ],
          ].map(([label, value]) => (
            <div
              key={label}
              className="bg-[#fbf8f3] px-5 py-4"
            >
              <div className="text-[8px] uppercase tracking-[0.22em] text-[#a29184]">
                {label}
              </div>

              <div className="mt-2 text-[21px] tracking-[-0.03em]">
                {value}
              </div>
            </div>
          ))}
        </section>

        {/* =================================================
            DIRECTORY
        ================================================= */}

        <section className="mt-5 overflow-hidden rounded-[22px] border border-[#ded3c8] bg-[#fbf8f3]">

          {/* FILTERS */}

          <div className="grid gap-3 border-b border-[#e4dad1] p-4 lg:grid-cols-[1fr_220px_200px_auto]">
            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search team member, email, role, venue or department..."
              className="min-h-11 rounded-xl border border-[#ddd0c5] bg-white/70 px-4 text-[11px] outline-none"
            />

            <select
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(
                  event.target.value
                )
              }
              className="min-h-11 rounded-xl border border-[#ddd0c5] bg-white/70 px-3 text-[10px] outline-none"
            >
              <option value="all">
                All roles
              </option>

              {roles.map((role) => (
                <option
                  key={role.id}
                  value={role.id}
                >
                  {role.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              className="min-h-11 rounded-xl border border-[#ddd0c5] bg-white/70 px-3 text-[10px] outline-none"
            >
              <option value="all">
                All statuses
              </option>

              <option value="active">
                Active
              </option>

              <option value="pending">
                Pending
              </option>

              <option value="inactive">
                Inactive
              </option>
            </select>

            <button
              onClick={() => {
                setSearch("");
                setRoleFilter("all");
                setStatusFilter("all");
              }}
              className="px-4 text-[9px] uppercase tracking-[0.18em] text-[#8d7567]"
            >
              Clear
            </button>
          </div>

          {/* COUNT */}

          <div className="flex items-center justify-between border-b border-[#e4dad1] px-5 py-3 text-[9px] text-[#95867b]">
            <span>
              Showing{" "}
              {filteredTeam.length
                ? start + 1
                : 0}
              –
              {Math.min(
                start + pageSize,
                filteredTeam.length
              )}{" "}
              of {filteredTeam.length} users
            </span>

            <label className="flex items-center gap-2">
              Rows

              <select
                value={pageSize}
                onChange={(event) =>
                  setPageSize(
                    Number(
                      event.target.value
                    )
                  )
                }
                className="rounded-lg border border-[#ddd0c5] bg-white px-2 py-1"
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* TEAM ROWS */}

          <div className="divide-y divide-[#ebe3dc]">
            {loading ? (
              <div className="px-5 py-16 text-center text-[11px] text-[#95867b]">
                Loading team...
              </div>
            ) : pageTeam.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <div className="text-[12px]">
                  No team members found
                </div>

                <div className="mt-2 text-[9px] text-[#95867b]">
                  Adjust the filters or add a
                  team member.
                </div>
              </div>
            ) : (
              pageTeam.map((member) => {
                const primaryRole =
                  member.roles?.[0];

                return (
                  <article
                    key={member.id}
                    className="grid gap-4 px-5 py-4 transition hover:bg-[#f7f1eb] md:grid-cols-[minmax(0,1.3fr)_minmax(140px,0.7fr)_minmax(180px,1fr)_110px] md:items-center"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[11px] font-medium md:text-[12px]">
                        {displayName(member)}
                      </div>

                      <div className="mt-1 truncate text-[9px] text-[#94847a]">
                        {member.email || "—"}
                      </div>

                      <div className="mt-1 text-[8px] text-[#a29287]">
                        {[
                          member.job_title,
                          member.department,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </div>
                    </div>

                    <div>
                      <div className="mb-1.5 text-[7px] uppercase tracking-[0.18em] text-[#a29287] md:hidden">
                        Role
                      </div>

                      <span className="inline-flex rounded-full border border-[#dfd1c5] px-2.5 py-1 text-[8px] text-[#806d60]">
                        {primaryRole?.name ||
                          "No role"}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="mb-1.5 text-[7px] uppercase tracking-[0.18em] text-[#a29287] md:hidden">
                        Venue Access
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {primaryRole?.slug ===
                        "administrator" ? (
                          <span className="rounded-full bg-[#eee5dc] px-2.5 py-1 text-[8px] text-[#756357]">
                            All VAXERON
                          </span>
                        ) : member.locations
                            ?.length ? (
                          member.locations
                            .slice(0, 3)
                            .map((location) => (
                              <span
                                key={
                                  location.id
                                }
                                className="rounded-full bg-[#eee5dc] px-2.5 py-1 text-[8px] text-[#756357]"
                              >
                                {location.name}
                              </span>
                            ))
                        ) : (
                          <span className="text-[9px] text-[#b09f94]">
                            No venue access
                          </span>
                        )}

                        {member.locations
                          ?.length > 3 && (
                          <span className="rounded-full bg-[#eee5dc] px-2.5 py-1 text-[8px] text-[#756357]">
                            +
                            {member.locations
                              .length - 3}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="md:text-right">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[8px] capitalize ${
                          member.status ===
                          "active"
                            ? "bg-[#edf2e9] text-[#64705d]"
                            : member.status ===
                              "pending"
                            ? "bg-[#f3eadf] text-[#99724f]"
                            : "bg-[#f1e5e1] text-[#9b5c50]"
                        }`}
                      >
                        {member.status ||
                          "active"}
                      </span>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {/* PAGINATION */}

          <div className="flex flex-col gap-3 border-t border-[#e4dad1] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[9px] text-[#95867b]">
              Page {safePage} of{" "}
              {totalPages}
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={safePage === 1}
                onClick={() => setPage(1)}
                className="h-9 rounded-full border border-[#d9cbc0] px-3 text-[9px] disabled:opacity-30"
              >
                First
              </button>

              <button
                disabled={safePage === 1}
                onClick={() =>
                  setPage((current) =>
                    Math.max(
                      1,
                      current - 1
                    )
                  )
                }
                className="h-9 rounded-full border border-[#d9cbc0] px-4 text-[9px] disabled:opacity-30"
              >
                Previous
              </button>

              <span className="min-w-16 text-center text-[9px] text-[#806d60]">
                {safePage} / {totalPages}
              </span>

              <button
                disabled={
                  safePage === totalPages
                }
                onClick={() =>
                  setPage((current) =>
                    Math.min(
                      totalPages,
                      current + 1
                    )
                  )
                }
                className="h-9 rounded-full border border-[#d9cbc0] px-4 text-[9px] disabled:opacity-30"
              >
                Next
              </button>

              <button
                disabled={
                  safePage === totalPages
                }
                onClick={() =>
                  setPage(totalPages)
                }
                className="h-9 rounded-full border border-[#d9cbc0] px-3 text-[9px] disabled:opacity-30"
              >
                Last
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* ===================================================
          INVITE MODAL
      =================================================== */}

      {showInviteModal && (
        <div
          className="fixed inset-0 z-[100] overflow-y-auto bg-[#2c211d]/45 p-3 backdrop-blur-sm md:p-6"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !inviting
            ) {
              setShowInviteModal(false);
            }
          }}
        >
          <div className="mx-auto my-3 w-full max-w-[920px] overflow-hidden rounded-[24px] border border-[#ded0c5] bg-[#f8f4ee] shadow-2xl md:my-8">

            {/* MODAL HEADER */}

            <div className="sticky top-0 z-20 flex items-start justify-between border-b border-[#dfd3c8] bg-[#f8f4ee]/95 px-5 py-5 backdrop-blur md:px-7">
              <div>
                <div className="text-[8px] uppercase tracking-[0.28em] text-[#a17865]">
                  Access Provisioning
                </div>

                <h2 className="mt-2 text-[24px] tracking-[-0.03em]">
                  Add Team Member
                </h2>

                <div className="mt-1 text-[10px] text-[#8e7d72]">
                  Invite a hospitality user
                  and define their operational
                  access.
                </div>
              </div>

              <button
                disabled={inviting}
                onClick={() =>
                  setShowInviteModal(false)
                }
                className="h-10 w-10 rounded-full border border-[#d9cbc0] text-[18px] disabled:opacity-40"
              >
                ×
              </button>
            </div>

            {/* MODAL CONTENT */}

            <div className="grid gap-7 p-5 md:p-7 lg:grid-cols-[1fr_0.9fr]">

              {/* MEMBER DETAILS */}

              <section>
                <div className="text-[8px] uppercase tracking-[0.24em] text-[#9b8779]">
                  Team Member
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    [
                      "First name",
                      "firstName",
                    ],
                    [
                      "Last name",
                      "lastName",
                    ],
                    [
                      "Email address",
                      "email",
                    ],
                    ["Phone", "phone"],
                    [
                      "Job title",
                      "jobTitle",
                    ],
                    [
                      "Department",
                      "department",
                    ],
                  ].map(([label, field]) => (
                    <label
                      key={field}
                      className={
                        field === "email"
                          ? "sm:col-span-2"
                          : ""
                      }
                    >
                      <span className="mb-1.5 block text-[8px] text-[#958277]">
                        {label}
                      </span>

                      <input
                        type={
                          field === "email"
                            ? "email"
                            : "text"
                        }
                        value={form[field]}
                        onChange={(event) =>
                          setForm(
                            (current) => ({
                              ...current,
                              [field]:
                                event.target
                                  .value,
                            })
                          )
                        }
                        className="min-h-11 w-full rounded-xl border border-[#ddd0c5] bg-white/65 px-3 text-[11px] outline-none"
                      />
                    </label>
                  ))}
                </div>
              </section>

              {/* ACCESS */}

              <section>
                <div className="text-[8px] uppercase tracking-[0.24em] text-[#9b8779]">
                  Role & Access
                </div>

                <label className="mt-4 block">
                  <span className="mb-1.5 block text-[8px] text-[#958277]">
                    Operational role
                  </span>

                  <select
                    value={form.roleId}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          roleId:
                            event.target
                              .value,
                        })
                      )
                    }
                    className="min-h-11 w-full rounded-xl border border-[#ddd0c5] bg-white/65 px-3 text-[11px] outline-none"
                  >
                    <option value="">
                      Select role
                    </option>

                    {roles.map((role) => (
                      <option
                        key={role.id}
                        value={role.id}
                      >
                        {role.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="mt-5">
                  <div className="text-[8px] text-[#958277]">
                    Venue / cellar access
                  </div>

                  <div className="mt-2 overflow-hidden rounded-[16px] border border-[#dfd3c8] bg-white/45">
                    {locations.map(
                      (location) => {
                        const selected =
                          form.locationIds.includes(
                            location.id
                          );

                        return (
                          <button
                            key={location.id}
                            type="button"
                            onClick={() =>
                              toggleLocation(
                                location.id
                              )
                            }
                            className="flex w-full items-center justify-between gap-4 border-b border-[#e8dfd7] px-4 py-3 text-left last:border-0"
                          >
                            <span className="truncate text-[10px]">
                              {location.name}
                            </span>

                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded-full border text-[9px] ${
                                selected
                                  ? "border-[#963d2d] bg-[#963d2d] text-white"
                                  : "border-[#d8c9bd] text-transparent"
                              }`}
                            >
                              ✓
                            </span>
                          </button>
                        );
                      }
                    )}
                  </div>

                  <div className="mt-3 text-[8px] leading-4 text-[#a29287]">
                    Administrators receive
                    full VAXERON access.
                    Venue selections define
                    operational location access
                    for restricted roles.
                  </div>
                </div>
              </section>
            </div>

            {/* ERROR */}

            {errorMessage && (
              <div className="mx-5 mb-4 rounded-[14px] border border-[#dfc5bd] bg-[#fbf1ee] px-4 py-3 text-[9px] text-[#963d2d] md:mx-7">
                {errorMessage}
              </div>
            )}

            {/* MODAL ACTIONS */}

            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-[#dfd3c8] bg-[#f8f4ee]/95 px-5 py-4 backdrop-blur md:px-7">
              <button
                disabled={inviting}
                onClick={() =>
                  setShowInviteModal(false)
                }
                className="min-h-11 rounded-full border border-[#d9cbc0] px-5 text-[9px] uppercase tracking-[0.16em] disabled:opacity-40"
              >
                Cancel
              </button>

              <button
                disabled={
                  inviting ||
                  !form.email.trim() ||
                  !form.roleId
                }
                onClick={inviteTeamMember}
                className="min-h-11 rounded-full bg-[#963d2d] px-6 text-[9px] uppercase tracking-[0.16em] text-white disabled:opacity-50"
              >
                {inviting
                  ? "Sending..."
                  : "Send Invitation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}