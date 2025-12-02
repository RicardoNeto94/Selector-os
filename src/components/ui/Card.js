// src/components/ui/Card.js
export default function Card({ children, className = "" }) {
  return (
    <div
      className={
        "rounded-2xl bg-slate-950/70 border border-white/10 shadow-[0_18px_45px_rgba(0,0,0,0.45)] backdrop-blur-xl p-6 " +
        className
      }
    >
      {children}
    </div>
  );
}
