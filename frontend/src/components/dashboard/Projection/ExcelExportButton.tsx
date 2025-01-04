import React from "react";
import { Button } from "antd";
import { exportToExcel } from "./exportToExcel";
import { FileTextOutlined } from '@ant-design/icons';

interface ExcelExportButtonProps {
    rows: any[];
    sortedColumns: { year: number; month: number }[];
}

const ExcelExportButton: React.FC<ExcelExportButtonProps> = ({
    rows,
    sortedColumns,
}) => {
    const handleExport = () => {
        exportToExcel({ rows, sortedColumns }, "PLMetricsTable.xlsx");
    };

    return (
        <Button
            onClick={handleExport}
            type="primary"
            style={{ marginBottom: "16px" }}
            icon={<FileTextOutlined />}
            >
            エクセルに出力
        </Button>
    );
};

export default ExcelExportButton;
