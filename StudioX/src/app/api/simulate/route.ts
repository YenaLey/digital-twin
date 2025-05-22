// src/app/api/simulate/route.ts
import { NextResponse } from "next/server";
import { promises as fs, createWriteStream } from "fs";
import path from "path";
import { spawn } from "child_process";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import xpath from "xpath";
import { sectionFields, defaultValues } from "@/lib/formValues";

export const runtime = "nodejs";

const OS_DIR = path.join(process.cwd(), "openstudio");
const GBXML_OUT = path.join(OS_DIR, "gbxmls", "test.xml");

async function runOpenStudio(): Promise<void> {
  return new Promise((resolve, reject) => {
    const out = createWriteStream(path.join(OS_DIR, "openstudio.log"));
    const err = createWriteStream(path.join(OS_DIR, "openstudio.err"));
    const child = spawn("openstudio", ["run", "-w", "convert.osw"], {
      cwd: OS_DIR,
    });
    child.stdout.pipe(out);
    child.stderr.pipe(err);
    child.on("error", reject);
    child.on("close", (code) => {
      out.close();
      err.close();
      code === 0
        ? resolve()
        : reject(new Error(`OpenStudio exited with code ${code}`));
    });
  });
}

async function findHtml(dir: string): Promise<string> {
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop()!;
    for (const ent of await fs.readdir(current, { withFileTypes: true })) {
      const p = path.join(current, ent.name);
      if (ent.isDirectory()) stack.push(p);
      else if (/^eplustbl\.html?$/i.test(ent.name)) return p;
    }
  }
  throw new Error("eplustbl.html not found");
}

export async function POST(req: Request) {
  try {
    const fd = await req.formData();
    const file = fd.get("gbxml") as File;
    if (!file) throw new Error("gbXML 파일이 필요합니다.");

    // 1) 파일에서 읽어온 xmlText 앞에 BOM(﻿)이나 공백이 있으면 제거합니다.
    let xmlText = Buffer.from(await file.arrayBuffer()).toString("utf8");
    // BOM 제거
    xmlText = xmlText.replace(/^\uFEFF/, "");
    // 선행 공백·줄바꿈 제거
    xmlText = xmlText.trimStart();

    // 2) 정리된 문자열로 파싱
    const doc = new DOMParser().parseFromString(xmlText, "application/xml");
    const root = doc.documentElement;
    if (!root) throw new Error("Invalid XML document: root element is missing");
    const nsURI = root.namespaceURI || "";
    const select = xpath.useNamespaces({ gb: nsURI }) as (
      expr: string,
      context: any
    ) => Node[];

    function setText(expr: string, value: string): void {
      const nodes = select(expr, doc);
      const node = nodes[0] as any;
      if (!node) return;
      const first = node.firstChild;
      if (first && first.nodeType === first.TEXT_NODE) {
        (first as any).data = value;
      } else {
        const textNode = doc.createTextNode(value) as unknown as Node;
        node.appendChild(textNode);
      }
    }

    // 헬퍼: 단일 요소에 속성 설정
    function setAttr(expr: string, name: string, value: string): void {
      const el = select(expr, doc)[0] as Element | undefined;
      if (el) el.setAttribute(name, value);
    }

    const v = (key: string) =>
      fd.get(key)?.toString() ?? defaultValues[key] ?? "";

    // 3) Campus Location
    setText("//gb:Campus/gb:Location/gb:StationId", v("stationId"));
    setText("//gb:Campus/gb:Location/gb:ZipcodeOrPostalCode", v("zipcode"));
    setText("//gb:Campus/gb:Location/gb:Longitude", v("longitude"));
    setText("//gb:Campus/gb:Location/gb:Latitude", v("latitude"));
    setText("//gb:Campus/gb:Location/gb:Elevation", v("elevation"));
    setText("//gb:Campus/gb:Location/gb:CADModelAzimuth", v("cadAzimuth"));
    setText("//gb:Campus/gb:Location/gb:Name", v("locName"));

    // 4) Building
    setAttr("//gb:Campus/gb:Building", "buildingType", v("bldgType"));
    setText("//gb:Campus/gb:Building/gb:StreetAddress", v("street"));
    setText("//gb:Campus/gb:Building/gb:Area", v("bldgArea"));
    setText("//gb:Campus/gb:Building/gb:Name", v("bldgName"));

    // 5) Space Loads / Ventilation
    setText("//gb:Space/gb:PeopleNumber", v("peopleNum"));
    setText("//gb:Space/gb:LightPowerPerArea", v("lightWm2"));
    setText("//gb:Space/gb:EquipPowerPerArea", v("equipWm2"));
    setText("//gb:Space/gb:AirChangesPerHour", v("ach"));
    setText("//gb:Space/gb:Area", v("spaceArea"));
    setText("//gb:Space/gb:Volume", v("spaceVol"));

    // 6) PeopleHeatGain
    const heatNodes = select("//gb:Space/gb:PeopleHeatGain", doc) as any[];
    if (heatNodes[0]) {
      heatNodes[0].setAttribute("heatGainType", "Total");
      heatNodes[0].textContent = v("heatTotal");
    }
    if (heatNodes[1]) {
      heatNodes[1].setAttribute("heatGainType", "Latent");
      heatNodes[1].textContent = v("heatLatent");
    }
    if (heatNodes[2]) {
      heatNodes[2].setAttribute("heatGainType", "Sensible");
      heatNodes[2].textContent = v("heatSens");
    }

    // 7) Analysis Parameters
    setText(
      "//gb:Space/gb:AnalysisParameter[gb:Name='OAFlowMethod']/gb:ParameterValue",
      v("oaMethod")
    );
    setText(
      "//gb:Space/gb:AnalysisParameter[gb:Name='OAFlowPerArea']/gb:ParameterValue",
      v("oaArea")
    );
    setText(
      "//gb:Space/gb:AnalysisParameter[gb:Name='OAFlowPerPerson']/gb:ParameterValue",
      v("oaPerson")
    );
    setText(
      "//gb:Space/gb:AnalysisParameter[gb:Name='OAFlowPerSpace']/gb:ParameterValue",
      v("oaSpace")
    );
    setText(
      "//gb:Space/gb:AnalysisParameter[gb:Name='InfiltrationFlowPerArea']/gb:ParameterValue",
      v("infArea")
    );

    // 8) Simulation Parameters
    setText(
      "//gb:SimulationControl/gb:DoZoneSizingCalculation",
      v("simulationControl") === "RunSimulationAndSizing" ? "Yes" : "No"
    );
    setText("//gb:SimulationControl/gb:DoSystemSizingCalculation", "No");
    setText("//gb:SimulationControl/gb:DoPlantSizingCalculation", "No");
    setText("//gb:SimulationControl/gb:RunSimulationForSizingPeriods", "Yes");
    setText(
      "//gb:SimulationControl/gb:RunSimulationForWeatherFileRunPeriods",
      "Yes"
    );
    setText(
      "//gb:SimulationControl/gb:DoHVACSizingSimulationForSizingPeriods",
      "Yes"
    );
    setText(
      "//gb:SimulationControl/gb:MaximumNumberOfHVACSizingSimulationPasses",
      "1"
    );
    setText("//gb:Timestep", v("timestep"));
    setText("//gb:Version", v("version"));

    // 9) Location & Climate (Design Days & Run Period)
    // Cooling Design Day
    setText("//gb:SizingPeriodDesignDay[1]/gb:Month", v("dd1Month"));
    setText("//gb:SizingPeriodDesignDay[1]/gb:DayOfMonth", v("dd1Day"));
    setText("//gb:SizingPeriodDesignDay[1]/gb:DayType", v("dd1Type"));
    setText(
      "//gb:SizingPeriodDesignDay[1]/gb:MaximumDryBulbTemperature",
      v("dd1MaxDryBulb")
    );
    setText(
      "//gb:SizingPeriodDesignDay[1]/gb:DailyDryBulbTemperatureRange",
      v("dd1DryBulbRange")
    );
    // Heating Design Day
    setText("//gb:SizingPeriodDesignDay[2]/gb:Month", v("dd2Month"));
    setText("//gb:SizingPeriodDesignDay[2]/gb:DayOfMonth", v("dd2Day"));
    setText("//gb:SizingPeriodDesignDay[2]/gb:DayType", v("dd2Type"));
    setText(
      "//gb:SizingPeriodDesignDay[2]/gb:MaximumDryBulbTemperature",
      v("dd2MaxDryBulb")
    );
    setText(
      "//gb:SizingPeriodDesignDay[2]/gb:DailyDryBulbTemperatureRange",
      v("dd2DryBulbRange")
    );
    // Run Period
    setText("//gb:RunPeriod/gb:BeginMonth", v("runPeriodStartMonth"));
    setText("//gb:RunPeriod/gb:BeginDayOfMonth", v("runPeriodStartDay"));
    setText("//gb:RunPeriod/gb:EndMonth", v("runPeriodEndMonth"));
    setText("//gb:RunPeriod/gb:EndDayOfMonth", v("runPeriodEndDay"));
    setText(
      "//gb:RunPeriod/gb:SpecialDayCodes",
      v("runPeriodControlSpecialDays")
    );
    setText(
      "//gb:RunPeriod/gb:DaylightSavingStartDate",
      v("runPeriodControlDaylightSavingsStart")
    );
    setText(
      "//gb:RunPeriod/gb:DaylightSavingEndDate",
      v("runPeriodControlDaylightSavingsEnd")
    );

    // 10) Ground & Water Temperatures
    setText(
      "//gb:SiteGroundTemperatureBuildingSurface/gb:MonthlyAverageGroundTemperature",
      v("siteGroundTempsMonthly")
    );
    setText(
      "//gb:SiteWaterMainsTemperature/gb:WaterMainsTemperature",
      v("siteWaterMainsTemp")
    );

    // 11) Schedules
    ["ScheduleCompact", "ScheduleTypeLimits", "ScheduleConstant"].forEach(
      (tag) => setText(`//gb:${tag}`, v(tag))
    );
    [
      "ScheduleDayInterval",
      "ScheduleWeekDaily",
      "ScheduleYearDefinition",
    ].forEach((tag) => setAttr(`//gb:${tag}`, "Name", v(tag)));
    if (v("scheduleFile")) setText("//gb:ScheduleFile", v("scheduleFile"));

    // 12) Surface Construction Elements
    [
      "Material",
      "MaterialNoMass",
      "MaterialAirGap",
      "WindowMaterialGlazing",
      "WindowMaterialGas",
      "WindowMaterialSimpleGlazingSystem",
      "Construction",
    ].forEach((tag) => setText(`//gb:${tag}`, v(tag)));

    // 13) Internal Gains
    [
      "People",
      "Lights",
      "ElectricEquipment",
      "GasEquipment",
      "OtherEquipment",
      "ElectricEquipmentITEAirCooled",
      "SwimmingPoolIndoor",
      "ComfortViewFactorAngles",
    ].forEach((tag) => setText(`//gb:${tag}`, v(tag)));

    // 14) Daylighting
    [
      "DaylightingControls",
      "DaylightingReferencePoint",
      "DaylightingDeviceTubular",
      "DaylightingDeviceShelf",
      "DaylightingDeviceLightWell",
    ].forEach((tag) => setText(`//gb:${tag}`, v(tag)));

    // 15) Advanced Construction & Surface Properties
    [
      "FoundationKiva",
      "FoundationKivaSettings",
      "SurfacePropertyExposedFoundationPerimeter",
      "SurfaceControlMovableInsulation",
      "SurfacePropertyUnderwater",
      "SurfacePropertyExteriorNaturalVentedCavity",
    ].forEach((tag) => setText(`//gb:${tag}`, v(tag)));

    // 16) Exterior Equipment
    [
      "ExteriorLights",
      "ExteriorFuelEquipment",
      "ExteriorWaterEquipment",
    ].forEach((tag) => setText(`//gb:${tag}`, v(tag)));

    // 17) Zone Airflow
    [
      "ZoneInfiltrationDesignFlowRate",
      "ZoneInfiltrationEffectiveLeakageArea",
      "ZoneInfiltrationFlowCoefficient",
      "ZoneVentilationDesignFlowRate",
      "ZoneVentilationWindandStackOpenArea",
      "ZoneMixing",
      "ZoneCrossMixing",
      "ZoneRefrigerationDoorMixing",
      "ZoneEarthtube",
      "ZoneCoolTowerShower",
      "ZoneThermalChimney",
    ].forEach((tag) => setText(`//gb:${tag}`, v(tag)));

    // 18) HVAC Templates
    // 기존 child 모두 삭제
    const hvacParent = select("//gb:HVACTemplates", doc)[0] as any;
    if (hvacParent) {
      while (hvacParent.firstChild) {
        hvacParent.removeChild(hvacParent.firstChild);
      }
      sectionFields["HVAC Templates"].forEach(({ name }) => {
        if (v(name) === "Yes") {
          const el = doc.createElementNS(nsURI, name) as any;
          el.textContent = "Yes";
          hvacParent.appendChild(el);
        }
      });
    }

    // 19) Output Reporting & Meters
    // 단순 텍스트 필드
    [
      "OutputTableSummaryReports",
      "OutputControlTableStyle",
      "OutputTableTimeBins",
      "OutputTableMonthly",
      "OutputTableAnnual",
      "OutputVariableDictionary",
      "OutputDiagnostics",
      "OutputDebuggingData",
      "OutputSQLite",
      "OutputSurfacesList",
      "OutputSurfacesDrawing",
      "OutputControlSurfaceColorScheme",
      "OutputSchedules",
      "OutputConstructions",
      "OutputEnergyManagementSystem",
      "OutputControlReportingTolerances",
    ].forEach((tag) => setText(`//gb:${tag}`, v(tag)));
    // OutputMeter (다중)
    // 기존 remove
    (select("//gb:OutputMeter", doc) as Node[]).forEach((node: Node) => {
      node.parentNode?.removeChild(node);
    });
    // 새로 추가
    const outParent = doc.documentElement as any;
    [
      "Electricity:Facility",
      "NaturalGas:Facility",
      "DistrictHeatingWater:Facility",
      "DistrictCooling:Facility",
    ]
      .filter((key) => v(`outputMeter${key.replace(/:/g, "")}`) === "Yes")
      .forEach((key: string) => {
        const m = doc.createElementNS(nsURI, "OutputMeter");
        const k = doc.createElementNS(nsURI, "KeyName");
        k.textContent = key;
        const f = doc.createElementNS(nsURI, "ReportingFrequency");
        f.textContent = "Timestep";
        m.appendChild(k);
        m.appendChild(f);
        outParent.appendChild(m as any);
      });

    // 20) Economics
    [
      "ComponentCostLineItem",
      "ComponentCostAdjustments",
      "ComponentCostReference",
      "LifeCycleCostParameters",
      "LifeCycleCostRecurringCosts",
      "LifeCycleCostNonrecurringCost",
      "LifeCycleCostUsePriceEscalation",
      "LifeCycleCostUseAdjustment",
      "CurrencyType",
      "UtilityCostTariff",
      "UtilityCostQualify",
      "UtilityCostChargeSimple",
      "UtilityCostChargeBlock",
      "UtilityCostRatchet",
      "UtilityCostVariable",
      "UtilityCostComputation",
    ].forEach((tag) => setText(`//gb:${tag}`, v(tag)));

    // 21) 직렬화 & 파일 쓰기
    const newXml = new XMLSerializer().serializeToString(doc);
    await fs.writeFile(GBXML_OUT, newXml, "utf8");

    // 22) 시뮬레이션 실행
    await fs.rm(path.join(OS_DIR, "run"), { recursive: true, force: true });
    await runOpenStudio();
    const reportPath = await findHtml(path.join(OS_DIR, "run"));
    const html = await fs.readFile(reportPath, "utf8");
    return NextResponse.json({ report: html });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
