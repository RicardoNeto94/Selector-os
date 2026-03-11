import "../../../styles/guest.css";

export default function PublicLayout({ children }) {
  return (
    <html>
      <body
        style={{
          margin: 0,
          padding: 0,
          background: "#020617",
          color: "white"
        }}
      >
        {children}
      </body>
    </html>
  );
}
