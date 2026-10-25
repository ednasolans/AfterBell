
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { Alert } from "react-native";

import type { FamilyProfile } from "../types";
import { useActiveProfile } from "../context/ActiveProfileProvider";
import { ActiveProfileSelector } from "./ActiveProfileSelector";

jest.mock("../context/ActiveProfileProvider", () => ({
  useActiveProfile: jest.fn(),
}));

const mockedUseActiveProfile = jest.mocked(useActiveProfile);

const mockSetActiveProfile = jest.fn<Promise<void>, [string]>();
const mockRefreshProfiles = jest.fn<Promise<void>, []>();

const PAU = {
  id: "10000000-0000-4000-8000-000000000001",
  family_group_id: "20000000-0000-4000-8000-000000000001",
  first_name: "Pau",
  age_range: "7-9",
  interests: ["football"],
  created_at: "2026-01-01T10:00:00.000Z",
} as FamilyProfile;

const LAIA = {
  id: "10000000-0000-4000-8000-000000000002",
  family_group_id: PAU.family_group_id,
  first_name: "Laia",
  age_range: "4-6",
  interests: ["music"],
  created_at: "2026-01-02T10:00:00.000Z",
} as FamilyProfile;

function mockContext(
  overrides: Partial<ReturnType<typeof useActiveProfile>> = {},
) {
  mockedUseActiveProfile.mockReturnValue({
    activeProfile: PAU,
    activeProfileId: PAU.id,
    profiles: [PAU, LAIA],
    isLoading: false,
    isError: false,
    setActiveProfile: mockSetActiveProfile,
    refreshProfiles: mockRefreshProfiles,
    ...overrides,
  });
}

describe("ActiveProfileSelector", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockSetActiveProfile.mockResolvedValue(undefined);
    mockRefreshProfiles.mockResolvedValue(undefined);

    mockContext();
  });

  test("shows the active profile in the header", async () => {
    await render(<ActiveProfileSelector />);

    expect(
      screen.getByLabelText(
        "Active profile: Pau. Change profile",
      ),
    ).toBeTruthy();
  });

  test("opens the profile selector", async () => {
    await render(<ActiveProfileSelector />);

    await fireEvent.press(
      screen.getByLabelText(
        "Active profile: Pau. Change profile",
      ),
    );

    expect(
      screen.getByText("Switch active profile"),
    ).toBeTruthy();

    expect(screen.getByText("Laia")).toBeTruthy();
  });

  test("shows the main profile label", async () => {
    await render(<ActiveProfileSelector />);

    await fireEvent.press(
      screen.getByLabelText(
        "Active profile: Pau. Change profile",
      ),
    );

    expect(
      screen.getByText("Main profile"),
    ).toBeTruthy();
  });

  test("shows the selected profile", async () => {
    await render(<ActiveProfileSelector />);

    await fireEvent.press(
      screen.getByLabelText(
        "Active profile: Pau. Change profile",
      ),
    );

    
    expect(
      screen.getByLabelText("Select Pau").props.accessibilityState,
        ).toEqual(
        expect.objectContaining({
            selected: true,
      }),
    );

    expect(
      screen.getByLabelText("Select Laia").props.accessibilityState,
        ).toEqual(
        expect.objectContaining({
            selected: false,
      }),
    );

  });

  test("switches to another profile", async () => {
    await render(<ActiveProfileSelector />);

    await fireEvent.press(
      screen.getByLabelText(
        "Active profile: Pau. Change profile",
      ),
    );

    await fireEvent.press(
      screen.getByLabelText("Select Laia"),
    );

    await waitFor(() => {
      expect(mockSetActiveProfile).toHaveBeenCalledWith(
        LAIA.id,
      );
    });

    await waitFor(() => {
      expect(
        screen.queryByText("Switch active profile"),
      ).toBeNull();
    });
  });

  test("closes the selector when Cancel is pressed", async () => {
    await render(<ActiveProfileSelector />);

    await fireEvent.press(
      screen.getByLabelText(
        "Active profile: Pau. Change profile",
      ),
    );

    await fireEvent.press(screen.getByText("Cancel"));

    await waitFor(() => {
      expect(
        screen.queryByText("Switch active profile"),
      ).toBeNull();
    });

    expect(mockSetActiveProfile).not.toHaveBeenCalled();
  });

  test("shows an error if saving fails", async () => {
    mockSetActiveProfile.mockRejectedValue(
      new Error("Storage error"),
    );

    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => {});

    try {
      await render(<ActiveProfileSelector />);

      await fireEvent.press(
        screen.getByLabelText(
          "Active profile: Pau. Change profile",
        ),
      );

      await fireEvent.press(
        screen.getByLabelText("Select Laia"),
      );

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          "Error",
          "Could not save the active profile. Please try again.",
        );
      });

      expect(
        screen.getByText("Switch active profile"),
      ).toBeTruthy();
    } finally {
      alertSpy.mockRestore();
    }
  });

  test("shows the loading indicator", async () => {
    mockContext({
      isLoading: true,
    });

    await render(<ActiveProfileSelector />);

    expect(
      screen.getByLabelText("Loading profiles"),
    ).toBeTruthy();
  });

  test("shows a message when loading fails", async () => {
    mockContext({
      isError: true,
    });

    await render(<ActiveProfileSelector />);

    expect(
      screen.getByText("Profiles unavailable"),
    ).toBeTruthy();
  });

  test("shows a message when there are no profiles", async () => {
    mockContext({
      activeProfile: null,
      activeProfileId: null,
      profiles: [],
    });

    await render(<ActiveProfileSelector />);

    expect(
      screen.getByText("No profiles"),
    ).toBeTruthy();
  });

  test("updates the header when the active profile changes", async () => {
    mockContext({
      activeProfile: LAIA,
      activeProfileId: LAIA.id,
    });

    await render(<ActiveProfileSelector />);

    expect(
      screen.getByLabelText(
        "Active profile: Laia. Change profile",
      ),
    ).toBeTruthy();
  });
});
