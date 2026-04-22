export default function WineLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#f8f6f1] text-[#1c1c1c] flex flex-col items-center px-6 pt-12 pb-20">
      {children}
    </div>
  );
}