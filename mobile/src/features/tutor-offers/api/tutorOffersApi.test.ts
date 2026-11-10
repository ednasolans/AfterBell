
import { supabase } from "@/lib/supabase";

import {
  createTutorOffer,
  fetchPublishedTutorOffers,
  publishTutorOffer,
  TutorOfferPublicationError,
} from "./tutorOffersApi";

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

const mockFrom = supabase.from as jest.Mock;
const mockRpc = supabase.rpc as jest.Mock;
const mockGetUser = supabase.auth.getUser as jest.Mock;

const row = {
  id: "offer-1",
  tutor_id: "tutor-1",
  technical_sheet_id: "sheet-1",
  title: "Mathematics lessons",
  description: null,
  subject_codes: ["mathematics"],
  level_codes: ["secondary"],
  price_per_hour: 20,
  category: "tutoring",
  status: "draft",
  created_at: "2026-11-10T10:00:00Z",
  updated_at: "2026-11-10T10:00:00Z",
};

function makeQuery(result: {
  data: unknown;
  error: Error | null;
}) {
  const query: Record<string, jest.Mock> = {};

  for (const method of [
    "insert",
    "update",
    "delete",
    "select",
    "eq",
    "order",
    "single",
    "maybeSingle",
  ]) {
    query[method] = jest.fn().mockReturnValue(query);
  }

  query.single.mockResolvedValue(result);
  query.maybeSingle.mockResolvedValue(result);

  // Supabase queries can also be awaited without single().
  (query as Record<string, unknown>).then = (
    resolve: (value: typeof result) => void,
  ) => Promise.resolve(result).then(resolve);

  return query;
}

beforeEach(() => {
  jest.clearAllMocks();

  mockGetUser.mockResolvedValue({
    data: { user: { id: "tutor-1" } },
    error: null,
  });
});

describe("Tutor offers API", () => {
  it("creates an offer in draft status", async () => {
    const query = makeQuery({
      data: row,
      error: null,
    });

    mockFrom.mockReturnValue(query);

    const result = await createTutorOffer({
      technicalSheetId: "sheet-1",
      title: "Mathematics lessons",
      description: "",
      subjectCodes: ["mathematics"],
      levelCodes: ["secondary"],
      pricePerHour: 20,
    });

    expect(mockFrom).toHaveBeenCalledWith("tutor_offers");

    expect(query.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        tutor_id: "tutor-1",
        status: "draft",
      }),
    );

    expect(result.id).toBe("offer-1");
    expect(result.status).toBe("draft");
  });

  it("rejects publishing an incomplete offer", async () => {
    mockRpc.mockResolvedValue({
      data: ["subjects", "levels", "price"],
      error: null,
    });

    await expect(
      publishTutorOffer("offer-1"),
    ).rejects.toBeInstanceOf(
      TutorOfferPublicationError,
    );

    expect(mockRpc).toHaveBeenCalledWith(
      "tutor_offer_publication_issues",
      { p_offer_id: "offer-1" },
    );

    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns published offers only", async () => {
    const query = makeQuery({
      data: [{ ...row, status: "published" }],
      error: null,
    });

    mockFrom.mockReturnValue(query);

    const result = await fetchPublishedTutorOffers();

    expect(query.eq).toHaveBeenCalledWith(
      "status",
      "published",
    );

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("published");
  });
});
