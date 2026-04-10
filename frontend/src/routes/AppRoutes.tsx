import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "../pages/Home";
import StockDetail from "../pages/StockDetail";
import Layout from "../layouts/Layout";
import Markets from "../pages/Markets";
import Prediction from "../pages/Prediction";
import Portfolio from "../pages/Portfolio";
import Screener from "../pages/Screener";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="stock/:symbol" element={<StockDetail />} />
        <Route path="markets" element={<Markets />} />
        <Route path="market/gold" element={<Navigate to="/stock/GOLD" replace />} />
        <Route path="market/btc" element={<Navigate to="/stock/BTC" replace />} />
        <Route path="prediction" element={<Prediction />} />
        <Route path="portfolio" element={<Portfolio />} />
        <Route path="screener" element={<Screener />} />
      </Route>
    </Routes>
  );
}
