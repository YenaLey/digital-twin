"use client";

import Link from "next/link";
import { Suspense } from "react";
import ThreeLeggedForm from "../../../components/ThreeLeggedForm";

export default function CallbackPage() {
  const handleTokenSet = () => {};

  const confirmAndNavigateHome = (e: React.MouseEvent) => {
    e.preventDefault();
    const ok = confirm(
      "모든 내용이 사라집니다. 정말 페이지를 이동하시겠습니까?"
    );
    if (ok) {
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg relative">
        <Link
          href="/"
          onClick={confirmAndNavigateHome}
          className="absolute top-4 right-4 text-blue-600 hover:underline"
        >
          ← Home
        </Link>

        <h2 className="text-2xl font-semibold mb-4">OAuth Callback</h2>
        <Suspense fallback={<div>Loading...</div>}>
          <ThreeLeggedForm onTokenSet={handleTokenSet} />
        </Suspense>
      </div>
    </div>
  );
}
