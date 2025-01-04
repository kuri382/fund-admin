"use client";

import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
//import ExcelAnalysis from '@/components/dashboard/ExcelAnalysis';
import AnalysisComponents from '@/components/dashboard/TableAnalysis/AnalysisComponents';
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
