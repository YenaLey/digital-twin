// pages/api/report.ts

import { NextResponse } from "next/server";
import {
  extractNumber,
  extractSectionTable,
  extractRows,
  extractCells,
} from "@/lib/htmlParser";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const html = await req.text();
    const fuels = [
      "Electricity",
      "Natural Gas",
      "Gasoline",
      "Diesel",
      "Coal",
      "Fuel Oil No 1",
      "Fuel Oil No 2",
      "Propane",
      "Other Fuel 1",
      "Other Fuel 2",
      "District Cooling",
      "District Heating Water",
      "District Heating Steam",
      "Water",
    ];

    // 1) Building Performance
    const parseBuildingPerformance = () => {
      // Site & Source Energy
      const siteTable = extractSectionTable(html, "Site and Source Energy");
      const siteRows = extractRows(siteTable);
      const parseRow = (label: string) => {
        const row = siteRows.find((r) => r[1].includes(label))?.[1] ?? "";
        const cells = extractCells(row);
        return extractNumber(cells[1] || "0");
      };
      const site_and_source_energy = {
        total_site_energy_gj: parseRow("Total Site Energy"),
        net_site_energy_gj: parseRow("Net Site Energy"),
        total_source_energy_gj: parseRow("Total Source Energy"),
        net_source_energy_gj: parseRow("Net Source Energy"),
      };

      // Conversion Factors
      const convTable = extractSectionTable(
        html,
        "Site to Source Energy Conversion Factors"
      );
      const convRows = extractRows(convTable);
      const site_to_source_conversion_factors: Record<string, number> = {};
      convRows.slice(1).forEach((r) => {
        const [key, val] = extractCells(r[1]);
        if (key) site_to_source_conversion_factors[key] = extractNumber(val);
      });

      // Building Area
      const areaTable = extractSectionTable(html, "Building Area");
      const areaRows = extractRows(areaTable);
      const areas_m2: Record<string, number> = {};
      areaRows.slice(1).forEach((r) => {
        const [key, val] = extractCells(r[1]);
        const k = key.replace(/[^A-Za-z]/g, "").toLowerCase();
        areas_m2[k] = extractNumber(val);
      });

      // End Uses
      const endUseTable = extractSectionTable(html, "End Uses");
      const endUseRows = extractRows(endUseTable);
      const end_uses_gj: Record<string, Record<string, number>> = {};
      endUseRows.slice(1).forEach((r) => {
        const cells = extractCells(r[1]);
        const category = cells[0];
        if (
          category &&
          !["Time of Peak", "Total End Uses"].includes(category)
        ) {
          end_uses_gj[category] = {};
          fuels.forEach((fuel, idx) => {
            end_uses_gj[category][fuel] = extractNumber(cells[idx + 1]);
          });
        }
      });

      return {
        site_and_source_energy,
        site_to_source_conversion_factors,
        building_area_m2: {
          total: areas_m2["totalbuildingarea"] || 0,
          conditioned: areas_m2["netconditionedbuildingarea"] || 0,
          unconditioned: areas_m2["unconditionedbuildingarea"] || 0,
        },
        end_uses_gj,
      };
    };

    // 2) Demand End Use Components
    const parseDemandEndUseComponents = () => {
      // Peak Demand
      const demandTable = extractSectionTable(html, "End Uses");
      const demandRows = extractRows(demandTable);
      const peak_demand_w: Record<string, Record<string, number>> = {};
      demandRows.slice(2).forEach((r) => {
        const cells = extractCells(r[1]);
        const category = cells[0];
        if (category && !["None", "Total End Uses"].includes(category)) {
          peak_demand_w[category] = {};
          fuels.forEach((fuel, idx) => {
            peak_demand_w[category][fuel] = extractNumber(cells[idx + 1]);
          });
        }
      });
      // By Subcategory
      const subcatTable = extractSectionTable(html, "End Uses By Subcategory");
      const subcatRows = extractRows(subcatTable);
      const by_subcategory_w: Record<string, Record<string, number>> = {};
      subcatRows.slice(1).forEach((r) => {
        const cells = extractCells(r[1]);
        const category = cells[0];
        if (category) {
          by_subcategory_w[category] = {};
          fuels.forEach((fuel, idx) => {
            by_subcategory_w[category][fuel] = extractNumber(cells[idx + 2]);
          });
        }
      });
      return { peak_demand_w, by_subcategory_w };
    };

    // 3) Source Energy End Use Components Summary
    const parseSourceEnergySummary = () => {
      const result: {
        report_name: string;
        timestamp: string;
        end_uses: { category: string; values: Record<string, number | null> }[];
      } = {
        report_name: "Source Energy End Use Components Summary",
        timestamp: "",
        end_uses: [],
      };
      // timestamp
      result.timestamp =
        html.match(/Timestamp:\s*([\d\-:\s]+)/)?.[1].trim() || "";
      // section table or fallback to first <table>
      let tableHtml = extractSectionTable(html, result.report_name);
      if (!tableHtml) {
        const m = html.match(/<table[^>]*>([\s\S]*?)<\/table>/);
        tableHtml = m?.[1] || "";
      }
      const rows = extractRows(tableHtml);
      if (rows.length >= 3) {
        const headers = extractCells(rows[0][1]).slice(1);
        for (let i = 2; i < rows.length - 1; i++) {
          const cells = extractCells(rows[i][1]);
          const category = cells[0];
          const vals = cells
            .slice(1)
            .map((c) => (c === "-" || c === "" ? null : parseFloat(c)));
          result.end_uses.push({
            category,
            values: Object.fromEntries(headers.map((h, idx) => [h, vals[idx]])),
          });
        }
      }
      return result;
    };

    // 4) HVAC Sizing Summary
    const parseHVACSizingSummary = () => {
      const timestamp = html.match(/Timestamp:\s*([\d\-:\s]+)/)?.[1] ?? null;
      const facility = html.match(/For:\s*<b>(.*?)<\/b>/)?.[1] ?? null;
      const parseSection = (title: string) => {
        const tableHtml = extractSectionTable(html, title);
        const rows = extractRows(tableHtml);
        if (rows.length < 2) return [];
        const headers = extractCells(rows[0][1]).map((h) =>
          h
            .toLowerCase()
            .replace(/[\s\[\]{}\/]+/g, "_")
            .replace(/_+$/, "")
        );
        return rows.slice(1).map((r) => {
          const cells = extractCells(r[1]);
          return Object.fromEntries(
            headers.map((key, idx) => {
              const v = cells[idx] || "";
              const num = parseFloat(v.replace(/[, ]/g, ""));
              return [key, isNaN(num) ? v || null : num];
            })
          );
        });
      };
      return {
        timestamp,
        facility,
        space_sensible_cooling: parseSection("Space Sensible Cooling"),
        zone_sensible_cooling: parseSection("Zone Sensible Cooling"),
        space_sensible_heating: parseSection("Space Sensible Heating"),
        zone_sensible_heating: parseSection("Zone Sensible Heating"),
        system_design_air_flow_rates: parseSection(
          "System Design Air Flow Rates"
        ),
        plant_loop_coincident_design_fluid_flow_rate_adjustments: parseSection(
          "Plant Loop Coincident Design Fluid Flow Rate Adjustments"
        ),
        coil_sizing_summary: parseSection("Coil Sizing Summary"),
      };
    };

    // 5) Lighting Summary
    const parseLightingSummary = () => {
      const timestamp = html.match(/Timestamp:\s*([\d\-:\s]+)/)?.[1] ?? null;
      const facility = html.match(/For:\s*<b>(.*?)<\/b>/)?.[1] ?? null;
      const parseSection = (title: string) => {
        const tableHtml = extractSectionTable(html, title);
        const rows = extractRows(tableHtml);
        if (rows.length < 2) return [];
        const headers = extractCells(rows[0][1]).map((h) =>
          h
            .toLowerCase()
            .replace(/[\s\[\]()>%]+/g, "_")
            .replace(/_+$/, "")
        );
        return rows.slice(1).map((r) => {
          const cells = extractCells(r[1]);
          return Object.fromEntries(
            headers.map((key, idx) => {
              const v = cells[idx] || "";
              const num = parseFloat(v.replace(/[, ]/g, ""));
              return [key, isNaN(num) ? v || null : num];
            })
          );
        });
      };
      return {
        timestamp,
        facility,
        interior_lighting: parseSection("Interior Lighting"),
        daylighting: parseSection("Daylighting"),
        exterior_lighting: parseSection("Exterior Lighting"),
      };
    };

    // 6) CO2 Resilience Summary
    const parseCO2ResilienceSummary = () => {
      const parseCO2Table = (title: string) => {
        const tableHtml = extractSectionTable(html, title);
        const rows = extractRows(tableHtml);
        if (rows.length < 2) return null;
        const cells = extractCells(rows[1][1]);
        return {
          safe_hours: parseFloat(cells[1] || "0"),
          caution_hours: parseFloat(cells[2] || "0"),
          hazard_hours: parseFloat(cells[3] || "0"),
        };
      };
      const timestamp = html.match(/Timestamp:\s*([\d\-:\s]+)/)?.[1] ?? null;
      const facility = html.match(/For:\s*<b>(.*?)<\/b>/)?.[1] ?? null;
      return {
        timestamp,
        facility,
        co2_level_hours: parseCO2Table("CO2 Level Hours"),
        co2_level_occupanthours: parseCO2Table("CO2 Level OccupantHours"),
        co2_level_occupiedhours: parseCO2Table("CO2 Level OccupiedHours"),
      };
    };

    // 합쳐서 리턴
    return NextResponse.json({
      building_performance: parseBuildingPerformance(),
      demand_end_use_components: parseDemandEndUseComponents(),
      source_energy_end_use_components_summary: parseSourceEnergySummary(),
      hvac_sizing_summary: parseHVACSizingSummary(),
      lighting_summary: parseLightingSummary(),
      co2_resilience_summary: parseCO2ResilienceSummary(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || String(error) },
      { status: 500 }
    );
  }
}
