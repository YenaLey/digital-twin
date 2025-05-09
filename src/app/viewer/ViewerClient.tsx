"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { useSearchParams } from "next/navigation";

declare global {
  interface Window {
    Autodesk?: typeof Autodesk;
  }

  const Autodesk: {
    Viewing: {
      Initializer: (
        options: {
          env: string;
          getAccessToken: (
            callback: (token: string, expire: number) => void
          ) => void;
        },
        callback: () => void
      ) => void;
      GuiViewer3D: new (
        container: HTMLDivElement | null,
        options?: { extensions?: string[] }
      ) => {
        start: () => void;
        loadDocumentNode: (doc: unknown, defaultModel: unknown) => void;
      };
      Document: {
        load: (
          urn: string,
          onSuccess: (doc: AutodeskDocument) => void,
          onFailure: (error: unknown) => void
        ) => void;
      };
    };
  };

  interface AutodeskDocument {
    getRoot: () => {
      getDefaultGeometry: () => unknown;
    };
  }
}

export default function ViewerPage() {
  const viewerRef = useRef<HTMLDivElement>(null);
  const params = useSearchParams();
  const urnParam = params.get("urn") ?? "";
  const tokenParam = params.get("token") ?? "";

  useEffect(() => {
    if (!window.Autodesk) return;

    const options = {
      env: "AutodeskProduction",
      getAccessToken: (cb: (token: string, expire: number) => void) =>
        cb(tokenParam, 3599),
    };

    window.Autodesk.Viewing.Initializer(options, () => {
      const viewer = new window.Autodesk!.Viewing.GuiViewer3D(
        viewerRef.current,
        {
          extensions: ["Autodesk.DocumentBrowser"],
        }
      );
      viewer.start();

      let urn = urnParam;
      if (!/^urn:/.test(urn)) urn = "urn:" + urn;

      window.Autodesk!.Viewing.Document.load(
        urn,
        (doc) => {
          const defaultModel = doc.getRoot().getDefaultGeometry();
          viewer.loadDocumentNode(doc, defaultModel);
        },
        (err) => console.error("Document load error", err)
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
