import { supabase } from "@/lib/supabase";

import { fetchContacts, toProviderContact } from "./providerContacts";

jest.mock("@/lib/supabase", () => ({
  supabase: { rpc: jest.fn() },
}));

const rpc = jest.mocked(supabase.rpc);

const ROW = {
  provider_id: "provider-1",
  name: "Sports Club",
  email: "club@example.com",
  phone_number: null,
  website: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("toProviderContact", () => {
  it("maps the columns to the app names", () => {
    expect(toProviderContact(ROW)).toEqual({
      name: "Sports Club",
      email: "club@example.com",
      phoneNumber: null,
      website: null,
    });
  });
});

describe("fetchContacts", () => {
  it("does not ask without providers", async () => {
    expect(await fetchContacts([])).toEqual(new Map());
    expect(rpc).not.toHaveBeenCalled();
  });

  it("keeps only the given providers", async () => {
    rpc.mockResolvedValue({
      data: [ROW, { ...ROW, provider_id: "provider-2", name: "Other" }],
      error: null,
    } as never);
    const contacts = await fetchContacts(["provider-1"]);
    expect(rpc).toHaveBeenCalledWith("public_provider_contacts");
    expect([...contacts.keys()]).toEqual(["provider-1"]);
    expect(contacts.get("provider-1")?.name).toBe("Sports Club");
  });

  it("throws the error of the database", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: "no sheets" },
    } as never);
    await expect(fetchContacts(["provider-1"])).rejects.toThrow("no sheets");
  });
});
