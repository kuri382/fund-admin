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
