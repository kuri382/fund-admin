export interface Item {
    value: string;
    url: string;
  }

export interface Param {
  key: string;
  title: string;
  values: Item[];
}

export interface Row {
  period: {
    year: number;
    month: number;
  };
  pageNumber: number;
  items: Param[];
}

export interface PLMetricsResponse {
  rows: Row[];
}

interface CellData {
  displayValue: string; // 表示される値
  candidates: Item[]; // 候補の値とそのURL
  isDuplicate: boolean; // 重複フラグ
}
