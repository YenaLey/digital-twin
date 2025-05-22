"use client";

import { useState } from "react";
import KpiCard from "@/components/KpiCard";
import EndUseChart from "@/components/EndUseChart";
import PeakLoadBar from "@/components/PeakLoadBar";
import { sectionFields, defaultValues } from "@/lib/formValues";

export default function Page() {
  const [data, setData] = useState<ReportRaw | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setData(null);
    try {
      const fd = new FormData(e.currentTarget);

      // 1) 시뮬레이션
      const simRes = await fetch("/api/simulate", {
        method: "POST",
        body: fd,
      });
      const simJson = await simRes.json();
      if (!simRes.ok) throw new Error(simJson.error || "Simulation failed");
      const htmlReport: string = simJson.report;

      // 2) 리포트 파싱
      const repRes = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "text/html" },
        body: htmlReport,
      });
      if (!repRes.ok) {
        const txt = await repRes.text();
        throw new Error(txt || "Report parsing failed");
      }
      const repJson = (await repRes.json()) as ReportRaw;

      setData(repJson);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full px-2 py-1 bg-white text-black border-0 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";
  const sectionWrapperCls =
    "w-full flex flex-wrap gap-6 justify-between items-start bg-gray-100 p-6 rounded-xl shadow-inner";
  const sectionCls = "w-[400px]";

  return (
    <main className="mx-auto p-6 space-y-6 bg-white min-h-screen text-black flex flex-col items-center">
      <h1 className="text-4xl font-extrabold text-blue-600">StudioX</h1>
      <div className={sectionWrapperCls}>
        {/* ——— FORM ——— */}
        <form className="flex flex-wrap gap-11" onSubmit={onSubmit}>
          {/* gbXML Upload */}
          <section className={sectionCls}>
            <label className="block mb-1 font-medium text-blue-600">
              원본 gbXML 파일
            </label>
            <input
              type="file"
              name="gbxml"
              accept=".xml"
              required
              className={inputCls}
            />
          </section>

          {Object.entries(sectionFields).map(([sectionName, fields]) => (
            <section key={sectionName} className={sectionCls}>
              <h2 className="text-lg font-semibold text-blue-600">
                {sectionName}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {fields.map(({ name, label }) => (
                  <div key={name} className={`flex flex-col`}>
                    <label className="text-xs font-medium text-gray-600">
                      {label}
                    </label>
                    <input
                      name={name}
                      defaultValue={defaultValues[name] || ""}
                      className={inputCls}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
          >
            {busy ? "Running…" : "Run Simulation"}
          </button>
        </form>
      </div>

      {/* 에러 */}
      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* ——— DASHBOARD ——— */}
      {data &&
        (() => {
          const bp = data.building_performance;
          const deuc = data.demand_end_use_components;
          const seuc = data.source_energy_end_use_components_summary;
          const hvac = data.hvac_sizing_summary;
          const light = data.lighting_summary;
          const co2 = data.co2_resilience_summary;

          // 계산 보조
          const totalSite = bp.site_and_source_energy.total_site_energy_gj;
          const areaTotal = bp.building_area_m2.total;
          const eui =
            areaTotal > 0 ? +((totalSite * 1000) / areaTotal).toFixed(1) : 0;

          // end-use 합계 (GJ)
          const endUsesSum: Record<string, number> = {};
          for (const [cat, fuels] of Object.entries(bp.end_uses_gj)) {
            endUsesSum[cat] = Object.values(fuels).reduce((a, b) => a + b, 0);
          }

          // peak loads kW
          const sumKilo = (o?: Record<string, number>) =>
            o ? Object.values(o).reduce((a, b) => a + b, 0) / 1000 : 0;
          const peakLoads = {
            heating: sumKilo(deuc.peak_demand_w["Heating"]),
            cooling: sumKilo(deuc.peak_demand_w["Cooling"]),
          };

          return (
            <section className="mt-10 w-full space-y-8">
              <h2 className="text-2xl font-bold text-blue-600 border-b pb-2">
                Simulation Dashboard
              </h2>
              {/* 1. Site & Source Energy */}
              <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard
                  label="Total Site Energy"
                  value={totalSite.toFixed(1)}
                  unit="GJ"
                />
                <KpiCard
                  label="Net Site Energy"
                  value={bp.site_and_source_energy.net_site_energy_gj.toFixed(
                    1
                  )}
                  unit="GJ"
                />
                <KpiCard
                  label="Total Source Energy"
                  value={bp.site_and_source_energy.total_source_energy_gj.toFixed(
                    1
                  )}
                  unit="GJ"
                />
                <KpiCard
                  label="Net Source Energy"
                  value={bp.site_and_source_energy.net_source_energy_gj.toFixed(
                    1
                  )}
                  unit="GJ"
                />
              </section>

              {/* 2. Conversion Factors */}
              <section>
                <h2 className="text-xl font-semibold mb-2">
                  Conversion Factors
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full table-auto border">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border px-2 py-1">Fuel</th>
                        <th className="border px-2 py-1">Factor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(bp.site_to_source_conversion_factors).map(
                        ([k, v]) => (
                          <tr key={k}>
                            <td className="border px-2 py-1">{k}</td>
                            <td className="border px-2 py-1">{v}</td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* 3. Building Area & EUI */}
              <section className="grid grid-cols-3 gap-4">
                <KpiCard label="Total Area" value={areaTotal} unit="m²" />
                <KpiCard
                  label="Conditioned Area"
                  value={bp.building_area_m2.conditioned}
                  unit="m²"
                />
                <KpiCard label="EUI" value={eui} unit="MJ/m²" />
              </section>

              {/* 4. Annual End‐Use */}
              <section>
                <h2 className="text-xl font-semibold mb-2">
                  Annual End‐Use (GJ)
                </h2>
                <EndUseChart data={endUsesSum} />
              </section>

              {/* 5. Peak Demand */}
              <section className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded">
                  <h3 className="font-medium mb-2">Peak Demand (kW)</h3>
                  <PeakLoadBar data={peakLoads} />
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">
                    Demand by Subcategory (kW)
                  </h3>
                  <EndUseChart
                    data={Object.fromEntries(
                      Object.entries(deuc.by_subcategory_w).map(
                        ([cat, fuels]) => [cat, sumKilo(fuels)]
                      )
                    )}
                  />
                </div>
              </section>

              {/* 6. Source Energy End‐Use Components */}
              <section>
                <h2 className="text-xl font-semibold mb-2">
                  {seuc.report_name}
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full table-auto border text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border px-2 py-1">Category</th>
                        {seuc.end_uses[0] &&
                          Object.keys(seuc.end_uses[0].values).map((h) => (
                            <th key={h} className="border px-2 py-1">
                              {h}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {seuc.end_uses.map((row, i) => (
                        <tr key={i}>
                          <td className="border px-2 py-1">{row.category}</td>
                          {Object.values(row.values).map((v, j) => (
                            <td key={j} className="border px-2 py-1">
                              {v ?? "-"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* 7. HVAC Sizing Summary */}
              <section>
                <h2 className="text-xl font-semibold mb-2">
                  HVAC Sizing Summary
                </h2>
                <div className="space-y-4 text-sm">
                  {(
                    [
                      ["Space Sensible Cooling", hvac.space_sensible_cooling],
                      ["Zone Sensible Cooling", hvac.zone_sensible_cooling],
                      ["Space Sensible Heating", hvac.space_sensible_heating],
                      ["Zone Sensible Heating", hvac.zone_sensible_heating],
                      [
                        "System Design Air Flow Rates",
                        hvac.system_design_air_flow_rates,
                      ],
                      [
                        "Plant Loop Adjustments",
                        hvac.plant_loop_coincident_design_fluid_flow_rate_adjustments,
                      ],
                      ["Coil Sizing Summary", hvac.coil_sizing_summary],
                    ] as const
                  ).map(([title, rows]) => (
                    <div key={title}>
                      <h3 className="font-medium">{title}</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full table-auto border">
                          <thead>
                            <tr className="bg-gray-100">
                              {rows[0] &&
                                Object.keys(rows[0]).map((h) => (
                                  <th key={h} className="border px-1 py-1">
                                    {h}
                                  </th>
                                ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r, i) => (
                              <tr key={i}>
                                {Object.values(r).map((v, j) => (
                                  <td key={j} className="border px-1 py-1">
                                    {v == null
                                      ? "-"
                                      : typeof v === "object"
                                      ? JSON.stringify(v)
                                      : String(v)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 8. Lighting Summary */}
              <section>
                <h2 className="text-xl font-semibold mb-2">Lighting Summary</h2>
                {(
                  [
                    "interior_lighting",
                    "daylighting",
                    "exterior_lighting",
                  ] as const
                ).map((key) => (
                  <div key={key} className="mb-4">
                    <h3 className="font-medium">{key.replace(/_/g, " ")}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full table-auto border text-sm">
                        <thead>
                          <tr className="bg-gray-100">
                            {light[key][0] &&
                              Object.keys(light[key][0]).map((h) => (
                                <th key={h} className="border px-2 py-1">
                                  {h}
                                </th>
                              ))}
                          </tr>
                        </thead>
                        <tbody>
                          {light[key].map((r, i) => (
                            <tr key={i}>
                              {Object.values(r).map((v, j) => (
                                <td key={j} className="border px-1 py-1">
                                  {v == null
                                    ? "-"
                                    : typeof v === "object"
                                    ? JSON.stringify(v)
                                    : String(v)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </section>

              {/* 9. CO₂ Resilience */}
              <section className="grid grid-cols-3 gap-4">
                {(
                  [
                    "co2_level_hours",
                    "co2_level_occupanthours",
                    "co2_level_occupiedhours",
                  ] as const
                ).map((key) => {
                  const obj = co2[key];
                  return (
                    <div key={key} className="p-4 bg-gray-50 rounded">
                      <h3 className="font-medium">{key.replace(/_/g, " ")}</h3>
                      <KpiCard
                        label="Safe (≤1000ppm)"
                        value={obj.safe_hours}
                        unit="hr"
                      />
                      <KpiCard
                        label="Caution (1001–5000ppm)"
                        value={obj.caution_hours}
                        unit="hr"
                      />
                      <KpiCard
                        label="Hazard (>5000ppm)"
                        value={obj.hazard_hours}
                        unit="hr"
                      />
                    </div>
                  );
                })}
              </section>
            </section>
          );
        })()}
    </main>
  );
}
