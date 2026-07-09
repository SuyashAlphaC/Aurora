import { config, isThousandEyesConfigured } from "../config.js";

/** ThousandEyes API v7 — network path visibility for shelter connectivity */
async function teFetch<T>(path: string): Promise<T> {
  const url = `${config.thousandEyes.baseUrl}${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.thousandEyes.token}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ThousandEyes API ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export interface NetworkTestSummary {
  testId: number;
  testName: string;
  enabled: boolean;
}

/** GET /tests — list configured network tests */
export async function listNetworkTests(): Promise<NetworkTestSummary[]> {
  if (!isThousandEyesConfigured()) return [];

  const data = await teFetch<{ tests?: Array<{ testId: number; testName: string; enabled: boolean }> }>(
    "/tests"
  );

  return (data.tests ?? []).map((t) => ({
    testId: t.testId,
    testName: t.testName,
    enabled: t.enabled,
  }));
}

/** Derive uplink health hint from test availability (PoC-level) */
export async function probeNetworkHealth(): Promise<{
  available: boolean;
  testCount: number;
  status: "healthy" | "degraded" | "unavailable";
}> {
  if (!isThousandEyesConfigured()) {
    return { available: false, testCount: 0, status: "unavailable" };
  }

  try {
    const tests = await listNetworkTests();
    const enabled = tests.filter((t) => t.enabled);
    return {
      available: true,
      testCount: enabled.length,
      status: enabled.length > 0 ? "healthy" : "degraded",
    };
  } catch {
    return { available: false, testCount: 0, status: "unavailable" };
  }
}

export async function checkThousandEyesConnection(): Promise<boolean> {
  const probe = await probeNetworkHealth();
  return probe.available;
}
