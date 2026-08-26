"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";

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

const STATUS_STYLE = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  inactive: "border-slate-200 bg-slate-50 text-slate-500",
};

function initials(member) {
  const value = [member.first_name, member.last_name].filter(Boolean).join(" ") || member.email || "?";
  return value.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function displayName(member) {
  return [member.first_name, member.last_name].filter(Boolean).join(" ").trim() || "Invited team member";
}

export default function TeamAccessPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [resendingUserId, setResendingUserId] = useState("");
  const [team, setTeam] = useState([]);
  const [roles, setRoles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [workspace, setWorkspace] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const authenticatedRequest = useCallback(async (url, options = {}) => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    const token = data?.session?.access_token;
    if (!token) throw new Error("Your Vaxeron session has expired. Sign in again.");
    return fetch(url, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${token}` },
    });
  }, [supabase]);

  const loadData = useCallback(async ({ quiet = false } = {}) => {
    quiet ? setRefreshing(true) : setLoading(true);
    setErrorMessage("");
    try {
      const response = await authenticatedRequest("/api/team");
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || "Unable to load team access.");
      setTeam(result.team || []);
      setRoles(result.roles || []);
      setLocations(result.locations || []);
      setWorkspace(result.workspace || null);
    } catch (error) {
      console.error("TEAM LOAD ERROR:", error);
      setErrorMessage(error?.message || "Unable to load team access.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authenticatedRequest]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, pageSize]);

  useEffect(() => {
    if (!showInviteModal) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !inviting) setShowInviteModal(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [showInviteModal, inviting]);

  const filteredTeam = useMemo(() => {
    const query = search.trim().toLowerCase();
    return team.filter((member) => {
      const haystack = [
        displayName(member),
        member.email,
        member.job_title,
        member.department,
        ...(member.roles || []).map((role) => role.name),
        ...(member.locations || []).map((location) => location.name),
      ].filter(Boolean).join(" ").toLowerCase();
      return (!query || haystack.includes(query))
        && (statusFilter === "all" || member.status === statusFilter);
    });
  }, [team, search, statusFilter]);

  const metrics = useMemo(() => ({
    total: team.length,
    active: team.filter((member) => member.status === "active").length,
    pending: team.filter((member) => member.status === "pending").length,
    administrators: team.filter((member) => (member.roles || []).some((role) => role.slug === "administrator")).length,
  }), [team]);

  const totalPages = Math.max(1, Math.ceil(filteredTeam.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageTeam = filteredTeam.slice((safePage - 1) * pageSize, safePage * pageSize);
  const selectedRole = roles.find((role) => role.id === form.roleId);
  const isAdministrator = selectedRole?.slug === "administrator";

  function openInviteModal() {
    setForm(EMPTY_FORM);
    setMessage("");
    setErrorMessage("");
    setShowInviteModal(true);
  }

  function closeInviteModal() {
    if (!inviting) setShowInviteModal(false);
  }

  function chooseRole(roleId) {
    const role = roles.find((item) => item.id === roleId);
    setForm((current) => ({
      ...current,
      roleId,
      locationIds: role?.slug === "administrator" ? [] : current.locationIds,
    }));
  }

  function toggleLocation(locationId) {
    setForm((current) => ({
      ...current,
      locationIds: current.locationIds.includes(locationId)
        ? current.locationIds.filter((id) => id !== locationId)
        : [...current.locationIds, locationId],
    }));
  }

  async function inviteTeamMember(event) {
    event.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setErrorMessage("Add the team member’s first and last name.");
      return;
    }
    if (!form.email.trim()) {
      setErrorMessage("Add a valid work email address.");
      return;
    }
    if (!form.roleId) {
      setErrorMessage("Choose the person’s access role intentionally.");
      return;
    }
    if (!isAdministrator && locations.length > 0 && form.locationIds.length === 0) {
      setErrorMessage("Choose at least one venue, or select Administrator for full workspace access.");
      return;
    }

    setInviting(true);
    setErrorMessage("");
    try {
      const response = await authenticatedRequest("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || "Unable to invite team member.");
      setShowInviteModal(false);
      setForm(EMPTY_FORM);
      setMessage(`Invitation sent to ${form.email.trim()}.`);
      await loadData({ quiet: true });
    } catch (error) {
      console.error("TEAM INVITE ERROR:", error);
      setErrorMessage(error?.message || "Unable to invite team member.");
    } finally {
      setInviting(false);
    }
  }

  async function resendInvitation(member) {
    setResendingUserId(member.id);
    setMessage("");
    setErrorMessage("");
    try {
      const response = await authenticatedRequest("/api/team/resend-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: member.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || "Unable to resend access email.");
      setMessage(`A new secure access email was sent to ${member.email}.`);
    } catch (error) {
      console.error("TEAM INVITATION RESEND ERROR:", error);
      setErrorMessage(error?.message || "Unable to resend access email.");
    } finally {
      setResendingUserId("");
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#edf3ef] px-4 py-5 text-[#17372d] sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1580px] space-y-5">
        <section className="overflow-hidden rounded-[30px] border border-white/90 bg-[radial-gradient(circle_at_90%_10%,rgba(205,232,218,.82),transparent_35%),linear-gradient(135deg,rgba(255,255,255,.9),rgba(246,250,247,.72))] shadow-[0_24px_60px_rgba(25,58,47,.08)] backdrop-blur-xl">
          <div className="flex flex-col gap-6 px-6 py-7 lg:flex-row lg:items-center lg:justify-between lg:px-9">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.28em] text-[#66857a]">
                <ShieldCheckIcon className="h-4 w-4" />
                People & permissions
              </div>
              <h1 className="mt-3 text-[34px] font-semibold tracking-[-.045em] sm:text-[44px]">Team & Access</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6d837b]">
                Invite colleagues, assign operational roles and limit access to the venues they actually manage.
              </p>
              {workspace && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#d9e6e0] bg-white/70 px-3 py-2 text-xs text-[#4d685f]">
                  <BuildingStorefrontIcon className="h-4 w-4" />
                  {workspace.propertyName || workspace.organizationName || "Current workspace"}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
              {[
                ["People", metrics.total],
                ["Active", metrics.active],
                ["Invited", metrics.pending],
                ["Admins", metrics.administrators],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[20px] border border-white bg-white/66 px-4 py-3 shadow-sm">
                  <div className="text-[9px] font-semibold uppercase tracking-[.22em] text-[#81968e]">{label}</div>
                  <div className="mt-1 text-2xl font-semibold tracking-[-.04em]">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {(message || errorMessage) && (
          <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${errorMessage ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {errorMessage ? <ShieldCheckIcon className="mt-0.5 h-5 w-5 shrink-0" /> : <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />}
            <span>{errorMessage || message}</span>
          </div>
        )}

        <section className="rounded-[28px] border border-white/90 bg-white/65 shadow-[0_18px_50px_rgba(25,58,47,.07)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 border-b border-[#dae6e1] p-5 md:flex-row md:items-center md:justify-between lg:p-6">
            <div>
              <h2 className="text-xl font-semibold tracking-[-.025em]">Workspace team</h2>
              <p className="mt-1 text-xs text-[#789087]">Only people connected to this workspace are shown here.</p>
            </div>
            <button
              type="button"
              onClick={openInviteModal}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#17372d] px-5 text-xs font-semibold uppercase tracking-[.14em] text-white shadow-[0_12px_28px_rgba(23,55,45,.2)] transition hover:-translate-y-0.5 hover:bg-[#21483b]"
            >
              <PlusIcon className="h-5 w-5" />
              Invite team member
            </button>
          </div>

          <div className="flex flex-col gap-3 border-b border-[#e1eae6] p-4 md:flex-row md:items-center md:justify-between lg:px-6">
            <label className="relative block w-full md:max-w-xl">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#80958d]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search people, roles or venues"
                className="h-12 w-full rounded-2xl border border-[#d8e4df] bg-white/80 pl-12 pr-4 text-sm outline-none transition placeholder:text-[#9aaba5] focus:border-[#87a99c] focus:ring-4 focus:ring-[#dceae4]"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                ["all", "All", metrics.total],
                ["active", "Active", metrics.active],
                ["pending", "Invited", metrics.pending],
                ["inactive", "Inactive", team.filter((member) => member.status === "inactive").length],
              ].map(([value, label, count]) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  className={`rounded-full border px-4 py-2.5 text-xs font-medium transition ${statusFilter === value ? "border-[#17372d] bg-[#17372d] text-white" : "border-[#d9e4df] bg-white/70 text-[#60776e] hover:border-[#9ab5aa]"}`}
                >
                  {label} <span className="ml-1 opacity-65">{count}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => loadData({ quiet: true })}
                aria-label="Refresh team"
                className="grid h-10 w-10 place-items-center rounded-full border border-[#d9e4df] bg-white/70 text-[#60776e]"
              >
                <ArrowPathIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid min-h-[320px] place-items-center text-sm text-[#748980]">
              <div className="flex items-center gap-3"><ArrowPathIcon className="h-5 w-5 animate-spin" /> Loading workspace access…</div>
            </div>
          ) : pageTeam.length === 0 ? (
            <div className="grid min-h-[320px] place-items-center px-6 text-center">
              <div>
                <UserGroupIcon className="mx-auto h-10 w-10 text-[#8ba098]" />
                <h3 className="mt-3 text-lg font-semibold">No team members found</h3>
                <p className="mt-1 text-sm text-[#748980]">Try another search or invite the first person to this workspace.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[#e2ebe7]">
              {pageTeam.map((member) => {
                const roleNames = (member.roles || []).map((role) => role.name);
                const locationNames = (member.locations || []).map((location) => location.name);
                const status = member.status || "pending";
                return (
                  <article key={member.id} className="grid gap-4 px-5 py-5 transition hover:bg-white/55 lg:grid-cols-[minmax(280px,1.3fr)_minmax(180px,.7fr)_minmax(240px,1fr)_auto] lg:items-center lg:px-6">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#17372d] text-sm font-semibold text-white shadow-sm">{initials(member)}</div>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-[#18382e]">{displayName(member)}</div>
                        <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-[#789087]">
                          <EnvelopeIcon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{member.email}</span>
                        </div>
                        {(member.job_title || member.department) && <div className="mt-1 truncate text-xs text-[#8b9d96]">{[member.job_title, member.department].filter(Boolean).join(" · ")}</div>}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] font-semibold uppercase tracking-[.2em] text-[#8ba098]">Role</div>
                      <div className="mt-1.5 text-sm font-medium">{roleNames.join(", ") || "Role not assigned"}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-semibold uppercase tracking-[.2em] text-[#8ba098]">Venue access</div>
                      <div className="mt-1.5 line-clamp-2 text-sm text-[#5f766d]">
                        {(member.roles || []).some((role) => role.slug === "administrator") ? "All workspace venues" : locationNames.join(", ") || "No venues assigned"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 lg:justify-end">
                      {status === "pending" && (
                        <button
                          type="button"
                          onClick={() => resendInvitation(member)}
                          disabled={Boolean(resendingUserId)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#d9e4df] bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.1em] text-[#49675d] transition hover:border-[#9ab5aa] disabled:cursor-wait disabled:opacity-55"
                        >
                          <ArrowPathIcon className={`h-3.5 w-3.5 ${resendingUserId === member.id ? "animate-spin" : ""}`} />
                          {resendingUserId === member.id ? "Sending" : "Resend access"}
                        </button>
                      )}
                      <span className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.14em] ${STATUS_STYLE[status] || STATUS_STYLE.pending}`}>
                        {status}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-[#dfe9e5] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-[#789087]">
              Showing {filteredTeam.length ? (safePage - 1) * pageSize + 1 : 0}–{Math.min(safePage * pageSize, filteredTeam.length)} of {filteredTeam.length}
            </div>
            <div className="flex items-center gap-2">
              <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="h-10 rounded-xl border border-[#d7e3de] bg-white px-3 text-xs outline-none">
                {PAGE_SIZES.map((size) => <option key={size} value={size}>{size} per page</option>)}
              </select>
              <button type="button" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="grid h-10 w-10 place-items-center rounded-xl border border-[#d7e3de] bg-white disabled:opacity-35"><ChevronLeftIcon className="h-4 w-4" /></button>
              <div className="min-w-14 text-center text-xs">{safePage} / {totalPages}</div>
              <button type="button" disabled={safePage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="grid h-10 w-10 place-items-center rounded-xl border border-[#d7e3de] bg-white disabled:opacity-35"><ChevronRightIcon className="h-4 w-4" /></button>
            </div>
          </div>
        </section>
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#0d211b]/55 p-3 backdrop-blur-md sm:p-6" onMouseDown={closeInviteModal}>
          <form onSubmit={inviteTeamMember} onMouseDown={(event) => event.stopPropagation()} className="flex max-h-[calc(100dvh-24px)] w-full max-w-4xl flex-col overflow-hidden rounded-[30px] border border-white/80 bg-[#f7faf8] shadow-[0_35px_100px_rgba(8,27,21,.34)] sm:max-h-[calc(100dvh-48px)]">
            <div className="flex items-start justify-between border-b border-[#dce7e2] px-6 py-5 sm:px-8 sm:py-6">
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-[.26em] text-[#6d887e]">Secure workspace invitation</div>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-.035em] text-[#17372d] sm:text-3xl">Invite a team member</h2>
                <p className="mt-1.5 max-w-2xl text-sm text-[#71867e]">They will receive a private email, create their password and only see the access you assign here.</p>
              </div>
              <button type="button" onClick={closeInviteModal} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#d6e2dd] bg-white text-[#597168]"><XMarkIcon className="h-5 w-5" /></button>
            </div>

            <div className="overflow-y-auto overscroll-contain px-6 py-5 sm:px-8 sm:py-6">
              <div className="grid gap-6 lg:grid-cols-[1fr_.9fr]">
                <section className="space-y-4">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#718a81]">1 · Person</div>
                    <p className="mt-1 text-xs text-[#8a9d96]">Use their professional details so the invitation is clear.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-medium">First name<input required value={form.firstName} onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))} className="mt-2 h-12 w-full rounded-2xl border border-[#d6e2dd] bg-white px-4 text-sm outline-none focus:border-[#83a698] focus:ring-4 focus:ring-[#dfece7]" /></label>
                    <label className="text-xs font-medium">Last name<input required value={form.lastName} onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))} className="mt-2 h-12 w-full rounded-2xl border border-[#d6e2dd] bg-white px-4 text-sm outline-none focus:border-[#83a698] focus:ring-4 focus:ring-[#dfece7]" /></label>
                  </div>
                  <label className="block text-xs font-medium">Work email<input required type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="name@hotel.com" className="mt-2 h-12 w-full rounded-2xl border border-[#d6e2dd] bg-white px-4 text-sm outline-none placeholder:text-[#a4b2ad] focus:border-[#83a698] focus:ring-4 focus:ring-[#dfece7]" /></label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-medium">Job title<input value={form.jobTitle} onChange={(event) => setForm((current) => ({ ...current, jobTitle: event.target.value }))} placeholder="Head Sommelier" className="mt-2 h-12 w-full rounded-2xl border border-[#d6e2dd] bg-white px-4 text-sm outline-none placeholder:text-[#a4b2ad] focus:border-[#83a698]" /></label>
                    <label className="text-xs font-medium">Department<input value={form.department} onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))} className="mt-2 h-12 w-full rounded-2xl border border-[#d6e2dd] bg-white px-4 text-sm outline-none focus:border-[#83a698]" /></label>
                  </div>
                  <label className="block text-xs font-medium">Phone <span className="font-normal text-[#91a19b]">(optional)</span><input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className="mt-2 h-12 w-full rounded-2xl border border-[#d6e2dd] bg-white px-4 text-sm outline-none focus:border-[#83a698]" /></label>
                </section>

                <section className="space-y-4 rounded-[24px] border border-[#d9e5df] bg-white/70 p-5">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#718a81]">2 · Permissions</div>
                    <p className="mt-1 text-xs text-[#8a9d96]">Choose the minimum access needed. Administrator grants the entire workspace.</p>
                  </div>
                  <label className="block text-xs font-medium">Role
                    <select required value={form.roleId} onChange={(event) => chooseRole(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-[#d6e2dd] bg-white px-4 text-sm outline-none focus:border-[#83a698]">
                      <option value="">Choose a role intentionally</option>
                      {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                    </select>
                  </label>
                  {selectedRole && (
                    <div className={`rounded-2xl border p-3 text-xs leading-5 ${isAdministrator ? "border-amber-200 bg-amber-50 text-amber-800" : "border-[#d9e6e0] bg-[#f2f7f4] text-[#5f776e]"}`}>
                      <strong>{selectedRole.name}.</strong> {selectedRole.description || (isAdministrator ? "Full access to every venue and administrative area." : "Access is limited to the selected venues.")}
                    </div>
                  )}
                  <div className={isAdministrator ? "pointer-events-none opacity-40" : ""}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-medium">Venue access</div>
                      <div className="flex gap-2 text-[10px] font-semibold uppercase tracking-[.1em]">
                        <button type="button" onClick={() => setForm((current) => ({ ...current, locationIds: locations.map((location) => location.id) }))} className="text-[#3e6d5d]">Select all</button>
                        <button type="button" onClick={() => setForm((current) => ({ ...current, locationIds: [] }))} className="text-[#899b94]">Clear</button>
                      </div>
                    </div>
                    <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-2xl border border-[#dce6e2] bg-white p-2">
                      {locations.length ? locations.map((location) => (
                        <label key={location.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-xs transition hover:bg-[#edf5f1]">
                          <input type="checkbox" checked={form.locationIds.includes(location.id)} onChange={() => toggleLocation(location.id)} className="h-4 w-4 accent-[#17372d]" />
                          <span>{location.name}</span>
                        </label>
                      )) : <div className="px-3 py-4 text-xs text-[#8b9d96]">No venue locations configured.</div>}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-[#17372d] p-4 text-white">
                    <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[.2em] text-white/60"><EnvelopeIcon className="h-4 w-4" /> Invitation preview</div>
                    <p className="mt-2 text-sm leading-5">{form.email || "The team member"} will be invited to {workspace?.propertyName || workspace?.organizationName || "this workspace"} as {selectedRole?.name || "the role you select"}.</p>
                  </div>
                </section>
              </div>
              {errorMessage && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[#dce7e2] bg-white/70 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <p className="text-xs text-[#82968e]">No account is active until the recipient accepts the email invitation.</p>
              <div className="flex gap-2">
                <button type="button" onClick={closeInviteModal} className="h-11 rounded-full border border-[#d3dfda] bg-white px-5 text-xs font-semibold">Cancel</button>
                <button type="submit" disabled={inviting} className="inline-flex h-11 items-center gap-2 rounded-full bg-[#17372d] px-5 text-xs font-semibold text-white disabled:opacity-50">
                  {inviting && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
                  {inviting ? "Sending…" : "Send invitation"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
