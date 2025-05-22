declare interface Report {
  site: { total_gj: number; eui_mj_m2: number };
  endUses_gj: Record<string, number>;
  wwr: Record<string, number>; // north‧east‧south‧west‧overall
  areas_m2: { total: number; conditioned?: number };
  peakLoads_kw: { heating?: number; cooling?: number };
}

declare interface ReportRaw {
  building_performance: {
    site_and_source_energy: {
      total_site_energy_gj: number;
      net_site_energy_gj: number;
      total_source_energy_gj: number;
      net_source_energy_gj: number;
    };
    site_to_source_conversion_factors: Record<string, number>;
    building_area_m2: {
      total: number;
      conditioned: number;
      unconditioned: number;
    };
    end_uses_gj: Record<string, Record<string, number>>;
  };
  demand_end_use_components: {
    peak_demand_w: Record<string, Record<string, number>>;
    by_subcategory_w: Record<string, Record<string, number>>;
  };
  source_energy_end_use_components_summary: {
    report_name: string;
    timestamp: string;
    end_uses: { category: string; values: Record<string, number | null> }[];
  };
  hvac_sizing_summary: {
    timestamp: string;
    facility: string;
    space_sensible_cooling: any[];
    zone_sensible_cooling: any[];
    space_sensible_heating: any[];
    zone_sensible_heating: any[];
    system_design_air_flow_rates: any[];
    plant_loop_coincident_design_fluid_flow_rate_adjustments: any[];
    coil_sizing_summary: any[];
  };
  lighting_summary: {
    timestamp: string;
    facility: string;
    interior_lighting: any[];
    daylighting: any[];
    exterior_lighting: any[];
  };
  co2_resilience_summary: {
    timestamp: string;
    facility: string;
    co2_level_hours: {
      safe_hours: number;
      caution_hours: number;
      hazard_hours: number;
    };
    co2_level_occupanthours: {
      safe_hours: number;
      caution_hours: number;
      hazard_hours: number;
    };
    co2_level_occupiedhours: {
      safe_hours: number;
      caution_hours: number;
      hazard_hours: number;
    };
  };
}
