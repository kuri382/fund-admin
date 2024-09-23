// /pages/dashboard/index.tsx
"use client";

import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import ExcelAnalysis from '@/components/dashboard/ExcelAnalysis';

const Dashboard = () => {
  return (
    <ProtectedRoute>
      <ExcelAnalysis />
    </ProtectedRoute>
  );
};

export default Dashboard;
