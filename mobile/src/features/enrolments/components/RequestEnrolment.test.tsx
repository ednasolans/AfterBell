import { fireEvent, render, screen } from "@testing-library/react-native";

import {
  createQueryClientWrapper,
  createTestQueryClient,
} from "@/test-utils/queryClientWrapper";

import { fetchEnrolmentProfiles } from "../api/fetchEnrolmentProfiles";
import { fetchMyEnrolmentRequests } from "../api/fetchMyEnrolmentRequests";
import { sendEnrolmentRequests } from "../api/sendEnrolmentRequests";
import { type EnrolmentRequest } from "../types";
import { RequestEnrolment } from "./RequestEnrolment";

jest.mock("../api/fetchEnrolmentProfiles", () => ({
  fetchEnrolmentProfiles: jest.fn(),
}));
jest.mock("../api/fetchMyEnrolmentRequests", () => ({
  fetchMyEnrolmentRequests: jest.fn(),
}));
jest.mock("../api/sendEnrolmentRequests", () => ({
  sendEnrolmentRequests: jest.fn(),
}));

const ACTIVITY = { id: "a1", endDate: null, maxParticipants: 10 };
const PROFILES = [
  { id: "anna", firstName: "Anna" },
  { id: "pau", firstName: "Pau" },
];
const REQUEST: EnrolmentRequest = {
  id: "r1",
  activityId: "a1",
  activityTitle: "Swimming",
  activityAvailable: true,
  familyProfileId: "anna",
  familyProfileName: "Anna",
  message: null,
  status: "pending",
  createdAt: "2027-07-01T10:00:00Z",
};

function mockData(profiles = PROFILES, requests: EnrolmentRequest[] = []) {
  jest.mocked(fetchEnrolmentProfiles).mockResolvedValue(profiles);
  jest.mocked(fetchMyEnrolmentRequests).mockResolvedValue(requests);
}

async function renderSection(
  props: Partial<Parameters<typeof RequestEnrolment>[0]> = {},
) {
  const callbacks = { onAddProfile: jest.fn(), onOpenRequests: jest.fn() };
  await render(
    <RequestEnrolment
      activity={ACTIVITY}
      enrolledCount={3}
      {...callbacks}
      {...props}
    />,
    { wrapper: createQueryClientWrapper(createTestQueryClient()) },
  );
  return callbacks;
}

async function chooseProfile(name: RegExp) {
  await fireEvent.press(
    screen.getByRole("button", {
      name: "Who would attend: Choose family profiles",
    }),
  );
  await fireEvent.press(screen.getByRole("checkbox", { name }));
  await fireEvent.press(screen.getByRole("button", { name: "Done" }));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("RequestEnrolment", () => {
  it("sends a request for the chosen profile and confirms it", async () => {
    mockData();
    jest.mocked(sendEnrolmentRequests).mockResolvedValue();
    await renderSection();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Request enrolment" }),
    );
    await chooseProfile(/Pau/);
    await fireEvent.changeText(
      screen.getByLabelText("Message (optional)"),
      "Hello",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Send request" }));

    expect(sendEnrolmentRequests).toHaveBeenCalledWith(
      { activityId: "a1", form: { profileIds: ["pau"], message: "Hello" } },
      expect.anything(),
    );
    expect(
      await screen.findByText(
        "Request sent. The provider will accept or reject it.",
      ),
    ).toBeOnTheScreen();
  });

  it("asks to choose a profile before sending", async () => {
    mockData();
    await renderSection();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Request enrolment" }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Send request" }));

    expect(screen.getByText("Choose who would attend")).toBeOnTheScreen();
    expect(sendEnrolmentRequests).not.toHaveBeenCalled();
  });

  it("shows why the server rejected the request", async () => {
    mockData();
    jest
      .mocked(sendEnrolmentRequests)
      .mockRejectedValue(new Error("This activity is full"));
    await renderSection();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Request enrolment" }),
    );
    await chooseProfile(/Anna/);
    await fireEvent.press(screen.getByRole("button", { name: "Send request" }));

    expect(await screen.findByText("This activity is full")).toBeOnTheScreen();
  });

  it("shows the existing request and only offers the other profiles", async () => {
    mockData(PROFILES, [REQUEST]);
    const { onOpenRequests } = await renderSection();

    expect(await screen.findByText("Anna")).toBeOnTheScreen();
    expect(screen.getByText("Pending")).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole("button", { name: "Request enrolment" }),
    );
    await fireEvent.press(
      screen.getByRole("button", {
        name: "Who would attend: Choose family profiles",
      }),
    );
    expect(screen.queryByRole("checkbox", { name: /Anna/ })).toBeNull();
    expect(screen.getByRole("checkbox", { name: /Pau/ })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Done" }));
    await fireEvent.press(
      screen.getByRole("button", { name: "See my requests" }),
    );
    expect(onOpenRequests).toHaveBeenCalled();
  });

  it("says so when every profile already has a request", async () => {
    mockData([PROFILES[0]], [REQUEST]);
    await renderSection();

    expect(
      await screen.findByText(
        "Everyone in your family already has a request for this activity.",
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Request enrolment" }),
    ).toBeNull();
  });

  it("does not offer the button when the activity is full", async () => {
    mockData();
    await renderSection({ enrolledCount: 10 });

    expect(
      await screen.findByText(
        "This activity is full. You can ask again if a place becomes free.",
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Request enrolment" }),
    ).toBeNull();
  });

  it("does not offer the button when the activity has finished", async () => {
    mockData();
    await renderSection({
      activity: { ...ACTIVITY, endDate: "2020-01-01" },
    });

    expect(
      await screen.findByText(
        "This activity has finished, so it does not accept requests.",
      ),
    ).toBeOnTheScreen();
  });

  it("guides a family without profiles to add one", async () => {
    mockData([]);
    const { onAddProfile } = await renderSection();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Add a family profile" }),
    );

    expect(onAddProfile).toHaveBeenCalled();
  });

  it("offers to try again when the requests cannot be loaded", async () => {
    jest.mocked(fetchEnrolmentProfiles).mockResolvedValue(PROFILES);
    jest
      .mocked(fetchMyEnrolmentRequests)
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValue([]);
    await renderSection();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Try again" }),
    );

    expect(
      await screen.findByRole("button", { name: "Request enrolment" }),
    ).toBeOnTheScreen();
  });
});
