"use client";

import { useState, useEffect, useCallback } from "react";
import { FiCopy, FiLoader, FiEye } from "react-icons/fi";

export default function TwoLeggedForm({
  onTokenSet,
}: {
  onTokenSet: () => void;
}) {
  const [creds, setCreds] = useState<Creds>({
    client_id: "",
    client_secret: "",
  });
  const [token, setToken] = useState<Token | null>(null);
  const [expiryTime, setExpiryTime] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [urn, setUrn] = useState("");
  const [loading, setLoading] = useState({
    auth: false,
    upload: false,
    translating: false,
  });

  const getToken = useCallback(async () => {
    setLoading({ auth: true, upload: false, translating: false });
    try {
      const res = await fetch("/api/auth/twolegged", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds),
      });
      const data: Token = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));
      setToken(data);
      onTokenSet();
      const expireAt = Date.now() + data.expires_in * 1000;
      setExpiryTime(expireAt);
      setCountdown(Math.floor((expireAt - Date.now()) / 1000));
    } catch (err) {
      console.error(err);
      alert("문제가 발생하였습니다. 다시 시도해주세요.");
    } finally {
      setLoading((s) => ({ ...s, auth: false }));
    }
  }, [creds, onTokenSet]);

  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => {
      setCountdown(Math.floor((expiryTime - Date.now()) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [token, expiryTime]);

  useEffect(() => {
    if (token && countdown <= 60) getToken();
  }, [countdown, getToken, token]);

  const copyToken = async () => {
    if (token) {
      await navigator.clipboard.writeText(token.access_token);
      alert("토큰이 복사되었습니다.");
    }
  };

  const copyUrn = async () => {
    if (urn) {
      await navigator.clipboard.writeText(urn);
      alert("Model URN이 복사되었습니다.");
    }
  };

  const viewModel = () => {
    if (!token || !urn) return;
    const q = new URLSearchParams({
      urn,
      token: token.access_token,
    }).toString();
    window.open(`/view.html?${q}`, "forgeViewer", "width=1024,height=768");
  };

  const translateProgress = async (modelUrn: string, accessToken: string) => {
    let manifest: { progress?: string; status?: string } = {};
    while (manifest.progress !== "complete") {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const res = await fetch(
          `/api/translate/${encodeURIComponent(
            modelUrn
          )}/progress?accessToken=${encodeURIComponent(accessToken)}`
        );
        if (!res.ok) {
          console.warn(`Progress API error ${res.status}`);
          continue;
        }
        manifest = await res.json();
      } catch (e) {
        console.warn("Invalid progress response", e);
      }
      if (manifest.status === "failed") {
        throw new Error("Translation failed");
      }
    }
  };

  const uploadTranslate = async () => {
    if (!token || !file) return;
    setLoading((s) => ({ ...s, upload: true, translating: false }));
    try {
      const form = new FormData();
      form.append("access_token", token.access_token);
      form.append("file", file);
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });
      if (!uploadRes.ok) {
        const html = await uploadRes.text();
        console.error("Upload failed, HTML:", html);
        alert("문제가 발생하였습니다. 다시 시도해주세요.");
        throw new Error(`Upload error ${uploadRes.status}`);
      }
      const { urn: newUrn } = await uploadRes.json();

      setLoading((s) => ({ ...s, upload: false, translating: true }));
      await translateProgress(newUrn, token.access_token);
      setUrn(newUrn);
    } catch (err) {
      console.error(err);
      alert("문제가 발생하였습니다. 다시 시도해주세요.");
    } finally {
      setLoading((s) => ({ ...s, upload: false, translating: false }));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block font-medium">Client ID</label>
        <input
          className="mt-1 w-full border border-blue-200 rounded-md p-2"
          placeholder="Enter Client ID"
          value={creds.client_id}
          onChange={(e) => setCreds({ ...creds, client_id: e.target.value })}
        />
      </div>
      <div>
        <label className="block font-medium">Client Secret</label>
        <input
          type="password"
          className="mt-1 w-full border border-blue-200 rounded-md p-2"
          placeholder="Enter Client Secret"
          value={creds.client_secret}
          onChange={(e) =>
            setCreds({ ...creds, client_secret: e.target.value })
          }
        />
      </div>

      <button
        onClick={getToken}
        disabled={!creds.client_id || !creds.client_secret || loading.auth}
        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading.auth && <FiLoader className="animate-spin" />} Get Token
      </button>

      {token && (
        <div className="bg-white p-4 rounded-md shadow-md space-y-6">
          <div className="flex items-start gap-2">
            <div className="flex-grow">
              <p className="font-medium">Access Token:</p>
              <code className="break-all text-sm text-gray-800">
                {token.access_token}
              </code>
            </div>
            <button
              onClick={copyToken}
              className="text-blue-600 hover:text-blue-800 p-1"
            >
              <FiCopy size={20} />
            </button>
          </div>
          <p>
            <span className="font-medium">Expires in:</span>{" "}
            <span className="font-semibold">{countdown}s</span>
          </p>

          <div className="space-y-6">
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block"
            />
            <button
              onClick={uploadTranslate}
              disabled={!file || loading.upload || loading.translating}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading.upload && (
                <>
                  <FiLoader className="animate-spin" /> Uploading…
                </>
              )}
              {!loading.upload && loading.translating && (
                <>
                  <FiLoader className="animate-spin" /> Translating…
                </>
              )}
              {!loading.upload && !loading.translating && (
                <>Upload & Translate</>
              )}
            </button>
          </div>

          {urn && !loading.translating && (
            <div className="flex items-center gap-2 mt-3">
              <div className="flex-grow">
                <p className="font-medium">Model URN:</p>
                <code className="break-all text-sm text-gray-700">{urn}</code>
              </div>
              <button
                onClick={copyUrn}
                className="text-blue-600 hover:text-blue-800 p-1"
              >
                <FiCopy size={20} />
              </button>
              <button
                onClick={viewModel}
                className="text-blue-600 hover:text-blue-800 p-1"
              >
                <FiEye size={20} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
