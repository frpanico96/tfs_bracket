import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockAddDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDoc = vi.fn((...args) => ({ id: args[2], path: args.join("/") }));
const mockQuery = vi.fn(() => ({}));
const mockWhere = vi.fn(() => ({}));
const mockServerTimestamp = vi.fn(() => ({ toDate: () => new Date() }));
const mockDb = {};
const mockInvitesRef = {};

vi.mock("../firebase", () => ({
  addDoc: mockAddDoc,
  getDocs: mockGetDocs,
  updateDoc: mockUpdateDoc,
  doc: mockDoc,
  query: mockQuery,
  where: mockWhere,
  serverTimestamp: mockServerTimestamp,
  db: mockDb,
  invitesRef: mockInvitesRef,
}));

const {
  createInvite,
  getInviteByToken,
  consumeInvite,
  buildInviteLink,
  INVITE_ROLES,
  isEmailInvited,
} = await import("../utils/invite");

describe("INVITE_ROLES", () => {
  it("contains tournament_admin role", () => {
    const r = INVITE_ROLES.find((r) => r.value === "tournament_admin");
    expect(r).toBeDefined();
    expect(r.label).toBe("Tournament Admin");
  });

  it("contains player role", () => {
    const r = INVITE_ROLES.find((r) => r.value === "player");
    expect(r).toBeDefined();
    expect(r.label).toBe("Player");
  });
});

describe("createInvite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddDoc.mockResolvedValue({ id: "invite-123" });
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
  });

  it("creates an invite document with expected fields", async () => {
    const result = await createInvite({
      email: "test@gmail.com",
      role: "tournament_admin",
      createdBy: "user-1",
      createdByName: "Admin User",
    });

    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const [ref, data] = mockAddDoc.mock.calls[0];
    expect(ref).toBe(mockInvitesRef);
    expect(data.email).toBe("test@gmail.com");
    expect(data.role).toBe("tournament_admin");
    expect(data.used).toBe(false);
    expect(data.createdBy).toBe("user-1");
    expect(data.createdByName).toBe("Admin User");
    expect(data.token).toBeDefined();
    expect(typeof data.token).toBe("string");
    expect(data.createdAt).toBeDefined();
    expect(result.id).toBe("invite-123");
    expect(result.token).toBe(data.token);
  });

  it("normalizes email to lowercase", async () => {
    await createInvite({
      email: "TestUser@GMAIL.COM",
      role: "player",
      createdBy: "user-1",
      createdByName: "Admin",
    });

    const [, data] = mockAddDoc.mock.calls[0];
    expect(data.email).toBe("testuser@gmail.com");
  });

  it("generates a unique token for each invite", async () => {
    mockAddDoc
      .mockResolvedValueOnce({ id: "invite-1" })
      .mockResolvedValueOnce({ id: "invite-2" });

    const first = await createInvite({ email: "a@gmail.com", role: "player", createdBy: "u1", createdByName: "A" });
    const second = await createInvite({ email: "b@gmail.com", role: "player", createdBy: "u1", createdByName: "A" });

    expect(first.token).not.toBe(second.token);
  });

  it("returns existing invite for same email and role instead of creating new", async () => {
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [{
        id: "existing-invite",
        data: () => ({
          token: "abc-123",
          email: "test@gmail.com",
          role: "tournament_admin",
          used: false,
        }),
      }],
    });

    const result = await createInvite({
      email: "test@gmail.com",
      role: "tournament_admin",
      createdBy: "u1",
      createdByName: "Admin",
    });

    expect(result.existing).toBe(true);
    expect(result.id).toBe("existing-invite");
    expect(result.token).toBe("abc-123");
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it("creates new invite when same email has different role", async () => {
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [{
        id: "existing-invite",
        data: () => ({
          token: "abc-123",
          email: "test@gmail.com",
          role: "tournament_admin",
          used: false,
        }),
      }],
    });
    mockAddDoc.mockResolvedValue({ id: "new-invite" });

    const result = await createInvite({
      email: "test@gmail.com",
      role: "player",
      createdBy: "u1",
      createdByName: "Admin",
    });

    expect(result.existing).toBeUndefined();
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
  });
});

describe("getInviteByToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns invite data when valid token is found and not used", async () => {
    const mockSnap = {
      empty: false,
      docs: [{
        id: "invite-1",
        data: () => ({
          token: "abc-123",
          email: "user@gmail.com",
          role: "tournament_admin",
          used: false,
        }),
      }],
    };
    mockGetDocs.mockResolvedValue(mockSnap);

    const result = await getInviteByToken("abc-123");

    expect(mockWhere).toHaveBeenCalledWith("token", "==", "abc-123");
    expect(mockGetDocs).toHaveBeenCalledTimes(1);
    expect(mockGetDocs).toHaveBeenCalledTimes(1);
    expect(result).not.toBeNull();
    expect(result.id).toBe("invite-1");
    expect(result.role).toBe("tournament_admin");
    expect(result.email).toBe("user@gmail.com");
  });

  it("returns null when token is not found", async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });

    const result = await getInviteByToken("unknown-token");
    expect(result).toBeNull();
  });

  it("returns null when invite has been used", async () => {
    const mockSnap = {
      empty: false,
      docs: [{
        id: "invite-1",
        data: () => ({
          token: "abc-123",
          email: "user@gmail.com",
          role: "tournament_admin",
          used: true,
        }),
      }],
    };
    mockGetDocs.mockResolvedValue(mockSnap);

    const result = await getInviteByToken("abc-123");
    expect(result).toBeNull();
  });
});

describe("consumeInvite", () => {
  it("updates the invite document to used: true", async () => {
    mockDoc.mockReturnValue({ id: "invite-1", path: "invites/invite-1" });

    await consumeInvite("invite-1");

    expect(mockDoc).toHaveBeenCalledWith(mockDb, "invites", "invite-1");
    expect(mockUpdateDoc).toHaveBeenCalledWith({ id: "invite-1", path: "invites/invite-1" }, { used: true });
  });
});

describe("buildInviteLink", () => {
  const originalLocation = window.location;

  afterEach(() => {
    Object.defineProperty(window, "location", { value: originalLocation });
  });

  it("builds a URL with the invite token", () => {
    Object.defineProperty(window, "location", {
      value: { origin: "https://tfs-bracket.web.app" },
      writable: true,
    });

    const link = buildInviteLink("abc-123");
    expect(link).toBe("https://tfs-bracket.web.app?invite=abc-123");
  });

  it("uses current origin for localhost", () => {
    Object.defineProperty(window, "location", {
      value: { origin: "http://localhost:5173" },
      writable: true,
    });

    const link = buildInviteLink("xyz-789");
    expect(link).toBe("http://localhost:5173?invite=xyz-789");
  });
});

describe("isEmailInvited", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when email has a matching invite", async () => {
    mockGetDocs.mockResolvedValue({ empty: false, docs: [{ id: "invite-1" }] });

    const result = await isEmailInvited("user@gmail.com");
    expect(result).toBe(true);
    expect(mockWhere).toHaveBeenCalledWith("email", "==", "user@gmail.com");
  });

  it("returns false when email has no invite", async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });

    const result = await isEmailInvited("unknown@gmail.com");
    expect(result).toBe(false);
  });

  it("normalizes email to lowercase", async () => {
    mockGetDocs.mockResolvedValue({ empty: false, docs: [{ id: "invite-2" }] });

    const result = await isEmailInvited("TestUser@GMAIL.COM");
    expect(result).toBe(true);
    expect(mockWhere).toHaveBeenCalledWith("email", "==", "testuser@gmail.com");
  });
});
