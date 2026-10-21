import {
  createQueryBuilderMock,
  type QueryBuilderMock,
} from "@/test-utils/supabaseQueryMock";

import { supabase } from "../../../lib/supabase";
import { type TechnicalSheetForm } from "../types";
import { saveTechnicalSheet } from "./saveTechnicalSheet";
import { toTechnicalSheetInsert } from "./toTechnicalSheetInsert";

// Replace the real client: tests must not need a database or environment variables
jest.mock("../../../lib/supabase", () => ({
  supabase: { from: jest.fn() },
}));

const mockedFrom = jest.mocked(supabase.from);

const SHEET: TechnicalSheetForm = {
  name: "Lleida Swimming Club",
  providerType: "sports_club",
  description: "",
  addresses: [
    { address: "C/ Major 1", city: "Lleida" },
    { address: "Av. Catalunya 5", city: "Balaguer" },
  ],
  phoneNumber: "973 000 000",
  email: "",
  website: "",
  activityTypes: ["swimming"],
  facilities: [],
};

const ONE_ADDRESS_SHEET: TechnicalSheetForm = {
  ...SHEET,
  addresses: [SHEET.addresses[0]],
};

const OK = { data: null, error: null };
const FAILED = { data: null, error: { message: "Database error" } };

// Each call to supabase.from() returns the next builder, in order
function mockQueries(...builders: QueryBuilderMock[]) {
  for (const builder of builders) {
    mockedFrom.mockReturnValueOnce(
      builder as unknown as ReturnType<typeof supabase.from>,
    );
  }
}

beforeEach(() => {
  mockedFrom.mockReset();
});

describe("saveTechnicalSheet", () => {
  it("saves the addresses and then the sheet with the main address", async () => {
    const main = createQueryBuilderMock({ data: { id: "main" }, error: null });
    const others = createQueryBuilderMock({
      data: [{ id: "other" }],
      error: null,
    });
    const sheet = createQueryBuilderMock(OK);
    mockQueries(main, others, sheet);

    await saveTechnicalSheet(SHEET);

    expect(mockedFrom.mock.calls).toEqual([
      ["addresses"],
      ["addresses"],
      ["technical_sheets"],
    ]);
    expect(main.insert).toHaveBeenCalledWith({
      address: "C/ Major 1",
      city: "Lleida",
    });
    expect(others.insert).toHaveBeenCalledWith([
      { address: "Av. Catalunya 5", city: "Balaguer" },
    ]);
    expect(sheet.insert).toHaveBeenCalledWith(
      toTechnicalSheetInsert(SHEET, "main"),
    );
  });

  it("does not make a second address insert when there is only one address", async () => {
    mockQueries(
      createQueryBuilderMock({ data: { id: "main" }, error: null }),
      createQueryBuilderMock(OK),
    );

    await saveTechnicalSheet(ONE_ADDRESS_SHEET);

    expect(mockedFrom.mock.calls).toEqual([
      ["addresses"],
      ["technical_sheets"],
    ]);
  });

  it("throws and saves nothing else when the main address is rejected", async () => {
    mockQueries(createQueryBuilderMock(FAILED));

    await expect(saveTechnicalSheet(SHEET)).rejects.toThrow("Database error");
    expect(mockedFrom).toHaveBeenCalledTimes(1);
  });

  it("deletes the main address when the other addresses are rejected", async () => {
    const cleanUp = createQueryBuilderMock(OK);
    mockQueries(
      createQueryBuilderMock({ data: { id: "main" }, error: null }),
      createQueryBuilderMock(FAILED),
      cleanUp,
    );

    await expect(saveTechnicalSheet(SHEET)).rejects.toThrow("Database error");
    expect(cleanUp.delete).toHaveBeenCalled();
    expect(cleanUp.in).toHaveBeenCalledWith("id", ["main"]);
  });

  it("deletes every new address when the sheet is rejected", async () => {
    const cleanUp = createQueryBuilderMock(OK);
    mockQueries(
      createQueryBuilderMock({ data: { id: "main" }, error: null }),
      createQueryBuilderMock({ data: [{ id: "other" }], error: null }),
      createQueryBuilderMock({
        data: null,
        error: { message: "new row violates row-level security policy" },
      }),
      cleanUp,
    );

    await expect(saveTechnicalSheet(SHEET)).rejects.toThrow(
      "row-level security",
    );
    expect(cleanUp.in).toHaveBeenCalledWith("id", ["main", "other"]);
  });
});
