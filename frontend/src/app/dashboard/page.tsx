"use client";

import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
//import ExcelAnalysis from '@/components/dashboard/ExcelAnalysis';
import SimpleAnalysis from '@/components/dashboard/TableAnalysis/AnalysisComponents';
import Navbar from '@/components/Navbar/Navbar';

const ExcelAnalyzer = () => {
  return (
    <ProtectedRoute>
      <Navbar />
      <SimpleAnalysis />
    </ProtectedRoute>
  );
};

export default ExcelAnalyzer;
