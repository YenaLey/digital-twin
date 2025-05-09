"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { useSearchParams } from "next/navigation";

export default function ViewerPage() {
  const viewerRef = useRef<HTMLDivElement>(null);
  const params = useSearchParams();
  const urnParam = params.get("urn") ?? "";
  const tokenParam = params.get("token") ?? "";

  useEffect(() => {
    if (!(window as any).Autodesk) return;

    const options = {
      env: "AutodeskProduction",
      getAccessToken: (cb: any) => cb(tokenParam, 3599),
    };

    (window as any).Autodesk.Viewing.Initializer(options, () => {
      const viewer = new (window as any).Autodesk.Viewing.GuiViewer3D(
        viewerRef.current,
        {
          extensions: ["Autodesk.DocumentBrowser"],
        }
      );
      viewer.start();

      let urn = urnParam;
      if (!/^urn:/.test(urn)) urn = "urn:" + urn;

      (window as any).Autodesk.Viewing.Document.load(
        urn,
        (doc: any) => {
          const defaultModel = doc.getRoot().getDefaultGeometry();
          viewer.loadDocumentNode(doc, defaultModel);
        },
        (err: any) => console.error("Document load error", err)
      );
    });
  }, [urnParam, tokenParam]);

  return (
    <>
      <Script
        src="https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.min.js"
        strategy="beforeInteractive"
      />
      <link
        rel="stylesheet"
        href="https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style.min.css"
      />

      <div
        id="forgeViewer"
        ref={viewerRef}
        style={{ width: "100%", height: "90vh" }}
      />
    </>
  );
}
