export default function RestaurantPublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-white">
      <main className="w-full max-w-4xl mx-auto py-10 px-6">
        {children}
      </main>
    </div>
  );
}
