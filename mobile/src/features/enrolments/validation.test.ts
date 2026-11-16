import { EMPTY_ENROLMENT_REQUEST_FORM } from "./types";
import { MESSAGE_MAX_LENGTH, validateEnrolmentRequest } from "./validation";

const VALID = { ...EMPTY_ENROLMENT_REQUEST_FORM, profileIds: ["anna"] };

describe("validateEnrolmentRequest", () => {
  it("accepts a request with one profile and no message", () => {
    expect(validateEnrolmentRequest(VALID)).toEqual({});
  });

  it("requires at least one profile", () => {
    expect(validateEnrolmentRequest(EMPTY_ENROLMENT_REQUEST_FORM)).toEqual({
      profileIds: "Choose who would attend",
    });
  });

  it("limits the message to the database limit", () => {
    const atLimit = { ...VALID, message: "a".repeat(MESSAGE_MAX_LENGTH) };
    const tooLong = { ...VALID, message: "a".repeat(MESSAGE_MAX_LENGTH + 1) };

    expect(validateEnrolmentRequest(atLimit)).toEqual({});
    expect(validateEnrolmentRequest(tooLong).message).toBe(
      `The message can have up to ${MESSAGE_MAX_LENGTH} characters`,
    );
  });

  it("measures the message without surrounding spaces", () => {
    const message = ` ${"a".repeat(MESSAGE_MAX_LENGTH)} `;
    expect(validateEnrolmentRequest({ ...VALID, message })).toEqual({});
  });
});
