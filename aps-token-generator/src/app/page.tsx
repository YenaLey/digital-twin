"use client";

import { useState, useEffect } from "react";
import { FiGithub } from "react-icons/fi";
import TwoLeggedForm from "@/components/TwoLeggedForm";
import ThreeLeggedForm from "@/components/ThreeLeggedForm";

export default function Home() {
  const [flow, setFlow] = useState<"twolegged" | "threelegged">("twolegged");
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasToken) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasToken]);

  const handleFlowChange = (newFlow: "twolegged" | "threelegged") => {
    if (newFlow === flow) return;
    if (hasToken) {
      if (!confirm("모든 내용이 사라집니다. 정말 바꾸시겠습니까?")) {
        return;
      }
      setHasToken(false);
    }
    setFlow(newFlow);
  };

  return (
    <div className="relative min-h-screen bg-blue-50 text-blue-900 p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">APS Token Generator</h1>
        <a
          href="https://github.com/YenaLey/aps-token-generator"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-600 hover:text-gray-900"
        >
          <FiGithub size={28} />
        </a>
      </header>

      <div className="flex space-x-4 mb-8">
        <button
          onClick={() => handleFlowChange("twolegged")}
          className={`px-5 py-2 rounded-lg font-medium transition ${
            flow === "twolegged"
              ? "bg-blue-600 text-white shadow"
              : "bg-white text-blue-600 border border-blue-600 hover:bg-blue-50"
          }`}
        >
          2-Legged Flow
        </button>
        <button
          onClick={() => handleFlowChange("threelegged")}
          className={`px-5 py-2 rounded-lg font-medium transition ${
            flow === "threelegged"
              ? "bg-blue-600 text-white shadow"
              : "bg-white text-blue-600 border border-blue-600 hover:bg-blue-50"
          }`}
        >
          3-Legged Flow
        </button>
      </div>

      <main className="bg-white rounded-lg shadow p-6">
        {flow === "twolegged" ? (
          <TwoLeggedForm onTokenSet={() => setHasToken(true)} />
        ) : (
          <ThreeLeggedForm onTokenSet={() => setHasToken(true)} />
        )}
      </main>
    </div>
  );
}
