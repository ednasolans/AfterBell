# Decision 001: Mobile application stack

## Status

Accepted

## Decision

The AfterBell mobile application will use **React Native**, **Expo** and
**TypeScript**.

Navigation will use Expo Router, with route groups for authentication,
customer screens and provider screens.

## Rationale

- React Native provides one mobile codebase for iOS and Android.
- Expo simplifies development, testing with Expo Go and native project
  configuration.
- TypeScript provides static type checking as the application grows.
- Expo Router provides file-based navigation that keeps routes organised by
  product area.

## Consequences

- The app can be started locally with `npx expo start` from `mobile/`.
- Expo SDK and React Native versions must remain compatible.
- Environment-specific public Supabase configuration is supplied through
  `EXPO_PUBLIC_*` variables and is never committed with local `.env` files.
