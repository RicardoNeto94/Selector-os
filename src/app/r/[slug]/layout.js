import "../../../styles/guest.css";

export default function PublicLayout({ children }) {
  return (
    <div
      style={{
        margin: 0,
        padding: 0,
        minHeight: "100vh",
        background: "#020617",
        color: "white",
      }}
    >
      {children}
    </div>
  );
}