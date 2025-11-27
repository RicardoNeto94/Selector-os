// src/components/ui/Card.js
export default function Card({ children, className = "" }) {
  return (
    <div
      className={
        "bg-white rounded-xl3 shadow-soft p-5 md:p-6 transition hover:shadow-card " +
        className
      }
    >
      {children}
    </div>
  );
}
