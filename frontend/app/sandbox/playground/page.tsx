"use client";

import { useState } from "react";
import { BridgeletClient } from "@/lib/create-bridgelet-client";
import type { BridgeletClientOptions } from "@/lib/create-bridgelet-client";

type Endpoint = "getClaimDetails" | "createPaymentIntent" | "redeemClaim";

const ENDPOINT_LABELS: Record<Endpoint, string> = {
  getClaimDetails: "GET /claim/:token",
  createPaymentIntent: "POST /send",
  redeemClaim: "POST /claim/:token/redeem",
};

const INITIAL_PARAMS: Record<Endpoint, Record<string, string>> = {
  getClaimDetails: { token: "demo_token_here" },
  createPaymentIntent: { senderPublicKey: "G...", amountStroops: "10000000", assetCode: "USDC" },
  redeemClaim: { token: "demo_token_here", recipientPublicKey: "G..." },
};

export default function PlaygroundPage() {
  const [selected, setSelected] = useState<Endpoint>("getClaimDetails");
  const [params, setParams] = useState<Record<string, string>>(INITIAL_PARAMS.getClaimDetails);
  const [response, setResponse] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const client = new BridgeletClient({
    baseUrl: process.env[`NEXT_PUBLIC_API_BASE_URL`],
    apiKey: process.env[`NEXT_PUBLIC_API_KEY`],
  } as BridgeletClientOptions);

  const handleEndpointChange = (endpoint: Endpoint) => {
    setSelected(endpoint);
    setParams(INITIAL_PARAMS[endpoint]);
    setResponse("");
    setError("");
  };

  const handleParamChange = (key: string, value: string) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const execute = async () => {
    setLoading(true);
    setResponse("");
    setError("");
    try {
      let result: unknown;
      switch (selected) {
        case "getClaimDetails":
          result = await client.getClaimDetails(params[`token`] ?? "");
          break;
        case "createPaymentIntent":
          result = await client.createPaymentIntent({
            senderPublicKey: params[`senderPublicKey`] ?? "",
            amountStroops: params[`amountStroops`] ?? "",
            assetCode: params[`assetCode`] ?? "",
          });
          break;
        case "redeemClaim":
          result = await client.redeemClaim(params[`token`] ?? "", {
            recipientPublicKey: params[`recipientPublicKey`] ?? "",
          });
          break;
      }
      setResponse(JSON.stringify(result, null, 2));
    } catch (err) {
      setError(JSON.stringify(err, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold">Bridgelet SDK Playground</h1>
      <p className="text-sm text-slate-500">Test SDK endpoints and inspect raw responses.</p>

      <div className="flex gap-2 flex-wrap">
        {(Object.keys(ENDPOINT_LABELS) as Endpoint[]).map((ep) => (
          <button
            key={ep}
            onClick={() => handleEndpointChange(ep)}
            className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              selected === ep
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {ENDPOINT_LABELS[ep]}
          </button>
        ))}
      </div>

      <div className="rounded-lg border p-4 space-y-3 bg-slate-50">
        <h2 className="text-sm font-semibold text-slate-700">Parameters</h2>
        {Object.entries(params).map(([key, val]) => (
          <div key={key} className="flex items-center gap-2">
            <label className="text-xs font-mono text-slate-500 w-40">{key}</label>
            <input
              value={val}
              onChange={(e) => handleParamChange(key, e.target.value)}
              className="flex-1 rounded border px-2 py-1 text-sm font-mono"
            />
          </div>
        ))}
        <button
          onClick={execute}
          disabled={loading}
          className="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? "Executing..." : "Execute"}
        </button>
      </div>

      {response && (
        <div className="rounded-lg border border-green-200 p-4 space-y-2 bg-green-50">
          <h2 className="text-sm font-semibold text-green-700">Response</h2>
          <pre className="text-xs font-mono whitespace-pre-wrap bg-white rounded p-3 border">{response}</pre>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 p-4 space-y-2 bg-red-50">
          <h2 className="text-sm font-semibold text-red-700">Error</h2>
          <pre className="text-xs font-mono whitespace-pre-wrap bg-white rounded p-3 border">{error}</pre>
        </div>
      )}
    </main>
  );
}
