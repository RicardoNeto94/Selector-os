"use client";

export default function GlobalError({ error, reset }) {

  console.error(error);

  return (
    <html>
      <body style={{
        fontFamily: "Inter, sans-serif",
        background: "#0f1115",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        flexDirection: "column",
        gap: "16px"
      }}>

        <h2>Something went wrong.</h2>

        <button
          onClick={() => reset()}
          style={{
            padding: "10px 16px",
            background: "#3b82f6",
            border: "none",
            borderRadius: "8px",
            color: "white",
            cursor: "pointer"
          }}
        >
          Try again
        </button>

      </body>
    </html>
  );
}