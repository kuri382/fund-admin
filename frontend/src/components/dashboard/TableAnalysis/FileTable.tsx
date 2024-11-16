import React from 'react';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';

interface FileTableProps {
  data: Record<string, any>[];
}

interface TableDataType extends Record<string, any> {
  key: string;
}

const renderInvisibleUnnamed = (text: string): React.ReactNode => {
  return (
    <span>
      {text.split(/(\bUnnamed:\s*\d+\b)/).map((part, index) =>
        part.match(/\bUnnamed:\s*\d+\b/) ? (
          <span key={`unnamed-${index}`} style={{ color: 'transparent' }}>
            {part}
          </span>
        ) : (
          <React.Fragment key={`text-${index}`}>
            {part}
          </React.Fragment>
        )
      )}
    </span>
  );
};

const FileTable: React.FC<FileTableProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <p>データがありません</p>;
  }

  // データソースに一意のキーを追加
  const dataSource: TableDataType[] = data.map((item, index) => ({
    ...item,
    key: item.id || `table-row-${index}`,
  }));

  // カラムの定義
  const columns: ColumnsType<TableDataType> = Object.keys(data[0])
    .filter(key => key !== 'key') // キーフィールドは除外
    .map((key) => ({
      title: typeof key === 'string' ? renderInvisibleUnnamed(key) : key,
      dataIndex: key,
      key: `col-${key}`,
      render: (text: any) => {
        if (text === null || text === undefined) {
          return '-';
        }
        return typeof text === 'string' ?
          renderInvisibleUnnamed(text) :
          String(text);
      },
      // 必要に応じてカラムの幅を調整
      ellipsis: true,
    }));

  return (
    <Table
      dataSource={dataSource}
      columns={columns}
      pagination={false}
      size="small"
      style={{
        fontSize: '10px',
      }}
      className="compact-table"
      scroll={{ x: 'max-content' }} // 横スクロールを有効化
    />
  );
};

export default FileTable;
