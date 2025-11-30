export default function PublicLayout({ children }) {
  return (
    <html>
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
