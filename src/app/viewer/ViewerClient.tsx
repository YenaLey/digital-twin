/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { useSearchParams } from "next/navigation";

export default function ViewerClient() {
  const viewerRef = useRef<HTMLDivElement>(null);
  const params = useSearchParams();
  const rawUrn = params.get("urn") || "";
  const token = params.get("token") || "";

  useEffect(() => {
    if (!(window as any).Autodesk?.Viewing) return;

    const options = {
      env: "AutodeskProduction",
      getAccessToken: (onToken: (tok: string, exp: number) => void) => {
        onToken(token, 3600);
      },
    };

    (window as any).Autodesk.Viewing.Initializer(options, () => {
      const viewer = new (window as any).Autodesk.Viewing.GuiViewer3D(
        viewerRef.current
      );
      viewer.start();

      const urn = rawUrn.startsWith("urn:") ? rawUrn : `urn:${rawUrn}`;

      (window as any).Autodesk.Viewing.Document.load(
        urn,
        (doc: any) => {
          let viewables: any[] = [];
          const Doc = (window as any).Autodesk.Viewing.Document as any;

          if (typeof Doc.getSubItemsWithProperties === "function") {
            viewables = Doc.getSubItemsWithProperties(
              doc.getRoot(),
              { type: "geometry" },
              true
            );
          } else {
            viewables = [doc.getRoot().getDefaultGeometry()];
          }

          if (viewables.length === 0) {
            console.error("No viewable geometry found.");
            return;
          }

          viewer.loadDocumentNode(doc, viewables[0]);
        },
        (err: any) => {
          console.error("Document.load failed:", err);
        }
      );
    });
  }, [rawUrn, token]);

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
        ref={viewerRef}
        style={{ width: "100%", height: "80vh" }}
        id="forgeViewer"
      />
    </>
  );
}
