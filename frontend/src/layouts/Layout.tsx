import React from "react";
import { Outlet } from "react-router-dom";
import Header from "../components/header/Header";

export default function Layout(): JSX.Element {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <Header />
      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
}
