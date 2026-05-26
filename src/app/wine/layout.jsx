export default function WineLayout({ children }) {
  return (
    <div
      className="
        h-[100dvh]
        w-full
        overflow-hidden
        fixed
        inset-0
      "
      style={{
        background: `
          radial-gradient(
            circle at top,
            rgba(201,169,106,.08),
            transparent 35%
          ),
          linear-gradient(
            180deg,
            #003223 0%,
            #001a12 100%
          )
        `,
        color:"#ffffff",

        paddingTop:"max(env(safe-area-inset-top),20px)",
        paddingBottom:"max(env(safe-area-inset-bottom),20px)",
        paddingLeft:"max(env(safe-area-inset-left),16px)",
        paddingRight:"max(env(safe-area-inset-right),16px)",

        overscrollBehavior:"none",
        WebkitOverflowScrolling:"touch",
        touchAction:"none"
      }}
    >
      {children}
    </div>
  );
}