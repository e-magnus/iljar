# Dashboard MVP Wireframe (Mobile + Desktop)

## Mobile (bottom nav)

```text
┌──────────────────────────────┐
│ Heim                    ⟳    │
│ [Leita skjólstæðingum...]    │
├──────────────────────────────┤
│ Næsti tími                   │
│ 09:00-09:30 · Jón J.         │
│ Eftir 25 mín · BOOKED        │
│ [Opna] [Merkja mætt] [Færa]  │
├──────────────────────────────┤
│ Í dag                         │
│ 09:00 Jón J. [Lokið][No-show]│
│ 10:00 Anna Á. [Lokið][No-show]│
│ ...                          │
├──────────────────────────────┤
│ Flýtiaðgerðir                │
│ [Ný bókun] [Nýr skj.]        │
│ [Áminningar] [Dagatal]       │
├──────────────────────────────┤
│ Viðvaranir                   │
│ • Óstaðfestir næstu 48 klst  │
│ • ...                        │
├──────────────────────────────┤
│ Rekstrarpúls                 │
│ Dagsvelta  —                 │
│ Tímar í viku  12             │
│ No-show 30d   2              │
├──────────────────────────────┤
│ Uppsetning 1/3               │
│ [Setja þjónustur]            │
│ [Setja opnunartíma]          │
│ [Tengja áminningar]          │
└──────────────────────────────┘
[Heim] [Bókanir] [Skjólst.] [Stillingar]
```

## Desktop (sidebar)

```text
┌──────────────┬────────────────────────────────────────────────────┐
│ Sidebar      │ Top: Heim + Leita + Uppfæra                      │
│ • Heim       ├───────────────────────────────┬────────────────────┤
│ • Bókanir    │ Næsti tími                    │ Viðvaranir         │
│ • Skjólst.   │ [Opna][Merkja mætt][Færa]     │ max 3 + Sjá allar  │
│ • Stillingar ├───────────────────────────────┤────────────────────┤
│              │ Í dag tímalína                │ Rekstrarpúls       │
│              │ quick actions per line         │ Dagsvelta / vika   │
│              ├───────────────────────────────┤ / no-show          │
│              │ Flýtiaðgerðir                  ├────────────────────┤
│              │ 4 takkar                        │ Uppsetning 0-3/3   │
└──────────────┴───────────────────────────────┴────────────────────┘
```

## Component Spec

- `NextAppointmentCard`: teljari, þjónusta, staða, actions (`Opna`, `Merkja mætt`, `Fresta/færa`)
- `TodayTimeline`: röðuð dagslista, quick actions (`Lokið`, `Ekki mætt`, `Hringja`)
- `QuickActions`: ný bókun, nýr skjólstæðingur, áminningar, dagatal
- `AlertsPanel`: allt að 3 viðvaranir + “Sjá allar”
- `SetupChecklist`: 0/3...3/3 grunnuppsetning með CTA
- `PulseMetrics`: dagsvelta, tímar í viku, no-show 30d

## API Contract

- `GET /api/me/summary`
  - `nextAppointment`, `todayCount`, `alerts[]`, `metrics`, `setupChecklist`
- `GET /api/appointments?date=YYYY-MM-DD`
  - tímar dagsins, raðað upp
- `GET /api/clients?search=q`
  - global search niðurstöður
- `POST /api/appointments/{id}/status`
  - body: `{ action: arrived | completed | no_show }`

## Event Tracking Schema

- `view_dashboard`
- `click_new_booking`
- `mark_arrived`
- `mark_completed`
- `open_reschedule`
- `complete_setup_step`
