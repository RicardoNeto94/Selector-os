export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8 py-10">
      <main className="w-full max-w-md text-center">
        <h1 className="mb-10 text-5xl font-bold">
          Selector<span className="font-black text-green-400">OS</span>
        </h1>
        {children}
      </main>
    </div>
  );
}
