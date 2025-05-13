"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

const URN = process.env.NEXT_PUBLIC_FORGE_URN || "<Forge URN>";
const ACCESS_TOKEN =
  process.env.NEXT_PUBLIC_FORGE_ACCESS_TOKEN || "<2-Legged Token>";
const dbId1 = 3983; // 빨강 LED
const dbId2 = 3992; // 초록 LED
const dbId3 = 3999; // 노랑 LED
const switchDbId = 4007; // 스위치 모델

export default function Page() {
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!(window as any).Autodesk) return;

    const options = {
      env: "AutodeskProduction",
      accessToken: ACCESS_TOKEN,
    };

    (window as any).Autodesk.Viewing.Initializer(options, () => {
      const viewer = new (window as any).Autodesk.Viewing.GuiViewer3D(
        viewerRef.current
      );
      viewer.start();

      (window as any).Autodesk.Viewing.Document.load(
        `urn:${URN}`,
        (doc: any) => {
          const defaultModel = doc.getRoot().getDefaultGeometry();
          viewer.loadDocumentNode(doc, defaultModel);

          // // dbId 알아보기 위함
          // viewer.addEventListener(
          //   (window as any).Autodesk.Viewing.SELECTION_CHANGED_EVENT,
          //   (event: any) => {
          //     const dbId = event.dbIdArray[0];
          //     console.log("클릭된 dbId:", dbId);
          //   }
          // );

          // 스위치 클릭 시 ESP32 제어
          viewer.addEventListener(
            (window as any).Autodesk.Viewing.SELECTION_CHANGED_EVENT,
            async (event: any) => {
              const dbId = event.dbIdArray[0];
              if (dbId === switchDbId) {
                const res = await fetch("/api/esp32/toggle-led", {
                  method: "POST",
                });
                if (res.ok) console.log("ESP32 제어 요청 성공");
                else console.error("ESP32 제어 실패");

                const instanceTree = viewer.model.getData().instanceTree;
                const fragList = viewer.model.getFragmentList();

                instanceTree.enumNodeFragments(switchDbId, (fragId: number) => {
                  // 1. proxy 객체를 얻음
                  const fragProxy = viewer.impl.getFragmentProxy(
                    viewer.model,
                    fragId
                  );
                  fragProxy.getAnimTransform(); // 현재 위치 정보 로드

                  // 2. 살짝 아래로 이동
                  const originalPosition = {
                    x: fragProxy.position.x,
                    y: fragProxy.position.y,
                    z: fragProxy.position.z,
                  };
                  fragProxy.position.z -= 0.5; // Y축 아래로 3cm 이동
                  fragProxy.updateAnimTransform();

                  // 3. 일정 시간 후 원위치 복귀
                  setTimeout(() => {
                    fragProxy.position.set(
                      originalPosition.x,
                      originalPosition.y,
                      originalPosition.z
                    );
                    fragProxy.updateAnimTransform();
                  }, 300); // 0.3초 후 복귀
                });
              }
            }
          );

          // 색상 반영 polling
          setInterval(async () => {
            const res = await fetch("/api/tandem/latest");
            const data = await res.json(); // { led1: 1, led2: 0, led3: 0 }

            console.log("[Tandem 상태]", data);

            const THREE = (window as any).THREE;

            // LED ON: 선명한 색상
            const red = new THREE.Vector4(1, 0, 0, 1);
            const green = new THREE.Vector4(0, 1, 0, 1);
            const yellow = new THREE.Vector4(1, 1, 0, 1);

            // LED OFF: 살짝 어두운 색상
            const redDim = new THREE.Vector4(0.6, 0, 0, 1);
            const greenDim = new THREE.Vector4(0, 0.6, 0, 1);
            const yellowDim = new THREE.Vector4(0.6, 0.6, 0, 1);

            // 적용
            viewer.setThemingColor(dbId1, data.led1 ? red : redDim);
            viewer.setThemingColor(dbId2, data.led2 ? green : greenDim);
            viewer.setThemingColor(dbId3, data.led3 ? yellow : yellowDim);
          }, 2000);
        },
        (error: any) => console.error("Document load error", error)
      );
    });
  }, []);

  return (
    <>
      <Script
        src="https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.js"
        strategy="beforeInteractive"
      />
      <link
        rel="stylesheet"
        href="https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style.css"
      />
      <div
        id="forgeViewer"
        ref={viewerRef}
        style={{ width: "100%", height: "90vh" }}
      />
    </>
  );
}
