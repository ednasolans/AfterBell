import { supabase } from "@/lib/supabase";
import { createQueryBuilderMock } from "@/test-utils/supabaseQueryMock";

import { fetchMyAddresses } from "./fetchMyAddresses";

// Replace the real client: tests must not need a database
jest.mock("@/lib/supabase", () => ({
  supabase: { from: jest.fn(), auth: { getUser: jest.fn() } },
}));

const ADDRESSES = [
  { id: "address-1", address: "C/ Major 1", city: "Lleida" },
  { id: "address-2", address: "Av. Catalunya 5", city: "Balaguer" },
];

function mockUser(user: { id: string } | null) {
  jest.mocked(supabase.auth.getUser).mockResolvedValue({
    data: { user },
  } as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>);
}

function mockQuery(result: Parameters<typeof createQueryBuilderMock>[0]) {
  const builder = createQueryBuilderMock(result);
  jest
    .mocked(supabase.from)
    .mockReturnValue(builder as unknown as ReturnType<typeof supabase.from>);
  return builder;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("fetchMyAddresses", () => {
  it("returns the addresses of the logged-in provider, oldest first", async () => {
    mockUser({ id: "provider-1" });
    const query = mockQuery({ data: ADDRESSES, error: null });

    await expect(fetchMyAddresses()).resolves.toEqual(ADDRESSES);
    expect(supabase.from).toHaveBeenCalledWith("addresses");
    expect(query.eq).toHaveBeenCalledWith("provider_id", "provider-1");
    expect(query.order).toHaveBeenCalledWith("created_at", {
      ascending: true,
    });
  });

  it("throws without a logged-in user", async () => {
    mockUser(null);

    await expect(fetchMyAddresses()).rejects.toThrow("logged in");
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("throws when the database returns an error", async () => {
    mockUser({ id: "provider-1" });
    mockQuery({ data: null, error: { message: "Database error" } });

    await expect(fetchMyAddresses()).rejects.toThrow("Database error");
  });
});
