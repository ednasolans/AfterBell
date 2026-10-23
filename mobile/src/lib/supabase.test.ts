jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);

describe("Supabase client", () => {
  it("creates the Supabase client with the configured environment variables", () => {
    jest.isolateModules(() => {
      const { supabase } = require("./supabase");

      expect(supabase).toBeDefined();
    });
  });

  it("throws an error when Supabase configuration is missing", () => {
    const originalUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const originalAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => {
      jest.isolateModules(() => {
        require("./supabase");
      });
    }).toThrow("Missing Supabase configuration");

    process.env.EXPO_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = originalAnonKey;
  });
});