import "server-only";

export async function fetchAllRows(supabase, table, columns, configure) {
  const rows = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    let query = supabase
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1);
    if (configure) query = configure(query);

    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data ?? []).length < pageSize) return rows;
  }
}
