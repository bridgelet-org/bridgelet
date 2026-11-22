import { Buffer } from "buffer";
import { claimIdFromQrValue } from "../token";

const validToken = (): string => {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  const signature = Buffer.from("signature").toString("base64url");
  return `${header}.${payload}.${signature}`;
};

describe("claimIdFromQrValue", () => {
  it("extracts a valid claim token from a QR claim URL", () => {
    const token = validToken();

    expect(claimIdFromQrValue(`https://bridgelet.app/c/${token}`)).toBe(token);
  });

  it("returns null for an invalid QR payload", () => {
    expect(claimIdFromQrValue("not-a-claim-link")).toBeNull();
  });
});
