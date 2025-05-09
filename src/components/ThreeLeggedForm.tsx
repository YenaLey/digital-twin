"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { FiCopy, FiLoader } from "react-icons/fi";

export default function ThreeLeggedForm({
  onTokenSet,
}: {
  onTokenSet: () => void;
}) {
  const [creds, setCreds] = useState({ client_id: "", client_secret: "" });
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [expiryTime, setExpiryTime] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState({ auth: false, refresh: false });

  const params = useSearchParams();
  const code = params.get("code");
  const state = params.get("state");

  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const startAuth = () => {
    const { client_id, client_secret } = creds;
    const callbackURL = `${window.location.origin}/auth/callback`;
    const scope = [
      "data:read",
      "data:write",
      "bucket:read",
      "bucket:create",
      "viewables:read",
    ];
    const st = btoa(`${client_id}:${client_secret}`);
    const authUrl = [
      "https://developer.api.autodesk.com/authentication/v2/authorize",
      `?response_type=code`,
      `&client_id=${encodeURIComponent(client_id)}`,
      `&redirect_uri=${encodeURIComponent(callbackURL)}`,
      `&scope=${encodeURIComponent(scope.join(" "))}`,
      `&state=${encodeURIComponent(st)}`,
    ].join("");
    window.location.href = authUrl;
  };

  useEffect(() => {
    if (!code || !state) return;
    setLoading({ auth: true, refresh: false });
    fetch(`/api/auth/callback?code=${code}&state=${state}`)
      .then((r) => r.json())
      .then((data: TokenInfo) => {
        setTokenInfo(data);
        onTokenSet();
        const expireAt = Date.now() + data.expires_in * 1000;
        setExpiryTime(expireAt);
        setCountdown(Math.floor((expireAt - Date.now()) / 1000));
      })
      .finally(() => setLoading({ auth: false, refresh: false }));
  }, [code, state, onTokenSet]);

  useEffect(() => {
    if (!tokenInfo) return;
    const intervalId = setInterval(() => {
      const timeLeft = Math.floor((expiryTime - Date.now()) / 1000);
      setCountdown(timeLeft);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [tokenInfo, expiryTime]);

  const refreshToken = useCallback(async () => {
    if (!tokenInfo) return;
    setLoading((s) => ({ auth: s.auth, refresh: true }));
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tokenInfo),
      });
      const newData: TokenInfo = await res.json();
      setTokenInfo(newData);
      const newExpireAt = Date.now() + newData.expires_in * 1000;
      setExpiryTime(newExpireAt);
      setCountdown(Math.floor((newExpireAt - Date.now()) / 1000));
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      setLoading({ auth: false, refresh: false });
    }
  }, [tokenInfo]);

  useEffect(() => {
    if (countdown <= 60 && tokenInfo && !loading.refresh) {
      refreshToken();
    }
  }, [countdown, refreshToken, tokenInfo, loading.refresh]);

  const copyToken = async () => {
    if (tokenInfo) {
      await navigator.clipboard.writeText(tokenInfo.access_token);
      alert("토큰이 복사되었습니다.");
    }
  };

  if (!code) {
    const callbackUri = `${origin}/auth/callback`;
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">
          APS 개발자 콘솔에서 Callback URL를{" "}
          <code
            className="underline cursor-pointer"
            onClick={() => {
              navigator.clipboard.writeText(callbackUri);
              alert("Callback URL가 복사되었습니다.");
            }}
          >
            {callbackUri}
          </code>{" "}
          으로 등록하세요.
        </p>
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
          onClick={startAuth}
          disabled={!creds.client_id || !creds.client_secret || loading.auth}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading.auth && <FiLoader className="animate-spin" />}
          Login with Autodesk
        </button>
      </div>
    );
  }

  if (loading.auth)
    return (
      <p className="text-center">
        <FiLoader className="inline-block ml-2 animate-spin" />
      </p>
    );

  if (!tokenInfo) {
    return (
      <p className="text-center">
        <FiLoader className="inline-block ml-2 animate-spin" />
      </p>
    );
  }

  return (
    <div className="space-y-4 bg-white p-6 rounded-md shadow-md">
      <h3 className="text-xl font-semibold">3-Legged Token Info</h3>
      <div className="flex items-start gap-2">
        <div className="flex-grow">
          <p className="font-medium">Access Token:</p>
          <code className="break-all block text-sm text-gray-800">
            {tokenInfo.access_token}
          </code>
        </div>
        <button
          onClick={copyToken}
          className="text-blue-600 hover:text-blue-800 p-1"
        >
          <FiCopy size={20} />
        </button>
      </div>
      <div>
        <p className="font-medium">Refresh Token:</p>
        <code className="break-all block text-sm text-gray-600">
          {tokenInfo.refresh_token}
        </code>
      </div>
      <p className="text-sm text-gray-600">
        Expires in: <span className="font-semibold">{countdown}s</span>
        {loading.refresh && (
          <FiLoader className="inline-block ml-2 animate-spin" />
        )}
      </p>
    </div>
  );
}
