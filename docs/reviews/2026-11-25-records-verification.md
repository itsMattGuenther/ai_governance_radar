# Curated records verification, 2026-11-25

Can the curated records (`data/seed/entities.json`, `data/seed/incidents.json`) be
trusted enough to publish? All 29 were checked field by field against primary sources:
10 regulations, 5 national frameworks, 7 standards and 7 incidents.

**Answer: not as they stand, but yes once the changes below are applied.** Three
records are correct as written. Nine have errors that would mislead a reader about
status, deadlines or obligations. The other seventeen have smaller problems:
invented day-of-month precision, stale versions, sources that don't support every
claim, and missing timeline events.

## Method
- One reviewer per group (EU; Colorado and California; other US; international;
  standards; incidents), each working from the record and the rules in DATA_MODEL.md.
- **Primary sources only for changes:** legislature and government pages, official
  journals, regulators, court dockets and the publishers' own sites. Law-firm and news
  articles were used only to find leads. A change marked *secondary* below has no
  primary confirmation and is proposed at lower confidence.
- No reviewer edited the data. Every change below needs the owner's approval.
- Three headline findings were re-read at the source by hand:
  - NYC Legistar shows "Returned Unsigned by Mayor", enacted 12/11/2021.
  - Colorado's bill page shows SB 26-189 signed 05/14/2026.
  - The Commission's AI Act page gives 2 December 2027 and 2 August 2028 for
    high-risk rules.

## Summary

| Record | Verdict | Most important finding |
|---|---|---|
| Colorado AI Act (SB 24-205) | **Material** | Repealed and reenacted by SB 26-189 (signed 2026-05-14, effective 2027-01-01); enforcement stayed by a stipulated court order |
| EU AI Act | **Material** | Reg. (EU) 2026/1744 moved Annex III high-risk to 2027-12-02 and Annex I to 2028-08-02 |
| Brazil PL 2338/2023 | **Material** | Shown as "passed"; only the Senate has voted. Awaiting a committee report in the Chamber |
| NYC Local Law 144 | **Material** | `signed_at` is wrong: returned unsigned by the Mayor, enacted without signature |
| Utah AI Policy Act | **Material** | 2024 disclosure duties replaced in 2025 (SB 226); amended again in 2026 (HB 320); repeal scheduled 2027-07-01 |
| Texas TRAIGA | **Material** | Social-scoring and biometric bans apply to government entities only, not businesses |
| Australia Voluntary AI Safety Standard | **Material** | The government says "Guidance for AI Adoption" (2025-10-21) evolves it; the description of mandatory guardrails is out of date |
| OWASP Top 10 for LLM Applications | **Material** | Current edition is 2026 (2026-08-03), not 2025 |
| NYC MyCity chatbot (incident) | **Material** | Says the city kept it online; the city took it down 2026-02-04 |
| California SB 53 | Minor | Penalties and covered entities can be stated precisely; add passage events |
| Illinois HB 3773 | Minor | Better URL; IDHR rules proposed then withdrawn in 2026 |
| South Korea AI Framework Act | Minor | Missing penalties, passage/promulgation dates and a 2026 amendment; weak source |
| China GenAI Interim Measures | Minor | Add issuance date and the condition on security assessments |
| Singapore Model AI Governance Framework | Minor | Point at the GenAI framework page; add edition history |
| Canada Voluntary Code (GenAI) | Minor | Six outcomes, not five |
| UK pro-innovation approach | Verified | Add the 2024 response and 2026 King's Speech events |
| Japan AI Guidelines for Business | Verified | Link the authoritative Japanese v1.2 page; add version history |
| NIST AI RMF | Minor | Revision under way (no draft yet); add events |
| NIST GenAI Profile (AI 600-1) | Minor | Wrong source URL |
| ISO/IEC 42001 | Minor | Published 2023-12-18, not 2023-12-01 |
| ISO/IEC 23894 | Minor | Published 2023-02-06, not 2023-02-01 |
| OWASP Agentic AI Security | Minor | Dates invented to the 1st; misses the Agentic Top 10 (2025-12-09) and V2 guide (2026-11-10) |
| MITRE ATLAS | Minor | No version recorded; current is v2026.10 (2026-10-28) |
| Air Canada chatbot | Verified | Soften the unsupported root-cause claim |
| Samsung / ChatGPT | Minor | Exact day unknown; first reported 2023-03-30 |
| iTutorGroup / EEOC | Minor | Conduct is alleged and denied; only the settlement is confirmed |
| Arup deepfake | Minor | The deepfakes were pre-recorded, not real-time; 2024-01-29 is the police report date |
| Chevrolet dealer chatbot | Minor | Vendor was Fullpath; the competitor claim is hedged in sources |
| Replit agent deletes database | Minor | Should be confirmed (CEO acknowledged); the rollback did work |

## Decisions for the owner
1. **Colorado: split or rewrite?** *Recommended:* add a new record `colorado-sb-26-189`
   and keep SB 24-205 as history with `status: amended` and status label "Repealed and
   reenacted by SB 26-189". The duties changed substantially, and the old record holds
   the lawsuit history. The schema has no "repealed" status or successor link;
   `status_label` and the description carry it for now.
2. **EU AI Act `compliance_deadline`:** the field holds one date. *Recommended:*
   2027-12-02 (Annex III high-risk). The 2026-12-02 and 2028-08-02 dates go in the
   notes and timeline.
3. **Month-only dates:** the schema stores full dates, so "June 2021" became 2021-06-01,
   which claims a precision nobody has. *Recommended:* leave the date empty and state the
   month in the summary text (MITRE ATLAS launch, Samsung, Arup, NYC MyCity).
4. **New records the checks suggest.** *Recommended:* only Colorado SB 26-189 now; the
   rest later.
   - Japan AI Promotion Act (Act No. 53 of 2025).
   - Singapore Model AI Governance Framework for Agentic AI (v1.5, 2026).
   - Australia Guidance for AI Adoption.
   - OWASP Top 10 for Agentic Applications (or re-scope `owasp-agentic` to it).

## Proposed changes by record

### Colorado AI Act (SB 24-205): material
Sources: https://leg.colorado.gov/bills/sb24-205, https://leg.colorado.gov/bills/sb26-189,
session law https://leg.colorado.gov/laws/session-laws/SB26-189/131/download, docket
https://www.courtlistener.com/docket/73171074/x-ai-llc-v-weiser/, https://coag.gov/ai/
- `status` signed → amended. `status_label` → "Repealed and reenacted by SB 26-189
  (effective Jan 1, 2027); AG enforcement stayed by stipulated court order".
- `effective_at` 2026-06-30 → empty. The act became law on 2024-05-17. The duties
  were set to start 2026-06-30, but whether they ever applied is unresolved (see
  `applicability_notes`), so the record should not show an effective date. The
  regulations table would otherwise read "Effective Jun 30, 2026" for a repealed law.
- `introduced_at` 2024-04-04 → 2024-04-10. `last_amended_at` 2025-08-28 → 2026-05-14.
- `penalties` → deceptive trade practice under the Colorado Consumer Protection Act, up
  to $20,000 per violation. *The figure comes from the fiscal note, not the statute.*
- `applicability_notes`: SB 25B-004 moved duties to 2026-06-30. SB 26-189 repeals and
  reenacts Part 17 from 2027-01-01. The 2026-04-27 stipulated order in *X.AI LLC v.
  Weiser*, No. 1:26-cv-01515 (D. Colo.), bars AG enforcement for now. It is not an
  injunction or a ruling on the merits. Whether SB 24-205's duties applied from
  2026-06-30 to 2026-12-31 is unresolved, so the record should claim neither.
- New events:
  - 2026-04-09: xAI sues the AG.
  - 2026-04-24: the United States intervenes (Equal Protection claim).
  - 2026-04-27: stipulated order staying enforcement.
  - 2026-05-14: SB 26-189 signed.
- Event fixes: "created" date → 2024-04-10. Drop "first comprehensive US state AI law"
  (no primary support).
- Confidence: medium. Verified as-is: passed_at, signed_at, enforcement authority,
  covered entities, risk classification, the 2024-05-08 and 2025-08-28 events.

**New record `colorado-sb-26-189`** (same sources):
- **Dates:** introduced 2026-05-01, passed 2026-05-12, signed 2026-05-14, effective
  2027-01-01.
- **Scope:** an automated decision-making technology (ADMT) law with 7 consequential
  domains; legal services was dropped.
- **Enforcement:** the AG only, through the CCPA. No private right of action.
- **New duties:** developer documentation, deployer notice, adverse-outcome explanations
  within 30 days, correction and human review, 3-year records, fault allocation.
- **Removed from SB 24-205:** the duty of care, risk-management program, impact
  assessments and affirmative defense.
- **Events:** 2026-11-19, AG adopts the ADMT and Chatbot Safety rules (an AG opinion
  and Secretary of State filing are still pending).
- **Milestones:** 2027-01-01 takes effect; 2030-01-01 the 60-day cure-notice subsection
  is repealed.

### EU AI Act: material
Sources: https://data.europa.eu/eli/reg/2026/1744/oj, https://data.europa.eu/eli/reg/2024/1689/oj,
https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai
- `compliance_deadline` 2026-08-02 → 2027-12-02 (see decision 2).
- `last_amended_at` → 2026-07-27: Reg. (EU) 2026/1744, adopted 2026-07-08, Official
  Journal 2026-07-24, in force 2026-07-27. It is the only act amending 2024/1689.
- `status_label` → "In force; amended by Reg. (EU) 2026/1744. Phased application to
  Aug 2, 2028".
- `applicability_notes` → the full timeline:
  - 2025-02-02: prohibitions and AI literacy. Art. 4 is now a duty to support literacy.
  - 2025-08-02: GPAI, governance and penalties.
  - 2026-08-02: general application, including Art. 50 transparency and AI Office
    enforcement against GPAI providers.
  - 2026-12-02: new Art. 5 prohibitions (intimate imagery, CSAM), and Art. 50(2) for
    generative systems already on the market.
  - 2027-08-02: national sandboxes.
  - 2027-12-02: Annex III high-risk.
  - 2028-08-02: Annex I high-risk.
  - 2030-08-02: legacy public-authority high-risk systems.
- `penalties`:
  - €35M or 7% for Art. 5 breaches.
  - €15M or 3% for most other obligations.
  - €7.5M or 1% for misleading information.
  - For SMEs, whichever is lower.
  - Commission fines on GPAI providers up to €15M or 3% (Art. 101, from 2026-08-02).
- `enforcement_authority`:
  - National market surveillance authorities.
  - The AI Office for GPAI models. Since 2026/1744 it also covers AI systems built on
    the same provider's GPAI model, and those in very large online platforms or search
    engines.
  - EDPS for EU institutions.
- New events:
  - 2025-11-19: Commission proposes the Digital Omnibus on AI.
  - 2026-05-07: political agreement.
  - 2026-07-27: 2026/1744 in force.
  - 2026-08-02: general application.
- Verified as-is: the introduced, signed and effective dates; the 2025 events; the
  description; risk classification.
- Not checked by automated fetch: EUR-Lex answers bots with an empty HTTP 202, so open
  the official URL in a browser once.

### Brazil PL 2338/2023: material
Sources: https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2487262,
https://www25.senado.leg.br/web/atividade/materias/-/materia/157233
- `status` passed → introduced, and clear `passed_at`. The Senate approved a substitute
  text on 2024-12-10, which becomes an event.
- Correct the existing event: the bill went to the Chamber on 2025-03-17, not
  2024-12-10.
- New events:
  - 2025-03-17: received by the Chamber.
  - 2025-04-04: Special Committee created.
  - 2025-05-20: rapporteur (Dep. Aguinaldo Ribeiro) designated.
- `applicability_notes` → as of 2026-11-13, awaiting the rapporteur's report under
  priority procedure. Add the Chamber page as the live URL.

### NYC Local Law 144: material
Source: https://legistar.council.nyc.gov/LegislationDetail.aspx?ID=4344524&GUID=B051915D-A9AC-451E-81F8-6596032FA3F9,
audit https://www.osc.ny.gov/state-agencies/audits/2025/12/02/enforcement-local-law-144-automated-employment-decision-tools
- `signed_at` 2021-12-11 → empty, with `passed_at` 2021-11-10. The Mayor returned it
  unsigned; it was enacted without signature on 2021-12-11.
- `penalties` → up to $500 for a first violation, then $500 to $1,500 for each
  subsequent one. Each day of use and each notice failure is a separate violation
  (§20-872).
- `enforcement_authority` → DCWP; Corporation Counsel may sue; penalty cases go to
  OATH.
- New events:
  - 2025-12-02: State Comptroller audit finds DCWP enforcement ineffective.
  - 2026-01-17: Local Law 25 of 2026 orders a study of these tools' effect on city
    employees. It does not amend LL 144.
- Effective 2023-01-01 and enforced from 2023-07-05: verified.

### Utah AI Policy Act: material
Sources: https://le.utah.gov/Session/2025/bills/enrolled/SB0226.xml,
https://le.utah.gov/~2025/bills/static/SB0332.html, https://le.utah.gov/Session/2026/bills/enrolled/HB0320.xml,
https://le.utah.gov/xcode/Title13/Chapter77/13-77.html, https://le.utah.gov/xcode/Title63I/Chapter2/63I-2-S213.html
- `description` → SB 149 (2024) created the Office of AI Policy and the Learning
  Laboratory (Ch. 72). SB 226 (2025) replaced the disclosure rules with Ch. 77:
  - Generative AI must be disclosed only if the consumer clearly asks.
  - Regulated occupations must disclose proactively in high-risk interactions.
- `penalties` → up to $2,500 per violation, and up to $5,000 per violation of an order.
- `enforcement_authority` → Division of Consumer Protection, with the AG as counsel.
  The Office of AI Policy runs the Learning Laboratory.
- `last_amended_at` → 2026-03-18 (HB 320). URLs → the codified Ch. 77 and Ch. 72
  pages.
- New events:
  - 2025-03-25: SB 332 moves the Ch. 72 repeal date to 2027-07-01.
  - 2025-05-07: SB 226 takes effect.
  - 2026-05-06: HB 320 takes effect.
- Milestone: 2027-07-01, Ch. 72 repeals unless extended.

### Texas TRAIGA (HB 149): material
Source: https://capitol.texas.gov/tlodocs/89R/billtext/html/HB00149F.HTM
- `description`, what is barred:
  - For anyone: AI intended to incite self-harm, harm or crime, to infringe
    constitutional rights, or to discriminate unlawfully (intent-based), and AI that
    produces CSAM or sexual deepfakes.
  - For government entities only: social scoring and certain biometric identification.
  - Government agencies and health-care providers must disclose AI interactions.
  - It also creates a DIR sandbox and the Texas AI Council.
- `penalties` (after a 60-day cure period):
  - $10,000 to $12,000 per curable violation.
  - $80,000 to $200,000 per uncurable violation.
  - $2,000 to $40,000 per day for continuing violations.
  - Licensing sanctions up to $100,000.
- `applicability_notes`: disparate impact alone is not enough. There is no private
  right of action, and the law preempts local AI rules. Remove "narrowed during passage"
  (unsupported).
- Verified as-is: signed 2025-06-22, effective 2026-01-01, enforced by the AG.

### Australia Voluntary AI Safety Standard: material
Sources: https://www.industry.gov.au/publications/voluntary-ai-safety-standard,
https://www.industry.gov.au/publications/guidance-for-ai-adoption,
https://www.industry.gov.au/publications/national-ai-plan/keep-australians-safe
(read through Wayback snapshots because the department's site timed out)
- Keep `status: final`. The department says the new guidance "evolves" the standard;
  only a law-firm note says it "replaces" it. Standards carry no confidence field, so
  "superseded" can't be marked as less certain. State the department's own wording in
  the description instead.
- `description`: remove "mandatory guardrails under consideration". The National AI
  Plan (2025-12-02) builds on existing laws and sets up an AI Safety Institute.
- New events:
  - 2025-10-21: Guidance for AI Adoption replaces the 10 guardrails with 6 practices.
  - 2025-12-02: National AI Plan.
- Point `official_url` at the standard's own page.

### OWASP Top 10 for LLM Applications: material
Sources: https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/,
https://genai.owasp.org/resource/owasp-top-10-for-llm-applications-2025/
- `version` 2025 → 2026. `last_updated_at` → 2026-08-03 (the press release is dated
  2026-09-02). Source URL → the 2026 resource page.
- Events:
  - Add: 2023-08-01, v1.0.
  - Add: 2026-08-03, 2026 edition. Excessive Agency moves to LLM03, and LLM08 Hidden
    Context Exposure is new.
  - Fix: the 2025-edition event is 2024-11-17, and Unbounded Consumption *expanded*
    Denial of Service rather than being new.

### NYC MyCity chatbot (incident): material
Sources: https://themarkup.org/artificial-intelligence/2026/01/30/mamdani-to-kill-the-nyc-ai-chatbot-we-caught-telling-businesses-to-break-the-law,
AP via https://www.nbcnewyork.com/news/local/nycs-ai-chatbot-was-caught-telling-businesses-to-break-the-law-the-city-isnt-taking-it-down/5287713/
- `what_happened`: Adams kept it online, conceding errors; the city took it down on
  2026-02-04.
- `occurred_at` → empty. It launched in October 2023, and the errors were found in
  testing before The Markup's 2024-03-29 story.
- Add the AP source: The Markup's story lacks two of the examples the record cites.

### California SB 53: minor
Source: the Legislature's official bulk data (https://downloads.leginfo.legislature.ca.gov/pubinfo_2025.zip);
leginfo blocks automated clients.
- `penalties` → up to $1,000,000 per violation against a large frontier developer,
  recoverable only in an AG civil action (B&P §22757.15).
- `covered_entities`:
  - Frontier developers (>10^26 operations) must publish transparency reports and
    report critical incidents to Cal OES within 15 days.
  - Large frontier developers (>$500M revenue) must also publish a frontier AI
    framework.
- `introduced_at` → 2025-01-07. `passed_at` → 2025-09-13 (Senate concurrence, 29–8).
- Add the whistleblower protections and CalCompute (operative only once funded). Drop
  or attribute "first US frontier-model transparency law". Change "operative" to
  "effective".
- New event: 2026-11-16, the CA AG sues OpenAI citing the Act only as public policy.
- Milestone: 2027-01-01, first Cal OES annual report.
- No 2026 amendments and no court challenge found.

### Illinois HB 3773: minor
Sources: https://www.ilga.gov/Legislation/PublicActs/View/103-0804,
https://ilga.gov/ftp/legislation/103/BillStatus/HTML/10300HB3773.html, JCAR Flinn Reports 2026-05-15 and 2026-06-26.
- URL → Public Act 103-0804. Enforcement → IDHR (charges, 2-year window), then the
  Human Rights Commission or circuit court.
- Description: add the effect-based test, and that zip codes may not be used as a proxy
  for protected classes.
- New events:
  - 2024-08-09: approved (passed both houses 2024-05-24).
  - 2026-05-15: IDHR proposed notice rules.
  - 2026-06-26: withdrawal recorded. No final rules; the statute applies without them.

### South Korea AI Framework Act: minor
Sources: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=282791,
https://www.msit.go.kr/eng/bbs/view.do?bbsSeqNo=42&mId=4&nttSeqNo=1214&sCode=eng
- URL → law.go.kr (the loc.gov source is secondary and returned 403).
- `passed_at` 2024-12-26; `signed_at` (promulgated) 2025-01-21; `last_amended_at`
  2026-01-20 (Act No. 21311).
- `penalties` → fines up to KRW 30 million (Art. 43): no prior AI notice, no domestic
  representative, ignoring orders.
- MSIT grants a grace period of at least one year on fines and investigations. That is
  policy, not statute, and no end date has been announced.
- `risk_classification`: use the Art. 2(4) list of high-impact areas.
- Drop "Asia's first comprehensive AI statute" (unattributed).
- New events:
  - 2026-01-21: Enforcement Decree 36053.
  - 2026-07-21: deferred amendment provisions take effect.

### China GenAI Interim Measures: minor
Source: https://www.cac.gov.cn/2023-07/13/c_1690898327029107.htm
- `signed_at` → 2023-07-10 (CAC Order No. 15, published 2023-07-13).
- `risk_classification`: security assessment and filing apply only to services with
  public-opinion attributes or social-mobilisation capacity (Art. 17).
- Related measures, mentioned but not recorded: AI-content labelling (in force
  2025-09-01) and anthropomorphic interaction services (in force 2026-07-15).

### Singapore Model AI Governance Framework: minor
Source: https://aiverifyfoundation.sg/resources/mgf-gen-ai/
- URL → the GenAI framework page. Publisher → IMDA / AI Verify Foundation.
- New events:
  - 2019-01-23: 1st edition.
  - 2020-01-21: 2nd edition.
  - 2024-01-16: proposed GenAI framework.
- Candidate new record: the Agentic AI framework (v1.0 2026-01-22, v1.5 2026-05-20).

### Canada Voluntary Code (GenAI): minor
Source: the record's ISED page (live, modified 2026-06-04, 46 signatories)
- Description → six outcomes: add validity and robustness.
- New events:
  - 2025-01-06: AIDA (in Bill C-27) left at committee when the session ended.
  - 2025-03-06: implementation guide.
  - 2026-06-04: "AI for All" national strategy, which doesn't mention the code.

### UK pro-innovation approach: verified
- Add events:
  - 2024-02-06: government response.
  - 2026-05-13: King's Speech with no AI bill (the Regulating for Growth Bill includes
    AI sandboxes).
- Note in the description that the framework was published under the previous
  government.

### Japan AI Guidelines for Business: verified
- Source URL → the authoritative Japanese v1.2 page:
  https://www.meti.go.jp/shingikai/mono_info_service/ai_shakai_jisso/20260331_report.html
- Add version events: v1.01 2024-11-22, v1.1 2025-03-28, v1.2 2026-03-31.

### NIST AI RMF: minor
Source: https://www.nist.gov/itl/ai-risk-management-framework/ai-risk-management-framework-faqs
- 1.0, final, 2023-01-26: verified.
- New events:
  - 2025-07-23: the AI Action Plan tasks NIST with revising the framework. No draft
    as of 2026-11-25.
  - 2026-04-07: concept note for a critical-infrastructure profile.

### NIST GenAI Profile (AI 600-1): minor
- Source URL → https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence.
  Everything else verified.

### ISO/IEC 42001 and 23894: minor
Sources: https://www.iso.org/standard/42001, https://www.iso.org/standard/77304.html
- 42001 published 2023-12-18 (not 12-01). 23894 published 2023-02-06 (not 02-01); add
  its "created" event.
- No amendments listed for either. Related standards: 42005:2025, 42006:2025.

### OWASP Agentic AI Security: minor
Sources: https://genai.owasp.org/initiatives/agentic-security-initiative/ and resource pages
- `published_at` 2025-02-01 → 2025-02-17. `last_updated_at` → 2026-11-10 (Securing
  Agentic Applications V2).
- New event: 2025-12-09, Top 10 for Agentic Applications for 2026.
- Option: re-scope the record to that Top 10.

### MITRE ATLAS: minor
Source: https://github.com/mitre-atlas/atlas-data/releases/tag/v2026.10
- `version` → v2026.10. `last_updated_at` 2025-10-01 → 2026-10-28.
- `published_at` → empty, launched June 2021 (day unknown).
- New events:
  - 2026-05-27: monthly versioning begins.
  - 2026-10-28: v2026.10 (16 tactics, 129 techniques).

### Incidents: minor
- **Air Canada (verified):** soften the root cause ("no grounding or verification
  layer" is inference). Add The Register as a backup source, since CanLII blocks bots.
- **Samsung:**
  - `occurred_at` → empty (March 2023).
  - `reported_at` → 2023-03-30 (the original Economist Korea report).
  - TechCrunch supports only the May 2023 device ban.
- **iTutorGroup:**
  - Title → "allegedly age-discriminatory"; add that iTutorGroup denied the allegations.
  - Only the settlement is confirmed.
  - Cite the EEOC's 2022-05-05 suit release, and a firm summary for the 2023-08-09
    settlement filing.
- **Arup:**
  - `occurred_at` → empty (January 2024; 2024-01-29 is when police got the report).
  - Root cause → pre-recorded deepfakes, not real-time
    (https://hongkongfp.com/2024/02/05/multinational-loses-hk200-million-to-deepfake-video-conference-scam-hong-kong-police-say/).
  - Add CNN 2024-05-16, where Arup confirms.
- **Chevrolet:**
  - Vendor → Fullpath (ChatGPT-based) on Chevrolet of Watsonville's site.
  - Competitor claim → "appeared to recommend a Ford F-150"; the screenshots are not
    authenticated.
  - Add GM Authority and The Autopian as sources.
- **Replit:**
  - `fact_status` reported → confirmed and confidence → high: the CEO acknowledged it
    (https://www.theregister.com/2025/07/22/replit_saastr_response/).
  - Add that the rollback did work.

## Not verified
- **Primary sources that refuse automated readers:**
  - EUR-Lex (HTTP 202 with an empty body).
  - California leginfo (Cloudflare challenge).
  - CanLII and the BC tribunal (403).
  - Colorado's legislature site (406 without browser headers).
  - ilga.gov (serves an incomplete TLS certificate chain).

  Each was confirmed another way: Publications Office copies, official bulk data, the
  court docket mirror, or secondary sources. Page-watch sources on these sites may fail.
- **Facts resting on secondary or derived sources:**
  - The Colorado $20,000 penalty (fiscal note).
  - Australia's "superseded" status.
  - The Hong Kong police briefing date (Feb 2 or 4).
  - Akin Gump's doubt that iTutorGroup used AI at all.
  - Whether Colorado's SB 24-205 duties applied in the second half of 2026.
- **Not reviewed:** each standard's `related_frameworks` and `change_magnitude` (curator
  judgment), and the incidents' root cause, relevance and mitigation (analysis), except
  where they state a fact.

## Gaps this exposed in the data model
- **Dates have no precision.** A known month can't be stored without inventing a day.
- **A regulation can't be marked repealed or superseded**, and can't link to its
  successor.
- **Standards, frameworks and incidents have no `last_verified_at`.** Only regulations
  record when they were checked, so the 90-day re-check rule (DEC-031) can't reach the
  others.
- **Evidence is per record, not per field.** Each record has one official source URL,
  but its facts come from several documents (statute, court docket, fiscal note).
  Publishing needs per-field evidence or a source list per record.
