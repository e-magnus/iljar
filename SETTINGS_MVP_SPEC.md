# Settings MVP Spec

Dagsetning: 2026-02-21  
Staða: Draft (til útfærslu í sprint)

## Markmið

Skilgreina einfaldan en nothæfan stillingarflipa sem passar við núverandi gagnamódel og API mynstur í verkefninu.

## Scope (MVP)

MVP inniheldur 3 hluta:

1. **Öryggi**
   - Virkja/slökkva á 2FA (TOTP)
   - Sýnileiki á stöðu 2FA
2. **Tímabókun sjálfgefið**
   - Lengd tíma (`slotLength`)
   - Bil á milli tíma (`bufferTime`)
3. **Tilkynningar (read-only í MVP)**
   - Sýna hvort áminningarþjónusta er stillt (út frá env)

## Out of Scope (næsta útgáfa)

- Breyta lykilorði
- Fjölnotenda access/session management
- Prófíll stofu (nafn, sími, logo, heimilisfang)
- Tungumál/tímabelti
- Persónuverndarverkfæri (útflutningur/eyðingarbeiðnir)

## Wireframe (MVP)

```text
┌───────────────────────────────────────────────┐
│ Stillingar                                    │
│ Grunnstillingar fyrir öryggi og bókunarkerfi │
└───────────────────────────────────────────────┘

┌ Öryggi ───────────────────────────────────────┐
│ 2FA staða: [Virk] / [Óvirk]                  │
│ [Setja upp 2FA] (POST /api/auth/totp)        │
│ [Staðfesta kóða] (PATCH /api/auth/totp)      │
└───────────────────────────────────────────────┘

┌ Tímabókun sjálfgefið ─────────────────────────┐
│ Lengd tíma (mín): [ 30 ]                      │
│ Bil milli tíma (mín): [ 5 ]                   │
│ [Vista breytingar]                            │
└───────────────────────────────────────────────┘

┌ Tilkynningar ─────────────────────────────────┐
│ Áminningar provider: [Configured / Missing]   │
│ (Read-only í MVP)                             │
└───────────────────────────────────────────────┘
```

## Reitir og gagnamöppun

### 1) Öryggi

| UI reitur | Tegund | Uppruni | Athugasemd |
|---|---|---|---|
| `totpEnabled` | boolean | `User.totpEnabled` | Sýnir hvort 2FA sé virkt |
| `totpSecret` | string? | `User.totpSecret` | Aldrei birt í UI nema setup flæði krefjist |
| `totpToken` | string | Request body | Eingöngu við staðfestingu |

### 2) Tímabókun sjálfgefið

| UI reitur | Tegund | Uppruni | Validation |
|---|---|---|---|
| `slotLength` | int | `Settings.slotLength` | `>= 5 && <= 180` |
| `bufferTime` | int | `Settings.bufferTime` | `>= 0 && <= 60` |

### 3) Tilkynningar (read-only)

| UI reitur | Tegund | Uppruni | Athugasemd |
|---|---|---|---|
| `remindersConfigured` | boolean | `EMAIL_PROVIDER` / `SMS_PROVIDER` / `REMINDER_PROVIDER` | Eins og í `/api/me/summary` |

## API contract (MVP)

## Nú þegar til staðar

### `POST /api/auth/totp`
- Tilgangur: búa til TOTP secret og QR
- Auth: já (`requireAuth`)
- Response `200`:

```json
{
  "secret": "...",
  "qrCode": "data:image/png;base64,..."
}
```

### `PATCH /api/auth/totp`
- Tilgangur: staðfesta token og virkja 2FA
- Auth: já
- Request:

```json
{ "totpToken": "123456" }
```

- Response `200`:

```json
{ "success": true }
```

## Bæta við fyrir Settings MVP

### `GET /api/settings`
- Tilgangur: ná saman stillingum fyrir stillingarsíðu
- Auth: já
- Response `200`:

```json
{
  "security": {
    "totpEnabled": true
  },
  "booking": {
    "slotLength": 30,
    "bufferTime": 5
  },
  "notifications": {
    "remindersConfigured": false
  }
}
```

### `PATCH /api/settings`
- Tilgangur: uppfæra bókunarstillingar
- Auth: já
- Request:

```json
{
  "booking": {
    "slotLength": 40,
    "bufferTime": 10
  }
}
```

- Validation:
  - `slotLength` heiltala á bilinu `5..180`
  - `bufferTime` heiltala á bilinu `0..60`
- Response `200`:

```json
{
  "booking": {
    "slotLength": 40,
    "bufferTime": 10
  },
  "updatedAt": "2026-02-21T12:00:00.000Z"
}
```

## Prisma note (MVP)

Núverandi `Settings` tafla dugar fyrir MVP (`slotLength`, `bufferTime`).

API ætti að nota `upsert` til að tryggja að stillingar séu til þó engin röð sé í töflu:

- `where: { id: <known-id> }` ef singleton strategy er valin, eða
- `findFirst` + `create/update` ef haldið er núverandi mynstri.

## UI state + villumeðhöndlun

- Loading state á `GET /api/settings`
- Field-level villur á validation (`400`)
- General villa (`500`) með stuttri tilkynningu
- Disable `Vista` hnapp ef engar breytingar eða invalid input

## Útfærsluröð (1 sprint)

1. Búa til `GET/PATCH /api/settings`
2. Tengja `src/app/settings/page.tsx` við endpoint
3. 2FA section með núverandi `POST/PATCH /api/auth/totp`
4. Bæta við einföldu smoke testi fyrir `PATCH /api/settings`

## Acceptance criteria

- Notandi sér núverandi `slotLength` og `bufferTime`
- Notandi getur vistað ný gildi og sér þau endurhlaðin rétt
- Notandi getur virkjað 2FA með staðfestingarkóða
- Tilkynningakort sýnir `Configured/Missing` stöðu