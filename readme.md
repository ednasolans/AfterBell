## Folder structure

```text
AfterBell/
├── .github/workflows/          # CI (SonarQube) and daily burndown chart
├── docs/decisions/             # Technical decisions
├── mobile/                     # React Native + Expo + TypeScript app
│   ├── src/app/                # Screens and Expo Router navigation
│   │   ├── (auth)/             # Authentication routes
│   │   ├── (customer)/         # Customer routes
│   │   └── (provider)/         # Provider routes
│   ├── src/features/           # Feature-specific modules
│   ├── src/components/         # Reusable UI components
│   ├── src/lib/                # Supabase client and shared utilities
│   └── src/theme/              # Colours and typography
├── supabase/                   # Backend (Supabase)
│   ├── migrations/             # Versioned database schema changes
│   ├── functions/              # Supabase Edge Functions
│   └── seed.sql                # Development seed data
├── scripts/                    # Project management scripts
├── sonar-project.properties    # SonarQube configuration
└── readme.md                   # Main project documentation
```
