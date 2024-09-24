import React from 'react';
import { Table } from 'antd';

interface FileTableProps {
  data: any[];
}

const renderInvisibleUnnamed = (text: string) => {
  return (
    <span>
      {text.split(/(\bUnnamed:\s*\d+\b)/).map((part, index) =>
        part.match(/\bUnnamed:\s*\d+\b/) ? (
          <span key={index} style={{ color: 'transparent' }}>
            {part}
          </span>
        ) : (
          part
        )
      )}
    </span>
  );
};

const FileTable: React.FC<FileTableProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <p>データがありません</p>;
  }

  const columns = Object.keys(data[0]).map((key) => ({
    title: renderInvisibleUnnamed(key),
    dataIndex: key,
    key,
    render: (text: string) => renderInvisibleUnnamed(text?.toString() || '-'),
  }));

  return (
    <Table
      dataSource={data}
      columns={columns}
      pagination={false}
      size="small"
      style={{
        fontSize: '10px',
      }}
      className="compact-table"
    />
  );
};

export default FileTable;
