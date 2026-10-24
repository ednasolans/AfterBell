
import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react-native";

import { useFamilyProfiles } from "../hooks/useFamilyProfiles";
import { FamilyProfilesList } from "./FamilyProfilesList";

jest.mock("../hooks/useFamilyProfiles", () => ({
  useFamilyProfiles: jest.fn(),
}));

const mockedUseFamilyProfiles = jest.mocked(useFamilyProfiles);

const PROFILE = {
  id: "profile-1",
  family_group_id: "group-1",
  first_name: "Anna",
  age_range: "7-9",
  interests: ["music"],
  created_at: "2026-10-24T10:00:00Z",
};

function mockQueryResult(
  values: Record<string, unknown>,
) {
  mockedUseFamilyProfiles.mockReturnValue(
    values as ReturnType<typeof useFamilyProfiles>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("FamilyProfilesList", () => {
  it("shows loading state", async () => {
    mockQueryResult({
      data: undefined,
      isPending: true,
      isError: false,
    });

    await render(
      <FamilyProfilesList
        userId="user-1"
        onCreate={jest.fn()}
        onEdit={jest.fn()}
      />,
    );

    expect(
      screen.getByLabelText("Loading profiles"),
    ).toBeTruthy();
  });

  it("shows the first profile button when the list is empty", async () => {
    mockQueryResult({
      data: [],
      isPending: false,
      isError: false,
    });

    const onCreate = jest.fn();

    await render(
      <FamilyProfilesList
        userId="user-1"
        onCreate={onCreate}
        onEdit={jest.fn()}
      />,
    );

    expect(
      screen.getByText("Create your first profile"),
    ).toBeTruthy();

    await fireEvent.press(
      screen.getByText("Create your first profile"),
    );

    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("shows existing profiles with their names and ages", async () => {
    mockQueryResult({
      data: [PROFILE],
      isPending: false,
      isError: false,
    });

    await render(
      <FamilyProfilesList
        userId="user-1"
        onCreate={jest.fn()}
        onEdit={jest.fn()}
      />,
    );

    expect(screen.getByText("Anna")).toBeTruthy();
    expect(screen.getByText("Age: 7-9")).toBeTruthy();

    expect(
      screen.getByText("Add another profile"),
    ).toBeTruthy();
  });

  it("calls onEdit with the correct profile id", async () => {
    mockQueryResult({
      data: [PROFILE],
      isPending: false,
      isError: false,
    });

    const onEdit = jest.fn();

    await render(
      <FamilyProfilesList
        userId="user-1"
        onCreate={jest.fn()}
        onEdit={onEdit}
      />,
    );

    await fireEvent.press(
      screen.getByLabelText("Edit Anna"),
    );

    expect(onEdit).toHaveBeenCalledWith("profile-1");
  });

  it("shows an error and allows retrying", async () => {
    const refetch = jest.fn();

    mockQueryResult({
      data: undefined,
      isPending: false,
      isError: true,
      refetch,
    });

    await render(
      <FamilyProfilesList
        userId="user-1"
        onCreate={jest.fn()}
        onEdit={jest.fn()}
      />,
    );

    expect(
      screen.getByText("Could not load family profiles."),
    ).toBeTruthy();

    await fireEvent.press(screen.getByText("Try again"));

    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
