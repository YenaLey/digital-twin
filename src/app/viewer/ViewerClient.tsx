/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useEffect, useRef, useCallback } from "react";
import Script from "next/script";
import { useSearchParams } from "next/navigation";

export default function ViewerClient() {
  const viewerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  const params = useSearchParams();
  const rawUrn = params.get("urn") ?? "";
  const token = params.get("token") ?? "";

  const loadModel = useCallback(() => {
    const Autodesk = (window as any).Autodesk;
    if (!Autodesk?.Viewing) return;

    let urn = rawUrn;
    const pattern = /^(urn|https?):/;
    if (!pattern.test(urn)) urn = "urn:" + urn;

    const viewer = new Autodesk.Viewing.GuiViewer3D(viewerRef.current, {
      extensions: ["Autodesk.DocumentBrowser"],
    });
    viewer.start();

    Autodesk.Viewing.Document.load(
      urn,
      (doc: any) => {
        console.log("Document.load succeeded");

        const root = doc.getRoot();
        const items = root.search({ type: "geometry", role: "3d" });
        const viewable =
          items.length > 0 ? items[0] : root.getDefaultGeometry?.();

        if (!viewable) {
          console.error("🚨 No viewable geometry found in document");
          return;
        }

        viewer
          .loadDocumentNode(doc, viewable)
          .then((model: any) =>
            console.log("loadDocumentNode succeeded", model)
          )
          .catch((err: any) => console.error("loadDocumentNode failed", err));
      },
      (err: any) => {
        console.error("🚨 Document.load failed", err);
      },
      (progress: number) =>
        console.log(`🔄 Translation: ${(progress * 100).toFixed(0)}%`)
    );
  }, [rawUrn]);

  const initialize = useCallback(() => {
    if (initialized.current) return;
    const Autodesk = (window as any).Autodesk;
    if (!Autodesk?.Viewing) return;

    initialized.current = true;

    Autodesk.Viewing.Initializer(
      {
        env: "AutodeskProduction",
        getAccessToken: (onToken: (t: string, e: number) => void) => {
          onToken(token, 3600);
        },
      },
      loadModel
    );
  }, [loadModel, token]);

  useEffect(() => {
    initialize();
    const id = setInterval(initialize, 500);
    return () => clearInterval(id);
  }, [initialize]);

  return (
    <>
      <Script
        src="https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.min.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log("▶ Autodesk.Viewing script loaded");
          initialize();
        }}
      />
      <link
        rel="stylesheet"
        href="https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style.min.css"
      />

      <div
        id="viewer"
        ref={viewerRef}
        style={{ width: "100%", height: "80vh" }}
      />
    </>
  );
}
