export default function Loading() {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-[#f7f3ed] px-6 text-[#26322f]"
      role="status"
      aria-live="polite"
      aria-label="Preparing Vaxeron"
    >
      <div className="flex flex-col items-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[#d9cec4] bg-[#fbf8f3] shadow-[0_18px_50px_rgba(55,42,34,0.06)]">
          <img
            src="/selectoros-logo.png"
            alt=""
            className="h-7 w-7 object-contain"
          />
        </div>

        <div className="mt-5 text-[11px] font-medium uppercase tracking-[0.42em] text-[#26322f]">
          Vaxeron
        </div>

        <div className="mt-4 h-px w-24 overflow-hidden bg-[#ddd3ca]">
          <div className="h-full w-1/2 animate-pulse bg-[#b98a3d]" />
        </div>

        <p className="mt-3 text-[8px] uppercase tracking-[0.22em] text-[#9a8d84]">
          Preparing your workspace
        </p>
      </div>
    </main>
  );
}
