# Sprint 1 Issue-möppun

Tilgangur: Breyta Sprint 1 verkefnum í framkvæmdarhæf GitHub Issues með skýru umfangi, háðleikum og acceptance criteria.

## Notkun
1. Stofna eitt GitHub Issue per lið hér að neðan.
2. Nota titla nákvæmlega til að auðvelda rekjanleika.
3. Afrita lýsingu og acceptance criteria í issue body.
4. Merkja með labels: `priority:high`, `area:security`, `sprint:1`.

---

## Issue 1

**Title**  
Sprint 1.1: Implement central auth guard for protected API routes

**GitHub Issue**  
https://github.com/e-magnus/iljar/issues/4

**Type**  
Core security / backend

**Depends on**  
None (critical path start)

**Scope**
- Bæta miðlægri staðfestingu á auðkenningu fyrir vernduð API endpoint.
- Skilgreina hvaða leiðir eru public (auth/register/login) og hvaða leiðir eru protected.
- Samræma `401` vs `403` svör.
- Tryggja að auth context (userId/email) sé aðgengilegt downstream handlers.

**Out of scope**
- Endanleg session strategy breyting (cookie/localStorage) er í Issue 2.
- Stórar UI endurhannanir.

**Acceptance criteria**
- [ ] Öll protected endpoint hafna óauðkenndum köllum með `401`.
- [ ] Óheimil köll (rangt hlutverk/heimild) skila `403` þar sem við á.
- [ ] Public endpoint halda virkni óbreyttri.
- [ ] Að minnsta kosti 1 integration test per protected endpoint-flokki staðfestir að vörn virki.

**Verification checklist**
- [ ] Handvirkt smoke test með/án token á appointments/clients/visits/photos.
- [ ] Engin regression í login/TOTP flow.

---

## Issue 2

**Title**  
Sprint 1.2: Standardize token/session policy and secure token handling

**GitHub Issue**  
https://github.com/e-magnus/iljar/issues/5

**Type**  
Security architecture

**Depends on**  
Issue 1 (auth guard context tilbúið)

**Scope**
- Samræma hvernig access/refresh token eru gefin út, endurnýjuð og ógild.
- Skilgreina session policy (lifetime, refresh behavior, logout behavior).
- Fjarlægja ósamræmi milli client token geymslu og server væntinga.
- Uppfæra villusvör fyrir expired/invalid token.

**Out of scope**
- Offline cache encryption (Sprint 3).

**Acceptance criteria**
- [ ] Skjalföst policy til staðar fyrir access/refresh lifecycle.
- [ ] Expired access token gefur fyrirsjáanlegt svar og styður skilgreint refresh flæði.
- [ ] Logout hreinsar session samkvæmt policy.
- [ ] Engin protected API leið samþykkir útrunnin eða ógild token.

**Verification checklist**
- [ ] Handvirk keyrsla á login → protected call → expiry → refresh → retry.
- [ ] Security review á geymsluaðferð og leakage áhættu.

---

## Issue 3

**Title**  
Sprint 1.3: Add integration tests for auth and route protection

**GitHub Issue**  
https://github.com/e-magnus/iljar/issues/7

**Type**  
Quality / testing

**Depends on**  
Issue 1 og Issue 2

**Scope**
- Setja upp integration test harness fyrir API auth/vernd.
- Bæta prófum fyrir:
  - Óauðkennt kall á protected route
  - Gilt token á protected route
  - Útrunnið/ógilt token
  - Public route behavior
- Skilgreina test data setup/teardown.

**Out of scope**
- Full E2E suite (Sprint 4).

**Acceptance criteria**
- [ ] Prófin keyra sjálfvirkt með test script.
- [ ] Prófin fanga `401/403` hegðun og jákvæð tilvik.
- [ ] Test keyrsla er stöðug (engin random flakes yfir 3 keyrslur).
- [ ] Sprint 1 merge skilyrði: integration tests þurfa að vera græn.

**Verification checklist**
- [ ] Keyra test suite 3x í röð án flöktunar.
- [ ] Staðfesta að ný endpoint í framtíð fái auðveldlega sama test mynstur.

---

## Forgangsröðun innan Sprint 1
1. Issue 1
2. Issue 2
3. Issue 3

Rök: Issue 1 býr til grunnheimildir, Issue 2 lokar session öryggisgloppum, Issue 3 ver gegn regression áður en farið er í Sprint 2.
