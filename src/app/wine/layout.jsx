export default function WineLayout({ children }) {
  return (
    <div
      className="
        fixed
        inset-0
        h-[100dvh]
        w-screen
        overflow-hidden
        bg-[#00140e]
      "
      style={{
        color: "#ffffff",
        overscrollBehavior: "none",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {children}
    </div>
  );
}
