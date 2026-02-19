# Verkáætlun og framvindustýring (MVP → útgáfuhæft)

Þetta skjal er lifandi verkefnastjórnunarskjal fyrir næstu útfærslulotu.

## 1) Markmið og umfang

**Markmið:** Koma appinu í stöðuga, prófaða og útgáfuhæfa stöðu með skýrum öryggisgrunni og rekjanlegri framvindu.

**Í umfangi núna:**
1. Öryggi og aðgangsstýring á vernduðum leiðum
2. Kjarnaflæði bókunar/heimsókna með stöðureglum
3. Prófunargrunnur (unit/integration/e2e smoke)
4. M3 atriði (offline read-only cache + image cache controls)
5. Release gate og lokaútgáfuferli

**Ekki í umfangi núna:** Nýjar stórar viðbótarvörur/eiginleikar utan MVP styrkingar.

---

## 2) Stöðulykill

- [ ] Ekki hafið
- [~] Í vinnslu
- [x] Lokið
- [!] Blokkerað (þarf ákvörðun)

---

## 3) Áfangar (forgangsröðun)

## Áfangi 1 — Stöðugur og öruggur kjarni

**Markmið:** Engin óvarin viðkvæm API og stöðug kjarnaleið frá innskráningu að lokinni heimsókn.

### Verkþættir (í röð)
1. [ ] Innleiða miðlæga auth/authorization vörn á öllum vernduðum API-leiðum
2. [ ] Samræma token/session með öruggri meðhöndlun og expiry reglum
3. [ ] Herða inntaksstaðfestingu og samræma villusvör (appointments/clients/visits/photos)
4. [ ] Tryggja að audit log skrái user context í öllum skrifaðgerðum
5. [ ] Festa stöðuflæði bókunar (BOOKED→ARRIVED→COMPLETED/CANCELLED/NO_SHOW)

### Acceptance criteria
- [ ] Óauðkennd köll á vernduð endpoint skila `401/403`
- [ ] E2E smoke: login → bóka tíma → merkja mætt → skrá heimsókn gengur án handvirkra lagfæringa
- [ ] Engin critical security-villuskil í code review

### Áhætta og mótvægisaðgerðir
- Áhætta: Auth-herting brýtur núverandi UI flæði  
  Mótvægi: Smám saman rollout + smoke test eftir hverja endpoint breytingu
- Áhætta: Regression í status flæði  
  Mótvægi: Integration test fyrir stöðubreytingar áður en merge er gert

---

## Áfangi 2 — Styrking og heildun

**Markmið:** Ljúka M3 virknimarkmiðum og samræma UX/API/Storage hegðun.

### Verkþættir (í röð)
1. [ ] Klára settings-flæði (slot length, buffer time) með fullu UI + API
2. [ ] Innleiða encrypted offline read-only cache fyrir nýleg gögn
3. [ ] Innleiða image cache controls og samræma öruggt mynda-download/display flæði
4. [ ] Samræma villu-, loading- og empty-state UX á lykilsíðum
5. [ ] Endurmæla afköst slot generation undir raunhæfu álagi

### Acceptance criteria
- [ ] Stillingar uppfærast og hafa áhrif á slot generation í sama release
- [ ] Offline mode sýnir read-only nýleg gögn samkvæmt skilgreindum retention glugga
- [ ] Myndir opnast eingöngu með tímabundnum/signuðum aðgangi

### Áhætta og mótvægisaðgerðir
- Áhætta: PHI gögn í cache  
  Mótvægi: Dulkóðun, lágmarksgagnasett, stuttur retention tími
- Áhætta: Mismunandi hegðun hjá S3 providers  
  Mótvægi: Contract test fyrir upload/download URL policy

---

## Áfangi 3 — Lokaútgáfa og rekstrarhæfni

**Markmið:** Loka gæðalás og fara í örugga útgáfu með rollback viðbúnaði.

### Verkþættir (í röð)
1. [ ] Setja release gate í CI (`lint`, `build`, `unit`, `integration`, `e2e smoke`)
2. [ ] Keyra security hardening checklist (secrets, env validation, token policy, rate limiting)
3. [ ] Ljúka skjölun (runbook, backup/restore drill, release notes, known limitations)
4. [ ] Framkvæma UAT á 5 kjarnasenum
5. [ ] Go/No-Go fundur + production release + rollback readiness

### Acceptance criteria
- [ ] Öll CI gate græn
- [ ] Engar `critical/high` opnar villur
- [ ] Backup/restore prófað og staðfest

### Áhætta og mótvægisaðgerðir
- Áhætta: Síðbúin gallauppgötvun  
  Mótvægi: Code freeze gluggi + skilgreint hotfix ferli

---

## 4) Sprint-verkáætlun (raðað eftir háðleikum)

Sjá issue-möppun fyrir Sprint 1: [SPRINT1_ISSUE_MAPPING.md](SPRINT1_ISSUE_MAPPING.md)
Session policy: [SECURITY_SESSION_POLICY.md](SECURITY_SESSION_POLICY.md)

## Sprint 1 (vika 1)
1. [~] Auth guard architecture + vernd á API leiðum
2. [~] Samræmd token/session policy
3. [ ] Integration tests fyrir auth + vernd

## Sprint 2 (vika 2)
1. [ ] Validation + error contract samræming
2. [ ] Audit log user context í skrifaðgerðum
3. [ ] Booking status transition rules + tests

## Sprint 3 (vika 3)
1. [ ] Settings UI/API lokið
2. [ ] Offline encrypted read-only cache (MVP scope)
3. [ ] Image cache controls + secure download flow

## Sprint 4 (vika 4)
1. [ ] E2E smoke test suite + CI release gate
2. [ ] Performance benchmark endurkeyrsla
3. [ ] UAT + release prep + rollback drill

---

## 5) Rekjanleiki og uppfærslur

**Dagleg uppfærsla (5 mín):**
1. Færa stöðumerki verkefna (`[ ]` → `[~]` → `[x]` eða `[!]`)
2. Skrá stuttan blocker undir "Blockerar"
3. Uppfæra næstu 3 verkefni í röð

**Vikuleg yfirferð (30 mín):**
1. Fara yfir acceptance criteria per áfanga
2. Endurmeta áhættu og háðleika
3. Aðlaga sprint-röð ef blocker hefur áhrif á critical path

---

## 6) Blockerar og ákvarðanir

### Opnir blockerar
- [ ] Enginn skráður

### Ákvarðanir sem þarf að taka
1. [ ] Endanleg session strategy (httpOnly cookie vs núverandi client token handling)
2. [ ] Offline cache retention (t.d. 24h / 72h) og gagnasvið
3. [ ] Lágmarks E2E set fyrir release gate

---

## 7) Definition of Done (útgáfuhæft MVP)

- [ ] Áfangi 1, 2 og 3 acceptance criteria öll uppfyllt
- [ ] CI release gate 100% grænt
- [ ] UAT staðfest af rekstrar-/viðskiptaaðila
- [ ] Backup + restore æfing staðfest
- [ ] Release notes og rekstrarleiðbeiningar tilbúnar
