export default function ServiceMenuView({ menu, categories, items }) {

  return (
    <main className="min-h-screen bg-[#0b0d10] text-white px-6 py-10">

      {/* HEADER */}
      <div className="max-w-5xl mx-auto mb-10">

        <h1 className="text-3xl font-semibold">
          {menu.name}
        </h1>

        <p className="text-sm text-slate-400 mt-1">
          Services
        </p>

      </div>

      {/* CONTENT */}
      <div className="max-w-5xl mx-auto space-y-10">

        {categories.map(cat => {

          const catItems = items.filter(i => i.category_id === cat.id);

          return (
            <div key={cat.id}>

              {/* CATEGORY */}
              <h2 className="text-lg font-semibold mb-4 border-b border-white/10 pb-2">
                {cat.name}
              </h2>

              {/* ITEMS */}
              <div className="space-y-4">

                {catItems.map(item => (
                  <div
                    key={item.id}
                    className="flex justify-between items-start border-b border-white/5 pb-3"
                  >

                    <div>
                      <div className="text-base font-medium">
                        {item.name}
                      </div>

                      {item.description && (
                        <div className="text-sm text-slate-400 mt-1">
                          {item.description}
                        </div>
                      )}
                    </div>

                    <div className="text-[#c9a96a] font-medium">
                      €{item.price}
                    </div>

                  </div>
                ))}

              </div>

            </div>
          );
        })}

      </div>

    </main>
  );
}