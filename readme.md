AfterBell/
├── .github/
│   └── workflows/              # CI (SonarQube) and daily burndown chart
├── docs/                       # Documentation and other non-technical files  
├── mobile/                     # Mobile app (React Native + Expo + TypeScript)
│   ├── assets/                 # Images, icons and fonts
│   └── src/
│       ├── app/                # Screens and navigation (Expo Router)
│       │   ├── (auth)/         # Login and sign-up
│       │   ├── (customer)/     # Customer area
│       │   └── (provider)/     # Provider area
│       ├── features/           # One folder per functionality
│       ├── components/         # Reusable UI components
│       ├── lib/                # Supabase client and generated database types
│       └── theme/              # Colours and typography
├── supabase/                   # Backend (Supabase)
│   ├── migrations/             # Database schema changes, versioned
│   ├── functions/              # Edge Functions (e.g. AI profile generation)
│   ├── seed.sql                # Demo data
│   └── config.toml
├── scripts/                    # Project management scripts (burndown chart)
├── sonar-project.properties    # SonarQube configuration
└── README.md