import React from 'react';
import FinancialTable from '@/components/dashboard/Generator/generateBusinessPlan';
import ImageListComponent from '@/components/dashboard/Generator/ImageListComponent';

const GenerateBusinessPlanPage: React.FC = () => {
    return (
        <div style={{ textAlign: 'center', padding: '50px' }}>
            <FinancialTable />
            <ImageListComponent />
        </div>
    );
};

export default GenerateBusinessPlanPage;
