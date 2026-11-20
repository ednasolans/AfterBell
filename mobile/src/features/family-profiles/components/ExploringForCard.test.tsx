import { fireEvent, render, screen } from "@testing-library/react-native";

import { useActiveProfile } from "../context/ActiveProfileProvider";
import type { FamilyProfile } from "../types";
import { ExploringForCard } from "./ExploringForCard";

jest.mock("../context/ActiveProfileProvider", () => ({
  useActiveProfile: jest.fn(),
}));

const mockedUseActiveProfile = jest.mocked(useActiveProfile);
const mockSetActiveProfile = jest.fn<Promise<void>, [string]>();

const MARC = {
  id: "p1",
  family_group_id: "g1",
  first_name: "Marc",
  age_range: "7-9",
  date_of_birth: null,
  interests: [],
  created_at: "2026-01-01T10:00:00.000Z",
} as FamilyProfile;

const LAIA = { ...MARC, id: "p2", first_name: "Laia", age_range: null };

function mockContext(
  overrides: Partial<ReturnType<typeof useActiveProfile>> = {},
) {
  mockedUseActiveProfile.mockReturnValue({
    activeProfile: MARC,
    activeProfileId: MARC.id,
    profiles: [MARC, LAIA],
    isLoading: false,
    isError: false,
    setActiveProfile: mockSetActiveProfile,
    refreshProfiles: jest.fn(),
    ...overrides,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSetActiveProfile.mockResolvedValue(undefined);
  mockContext();
});

describe("ExploringForCard", () => {
  it("shows who the activities are for, with the age", async () => {
    await render(<ExploringForCard onAddProfile={jest.fn()} />);

    expect(
      screen.getByRole("button", {
        name: "Exploring for Marc, 7–9 years. Change profile",
      }),
    ).toBeTruthy();
  });

  it("shows only the name when the profile has no age", async () => {
    mockContext({ activeProfile: LAIA, activeProfileId: LAIA.id });
    await render(<ExploringForCard onAddProfile={jest.fn()} />);

    expect(
      screen.getByRole("button", {
        name: "Exploring for Laia. Change profile",
      }),
    ).toBeTruthy();
  });

  it("changes the active profile", async () => {
    await render(<ExploringForCard onAddProfile={jest.fn()} />);

    await fireEvent.press(
      screen.getByRole("button", { name: /^Exploring for/ }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Select Laia" }));

    expect(mockSetActiveProfile).toHaveBeenCalledWith("p2");
  });

  it("leads to adding a profile when there is none", async () => {
    mockContext({ activeProfile: null, activeProfileId: null, profiles: [] });
    const onAddProfile = jest.fn();
    await render(<ExploringForCard onAddProfile={onAddProfile} />);

    await fireEvent.press(
      screen.getByRole("button", { name: "Add a family profile" }),
    );

    expect(onAddProfile).toHaveBeenCalled();
  });

  it.each([
    [{ isLoading: true }, "Loading profiles…"],
    [{ isError: true }, "Profiles unavailable"],
  ])("shows a message while %j", async (state, message) => {
    mockContext({ activeProfile: null, ...state });
    await render(<ExploringForCard onAddProfile={jest.fn()} />);

    expect(screen.getByText(message)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
