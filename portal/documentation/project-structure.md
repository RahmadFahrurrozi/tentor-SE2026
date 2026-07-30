# Project Structure

```
terntoring-se2026/
├── portal
│   ├── public
│   │   ├── data
│   │   │   ├── banyuwangi.json
│   │   │   └── regions.json
│   │   ├── favicon.svg
│   │   ├── icons.svg
│   │   └── logo.svg
│   ├── src
│   │   ├── assets
│   │   │   ├── hero.png
│   │   │   ├── react.svg
│   │   │   └── vite.svg
│   │   ├── components
│   │   │   ├── auth
│   │   │   │   ├── auth-guard.tsx
│   │   │   │   └── login-illustration.tsx
│   │   │   ├── dashboard
│   │   │   │   ├── InteractiveMap.tsx
│   │   │   │   └── SidebarControls.tsx
│   │   │   ├── ui
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── checkbox.tsx
│   │   │   │   ├── data-table.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── dropdown-menu.tsx
│   │   │   │   ├── field.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── label.tsx
│   │   │   │   ├── loading-overlay.tsx
│   │   │   │   ├── map.tsx
│   │   │   │   ├── mode-toggle.tsx
│   │   │   │   ├── progress.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── separator.tsx
│   │   │   │   ├── skeleton.tsx
│   │   │   │   ├── sonner.tsx
│   │   │   │   ├── switch.tsx
│   │   │   │   └── table.tsx
│   │   │   ├── user
│   │   │   │   └── AssignmentMap.tsx
│   │   │   ├── box-loader.tsx
│   │   │   └── bulk-opload-dialog.tsx
│   │   ├── context
│   │   │   └── theme-provider.tsx
│   │   ├── hooks
│   │   │   ├── use-auth.ts
│   │   │   ├── use-user-form.ts
│   │   │   ├── use-users.ts
│   │   │   └── useSpatialData.ts
│   │   ├── lib
│   │   │   ├── supabase.ts
│   │   │   └── utils.ts
│   │   ├── mocks
│   │   │   └── regions.ts
│   │   ├── pages
│   │   │   ├── user
│   │   │   │   └── columns.tsx
│   │   │   ├── 404-page-not-found.tsx
│   │   │   ├── DataUpload.tsx
│   │   │   ├── Login-page.tsx
│   │   │   ├── MapDashboard.tsx
│   │   │   ├── prifacy-policy.tsx
│   │   │   ├── term-of-service.tsx
│   │   │   ├── Unauthorized-page.tsx
│   │   │   └── User.tsx
│   │   ├── services
│   │   │   ├── auth.service.ts
│   │   │   ├── profile.service.ts
│   │   │   └── user.service.ts
│   │   ├── store
│   │   │   ├── auth-store.ts
│   │   │   └── mapStore.ts
│   │   ├── types
│   │   │   └── database.types.ts
│   │   ├── utils
│   │   │   └── dataProcessing.ts
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── components.json
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── README.md
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vercel.json
│   └── vite.config.ts
├── scripts
│   └── process_geojson.py
├── supabase
│   ├── functions
│   │   └── create-user
│   │       ├── deno.json
│   │       └── index.ts
│   └── config.toml
├── app.py
├── cek_osm_detail.py
├── cek_osm.py
├── convert_rt.py
├── file.py
├── import_wilayah.py
├── logo.svg
├── package-lock.json
├── packages.txt
├── preprocess_bangunan.py
├── README.md
├── requirements.txt
├── split_parquet_to_chunks.py
└── update_data_parquet.bat
```
