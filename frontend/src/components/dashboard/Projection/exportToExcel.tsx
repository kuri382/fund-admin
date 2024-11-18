import * as XLSX from "xlsx";

interface ExportData {
  rows: any[];
  sortedColumns: { year: number; month: number }[];
}

/**
 * テーブルデータをエクセルファイルにエクスポートする関数
 * @param data - エクスポートする行データ
 * @param sortedColumns - 列情報（年月の順番）
 * @param fileName - 出力するエクセルファイル名
 */
export const exportToExcel = (
  { rows, sortedColumns }: ExportData,
  fileName: string = "PLMetricsTable.xlsx"
) => {
  // データを整形
  const excelData = rows.map((row) => {
    const formattedRow: Record<string, any> = { "項目": row.title };

    sortedColumns.forEach(({ year, month }) => {
      const key = `${year}-${month}`;
      formattedRow[`${year}年${month}月`] = row[key]?.displayValue || "";
    });

    return formattedRow;
  });

  // ワークブックを作成
  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "PLMetrics");

  // ファイルをエクスポート
  XLSX.writeFile(workbook, fileName);
};
