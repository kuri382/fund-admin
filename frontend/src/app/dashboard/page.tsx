"use client";

import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AnalysisComponents from '@/components/dashboard/TableAnalysis/Main';
import Navbar from '@/components/navbar/Navbar';

const ExcelAnalyzer = () => {
  return (
    <ProtectedRoute>
      <Navbar />
      <AnalysisComponents />
    </ProtectedRoute>
  );
};

export default ExcelAnalyzer;
