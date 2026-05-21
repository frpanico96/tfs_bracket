import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAddDoc = vi.fn();
const mockLogsRef = {};
const mockServerTimestamp = vi.fn(() => ({ toDate: () => new Date() }));

vi.mock("../firebase", () => ({
  addDoc: mockAddDoc,
  logsRef: mockLogsRef,
  serverTimestamp: mockServerTimestamp,
}));

const { logEvent } = await import("./logger");

describe("logEvent", () => {
  beforeEach(() => {
    mockAddDoc.mockClear();
    mockServerTimestamp.mockClear();
  });

  it("calls addDoc with level, action, details, and timestamp", async () => {
    await logEvent({ action: "test_action", details: { foo: "bar" } });
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const [ref, data] = mockAddDoc.mock.calls[0];
    expect(ref).toBe(mockLogsRef);
    expect(data).toMatchObject({
      level: "info",
      action: "test_action",
      details: { foo: "bar" },
    });
    expect(data.timestamp).toBeDefined();
  });

  it("defaults level to info", async () => {
    await logEvent({ action: "no_level" });
    const [, data] = mockAddDoc.mock.calls[0];
    expect(data.level).toBe("info");
  });

  it("accepts custom level", async () => {
    await logEvent({ level: "error", action: "error_action" });
    const [, data] = mockAddDoc.mock.calls[0];
    expect(data.level).toBe("error");
  });

  it("defaults details to empty object", async () => {
    await logEvent({ action: "no_details" });
    const [, data] = mockAddDoc.mock.calls[0];
    expect(data.details).toEqual({});
  });

  it("does not throw when addDoc fails", async () => {
    mockAddDoc.mockRejectedValueOnce(new Error("Firebase error"));
    await expect(logEvent({ action: "fail_test" })).resolves.toBeUndefined();
  });
});
