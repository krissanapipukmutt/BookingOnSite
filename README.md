# Booking Onsite Frontend (React + Vite)

This app is the responsive frontend prototype for the onsite booking system. It connects to the Supabase database (`boksite` schema) and mirrors the UX defined in `doc/user-experience.md`. If Supabase credentials are not configured, the UI will show sample data so the flow can still be demonstrated.

## Getting started

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (default: http://localhost:5173). Click **“ตั้งค่าเชื่อมต่อ”** in the header and provide:

- **Supabase URL** – e.g. `https://xyzcompany.supabase.co`
- **Supabase anon key** – from the Supabase project settings

Credentials are stored in `localStorage` for the current browser. Refreshing the page will reuse the saved configuration.

## Features

- Employee booking form with office/department/seat logic aligned to `department_booking_strategy`
- Holiday management form and listing for HR teams
- Reporting dashboard showing six core reports sourced from Supabase views
- Loading & empty states, plus fallback sample data when running offline
- Modern gradient UI with mobile-first responsiveness

## Building for production

```bash
npm run build
npm run preview
```

Vite outputs the static build to `dist/`. Deploy the contents behind any static host (e.g., Supabase Storage, Netlify, Vercel). Update environment-specific Supabase credentials via the settings dialog or inject them using runtime scripts if required.