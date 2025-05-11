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
      console.error(`TwoLeggedForm :: getToken : ${err}`);
      alert("문제가 발생하였습니다. 다시 시도해주세요.");
    } finally {
      setLoading((s) => ({ ...s, auth: false }));
    }
  }, [creds, onTokenSet]);

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
    while (true) {
      await new Promise((r) => setTimeout(r, 2000));

      try {
        const res = await fetch(
          `/api/translate/${encodeURIComponent(
            modelUrn
          )}/progress?accessToken=${encodeURIComponent(accessToken)}`
        );
        if (!res.ok)
          throw new Error(
            `TwoLeggedForm :: translateProgress error : ${res.status}`
          );

        const manifest = (await res.json()) as {
          status: "pending" | "success" | "failed" | string;
        };

        if (manifest.status === "failed") {
          alert("문제가 발생하였습니다. 다시 시도해주세요.");
          return;
        }
        if (manifest.status === "success") {
          return;
        }
      } catch (err) {
        console.error("TwoLeggedForm :: manifest polling error:", err);
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
        throw new Error(`TwoLeggedForm :: upload error : ${uploadRes.status}`);
      }
      const { urn: newUrn } = await uploadRes.json();

      const translateRes = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urn: newUrn }),
      });
      if (!translateRes.ok) {
        throw new Error(
          `TwoLeggedForm :: translate error : ${translateRes.status}`
        );
      }

      setLoading((s) => ({ ...s, upload: false, translating: true }));
      await translateProgress(newUrn, token.access_token);

      setUrn(newUrn);
    } catch (err) {
      console.error(`TwoLeggedForm :: upload & translate error : ${err}`);
      alert("문제가 발생하였습니다. 다시 시도해주세요.");
    } finally {
      setLoading((s) => ({ ...s, upload: false, translating: false }));
    }
  };

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

  return (
    <div className="space-y-4">
      <div>
        <label className="block font-medium">Client ID</label>
        <input
          className="mt-1 w-full border border-blue-200 rounded p-2"
          placeholder="Enter Client ID"
          value={creds.client_id}
          onChange={(e) =>
            setCreds((c) => ({ ...c, client_id: e.target.value }))
          }
        />
      </div>
      <div>
        <label className="block font-medium">Client Secret</label>
        <input
          type="password"
          className="mt-1 w-full border border-blue-200 rounded p-2"
          placeholder="Enter Client Secret"
          value={creds.client_secret}
          onChange={(e) =>
            setCreds((c) => ({ ...c, client_secret: e.target.value }))
          }
        />
      </div>

      <button
        onClick={getToken}
        disabled={!creds.client_id || !creds.client_secret || loading.auth}
        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading.auth && <FiLoader className="animate-spin" />} Get Token
      </button>

      {token && (
        <div className="bg-white p-4 rounded shadow space-y-4">
          <div className="flex justify-between items-center">
            <code className="break-all">{token.access_token}</code>
            <button onClick={copyToken} className="text-blue-600">
              <FiCopy size={20} />
            </button>
          </div>
          <p>Expires in: {countdown}s</p>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block"
          />
          <button
            onClick={uploadTranslate}
            disabled={!file || loading.upload || loading.translating}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading.upload ? (
              <>
                <FiLoader className="animate-spin" /> Uploading
              </>
            ) : loading.translating ? (
              <>
                <FiLoader className="animate-spin" /> Translating
              </>
            ) : (
              "Upload & Translate"
            )}
          </button>
          {urn && (
            <div className="flex items-center gap-2">
              <code className="break-all">{urn}</code>
              <button onClick={copyUrn} className="text-blue-600">
                <FiCopy size={20} />
              </button>
              <button onClick={viewModel} className="text-blue-600">
                <FiEye size={20} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
