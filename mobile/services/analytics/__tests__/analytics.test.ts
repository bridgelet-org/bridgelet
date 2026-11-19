jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
  },
}));

const originalEnv = {
  environment: process.env.EXPO_PUBLIC_ENV,
  domain: process.env.EXPO_PUBLIC_PLAUSIBLE_DOMAIN,
  apiHost: process.env.EXPO_PUBLIC_PLAUSIBLE_API_HOST,
};
const originalDev = __DEV__;
const originalFetch = global.fetch;

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

describe("mobile analytics", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_ENV = "production";
    process.env.EXPO_PUBLIC_PLAUSIBLE_DOMAIN = "bridgelet.app";
    process.env.EXPO_PUBLIC_PLAUSIBLE_API_HOST = "https://stats.example.test/";
    Object.defineProperty(globalThis, "__DEV__", { configurable: true, value: false });
    jest.doMock("expo-constants", () => ({
      __esModule: true,
      default: { appOwnership: "standalone" },
    }));
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    restoreEnv("EXPO_PUBLIC_ENV", originalEnv.environment);
    restoreEnv("EXPO_PUBLIC_PLAUSIBLE_DOMAIN", originalEnv.domain);
    restoreEnv("EXPO_PUBLIC_PLAUSIBLE_API_HOST", originalEnv.apiHost);
    Object.defineProperty(globalThis, "__DEV__", { configurable: true, value: originalDev });
    global.fetch = originalFetch;
    jest.dontMock("expo-constants");
  });

  it("sends canonical event names and mobile platform to Plausible", async () => {
    jest.isolateModules(() => {
      const { track } = require("../index") as typeof import("../index");
      track({
        name: "Claim Failed",
        params: { claim_id: "claim-123", error_type: "unknown", attempt_number: 1 },
      });
    });

    await Promise.resolve();

    expect(global.fetch).toHaveBeenCalledWith(
      "https://stats.example.test/api/event",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );

    const requestBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body as string);
    expect(requestBody).toMatchObject({
      name: "Claim Failed",
      domain: "bridgelet.app",
      props: { claim_id: "claim-123", platform: expect.stringMatching(/^(ios|android|web)$/) },
    });
  });

  it("attaches the shared mobile base payload", async () => {
    jest.isolateModules(() => {
      const { track } = require("../index") as typeof import("../index");
      track({
        name: "Claim Submitted",
        params: { claim_id: "claim-456" },
      });
    });

    await Promise.resolve();

    const requestBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body as string);
    expect(requestBody.props).toMatchObject({
      anonymous_id: expect.any(String),
      session_id: expect.any(String),
      journey: "recipient",
      network: "testnet",
      timestamp: expect.any(String),
    });
  });

  it("only logs locally in development builds", async () => {
    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    Object.defineProperty(globalThis, "__DEV__", { configurable: true, value: true });

    jest.isolateModules(() => {
      const { track } = require("../index") as typeof import("../index");
      track({ name: "Screen Viewed", params: { screen: "claim_entry" } });
    });

    await Promise.resolve();

    expect(global.fetch).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("[Analytics]", "Screen Viewed", { screen: "claim_entry" });
    log.mockRestore();
  });
});
