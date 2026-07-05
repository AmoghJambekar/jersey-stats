import ColorDots from './ColorDots';

export default function StatsTable({ columns, rows, footerRow }) {
  if (!rows || rows.length === 0) {
    return <p className="text-gray-500">No stats available.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 font-medium">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3">
                  {col.key === 'color_tags' ? (
                    <ColorDots colors={row[col.key]} />
                  ) : col.format ? (
                    col.format(row[col.key], row)
                  ) : (
                    row[col.key]
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footerRow && (() => {
          // Compute colSpan groups for footer: merge consecutive columns whose footer value is the same non-empty string
          const cells = [];
          let i = 0;
          while (i < columns.length) {
            const col = columns[i];
            const val = footerRow[col.key];
            // Check if next columns have the same string value to merge
            let span = 1;
            if (typeof val === 'string' && val) {
              while (i + span < columns.length && footerRow[columns[i + span].key] === val) {
                span++;
              }
            }
            cells.push({ col, val, span });
            i += span;
          }
          return (
            <tfoot className="bg-gray-100 font-semibold border-t-2 border-gray-300">
              <tr>
                {cells.map(({ col, val, span }) => (
                  <td key={col.key} className="px-4 py-3" colSpan={span > 1 ? span : undefined}>
                    {col.format && val != null && typeof val === 'number'
                      ? col.format(val, footerRow)
                      : val ?? ''}
                  </td>
                ))}
              </tr>
            </tfoot>
          );
        })()}
      </table>
    </div>
  );
}
