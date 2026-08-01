# Market Analysis: Accounting Software Suite for Accountants & Businesses (Ecuador)

> **Note:** Companion analysis to the personal tax app documents (`PROPUESTA-APP-PERSONAL-DECLARACION-SRI-2026-07-28.md` and `ANALISIS-MERCADO-MARKETING-APP-SRI-2026-07-28.md`). This covers a different, separate product concept: productizing the current SAA system into a commercial accounting software suite for accountants and businesses. Same caveat applies — standalone product concept, not part of the SAA/ASOPREP-FCPC engagement itself.

## The strategic fork

"Accounting software for accountants and businesses" can mean two very different plays, with very different competitive pictures. Both are analyzed below as parallel tracks, not a single path:

1. **Track 1 — Generic SME/accountant accounting software**: invoicing, bookkeeping, tax compliance for the broad market of Ecuadorian businesses and the accountants who serve them.
2. **Track 2 — Specialized core-system software for financial cooperatives/mutualistas**: leveraging what SAA actually is — a system with a genuine credit/loan/member-contribution module (CRD) and treasury/bank-reconciliation (TSR), not just bookkeeping.

A key factor changes the calculus for Track 1 specifically: **the team already builds and services Vale, an operating electronic-invoicing system in Ecuador with an existing base of 500–5,000 active customers**, a mix of direct businesses and accountants managing multiple client RUCs. This existing base does not overlap with financial cooperatives, so it affects Track 1 only — Track 2's analysis and go-to-market are unchanged by it.

## Market Sizing

**Track 1 — Generic SME/accountant market:**
- **172,641 active companies** registered with Ecuador's Superintendencia de Compañías (2025) — the formal "sociedades" universe.
- **E-invoicing is mandatory for essentially every taxpayer** — over 2 million businesses/independent professionals/entrepreneurs are obligated, though only **~400,000 actually issue electronic vouchers monthly** (SRI, 2025). From January 2026, immediate e-invoicing became mandatory for régimen general and microempresas — a real regulatory tailwind, since every one of those taxpayers needs SRI-compliant software by law, not by choice.
- This is the segment **Siigo Contífico already dominates**: >200,000 client companies and >70,000 allied accountants across Peru, Chile, Ecuador and Uruguay combined, doubling revenue and tripling clients in under 2 years post-merger. That's an entrenched network-effect incumbent — accountants recommend it to their many clients, clients recommend it to their accountants.
- **Vale's existing base (500-5,000 customers) sits inside this same market** — it's a small slice of the ~2M obligated taxpayers, but it's a slice you already own, with an existing billing relationship and trust, unlike the other ~1.9M+.

**Track 2 — Financial cooperative/mutualista market (the codebase's actual differentiated fit):**
- Ecuador has **393 cooperativas de ahorro y crédito (COACs) and related SFPS entities** as of the official SEPS catastro (verified below), consolidated down from 921 in 2016 — a shrinking-but-stabilizing sector.
- SEPS classifies entities into 5 segments by total assets (Resolución 038-2015). **Verified directly against SEPS's official current roster** ("Segmentación de entidades del SFPS," dated 1 June 2026, downloaded and cross-checked entity-by-entity — see Sources):

| Segment | Asset range | # of entities (verified) | Verdict |
|---|---|---|---|
| 1 | >$80M | **50** (includes 4 mutualistas, Caja Central FINANCOOP, and CONAFIPS alongside ~44 traditional COACs) | Avoid — largest, most sophisticated; likely already on Cobiscorp or with in-house IT capacity to match |
| 2 | $20M–$80M | **66** | **Primary target** — big enough to need real core-system functionality, too small for Cobiscorp's enterprise tier |
| 3 | $5M–$20M | **92** | **Secondary target** — smaller budgets, but still needs credit/loan management beyond generic bookkeeping |
| 4 | $1M–$5M | **136** | Avoid — price-sensitive, high customization-to-revenue ratio |
| 5 | ≤$1M | **49** | Avoid — smallest tier, includes many entities at liquidation risk |

- **Verified SAM: segments 2+3 combined = 158 cooperativas exactly** — no longer an estimate; this is a full, confirmed count from the authoritative source.
- **Cobiscorp** (an Ecuadorian-origin core-banking vendor, now regional) serves **only ~15 cooperativas** in Ecuador — almost certainly the largest segment-1 institutions who can afford enterprise core banking, confirming segments 2-3 as the underserved gap.
- **Correction from the prior draft: all 4 mutualistas de ahorro y crédito para la vivienda (Pichincha, Ambato, Azuay, Imbabura) are officially classified Segmento 1**, not a smaller adjacent niche as previously assumed from their relative share within the 4-mutualista subsector. None are Track 2 targets under the segment-based targeting logic — remove them from outreach consideration.
- **Banks are a separate, harder, longer-term stretch market, not a near-term target** — 23 private banks (4 large, 9 medium, 10 small) plus 4 public banks, regulated by the stricter Superintendencia de Bancos rather than SEPS. Likely already run Cobiscorp/Temenos/similar entrenched platforms; worth revisiting only after Track 2 has cooperative reference cases.

### Prospective client list (verified against SEPS's official roster)

The lists below were cross-checked directly against SEPS's official segmentation document (`SEGMENTACIÓN-AÑO-2026.pdf`, published via `seps.gob.ec/institucion/segmentacion-de-esfps/`, data as of 1 June 2026) — not the illustrative public-ranking examples from the earlier draft. Several names originally listed as Segment 3 (Educadores de Chimborazo, Educadores de Tungurahua, Vis Andes) turned out to actually be Segment 2 per this official source, and "Comercio" (Portoviejo) turned out to be Segment 1, not Segment 2 — corrected below. RUC is the authoritative identifier; a handful of names may carry minor accent-character rendering artifacts from PDF extraction and should be re-confirmed against the RUC before outreach.

**Segment 2 — full list, 66 cooperativas (primary target):**

| RUC | Cooperativa |
|---|---|
| 0190021513001 | Educadores del Azuay Ltda |
| 0190093581001 | Coopac Austro Ltda |
| 0190160378001 | Santa Isabel Ltda |
| 0190160459001 | Multiempresarial |
| 0190316319001 | Fasayñan Ltda |
| 0190317625001 | Señor de Girón |
| 0190327949001 | Provida Ltda |
| 0290004454001 | Juan Pío de Mora Ltda |
| 0290035260001 | Las Naves Ltda |
| 0390000804001 | Cañar Ltda |
| 0391005664001 | Yuyay Ltda |
| 0490007458001 | Educadores Tulcán Ltda |
| 0490009124001 | San Gabriel Ltda |
| 0590024937001 | Finanzas Corporativas Ltda |
| 0590061123001 | Futuro Lamanense |
| 0591711563001 | Sumak Kawsay Ltda |
| 0591713094001 | Andina Ltda |
| 0591719009001 | Sierra Centro Ltda |
| 0591719718001 | Visión de los Andes (Vis Andes) |
| 0690002744001 | Educadores de Chimborazo Ltda |
| 0690074761001 | Minga Ltda |
| 0691702324001 | 4 de Octubre |
| 0992280700001 | Huancavilca Ltda |
| 1090046892001 | San Antonio Ltda - Imbabura |
| 1090058521001 | Unión El Ejido |
| 1090078263001 | De Indígenas Chuchuqui Ltda |
| 1090107174001 | Artesanos Ltda |
| 1091708139001 | Santa Anita Ltda |
| 1091712284001 | Mujeres Unidas Tantanakushka Warmikunapac |
| 1091732935001 | Acción Imbaburapak Ltda |
| 1190036967001 | Educadores de Loja - CACEL Ltda |
| 1191725669001 | Crediamigo Ltda |
| 1290068068001 | San Antonio Ltda Los Ríos |
| 1390091474001 | Santa Ana Ltda |
| 1390143156001 | La Benéfica Ltda |
| 1391707363001 | Microempresarial Sucre |
| 1590001585001 | Tena Ltda |
| 1790023508001 | Cotocollao Ltda |
| 1790045668001 | San Francisco de Asís Ltda |
| 1790499871001 | 16 de Julio Ltda |
| 1790586863001 | Alianza Minas Ltda |
| 1790641392001 | Politécnica Ltda |
| 1790890864001 | Puéllaro Ltda |
| 1790892670001 | Pedro Moncayo Ltda |
| 1791268628001 | Textil 14 de Marzo |
| 1791280156001 | Previsión Ahorro y Desarollo Ltda |
| 1791306589001 | Corporación Centro Ltda |
| 1791367359001 | San Miguel de los Bancos Ltda |
| 1791379470001 | Maquita Cushunchic Ltda |
| 1791784979001 | Fondo para el Desarrollo y la Vida |
| 1791847644001 | Luz del Valle |
| 1791928083001 | Huaicana Ltda |
| 1792076773001 | Manantial de Oro Ltda |
| 1890049369001 | Educadores de Tungurahua Ltda |
| 1891708358001 | Maquita Cushun Ltda |
| 1891710581001 | Vencedores Ltda |
| 1891716385001 | San Martín de Tisaleo Ltda |
| 1891721591001 | Kisapincha Ltda |
| 1891721796001 | Acción Tungurahua Ltda |
| 1891725910001 | Sumak Samy Ltda |
| 1891735002001 | Credil Ltda |
| 1891743005001 | Credi Ya Ltda |
| 1891744214001 | Sisa |
| 1891745571001 | Interandina |
| 1990007019001 | De la Pequeña Empresa CACPE Yantzaza Ltda |
| 1990007027001 | De la Pequeña Empresa CACPE Zamora Chinchipe Ltda |

**Segment 3 — full list, 92 cooperativas (secondary target):**

| RUC | Cooperativa |
|---|---|
| 0190096076001 | Sidetamc |
| 0190147665001 | Solidaridad, Emprendimiento y Cooperación |
| 0190150739001 | Etapa |
| 0190319296001 | Gañansol Ltda |
| 0190338509001 | Jadán |
| 0190344169001 | Del Azuay |
| 0190375811001 | Corpucoop Ltda |
| 0290003180001 | San Miguel Ltda |
| 0290030099001 | San Pedro Ltda |
| 0290034337001 | Salinas Limitada |
| 0291500994001 | Simiatug Limitada |
| 0391008558001 | San Marcos |
| 0590060437001 | San Miguel de Sigchos |
| 0591713124001 | 15 de Agosto de Pilacoto |
| 0591713760001 | Pujilí Ltda |
| 0591714031001 | Iliniza Ltda |
| 0591714236001 | Uniblock y Servicios Ltda |
| 0591714333001 | Coorcotopaxi Ltda |
| 0591714821001 | Pucará Ltda |
| 0591724444001 | Occidental |
| 0690042495001 | Sumac Llacta Ltda |
| 0690069334001 | San Jorge Ltda |
| 0690074397001 | San Miguel de Pallatanga |
| 0691720721001 | Nueva Esperanza Ltda |
| 0691729281001 | Chunchi Ltda |
| 0691732584001 | Sol de los Andes Ltda Chimborazo |
| 0790088611001 | 16 de Junio |
| 0791704499001 | Marcabelí Ltda |
| 0890011802001 | Antorcha Ltda |
| 0990138850001 | La Dolorosa Ltda |
| 0990320160001 | Dr. Cornelio Sáenz Vera Ltda |
| 0990858527001 | Salitre Ltda |
| 0990872562001 | Metropolitana Ltda |
| 0991501258001 | Base de Taura |
| 0992198990001 | Grupo Difare |
| 0992381760001 | Los Andes Latinos Ltda |
| 0992470550001 | Metrópolis Ltda |
| 1091716697001 | Imbabura Imbacoop Ltda |
| 1091728148001 | Uniotavalo Ltda |
| 1091733559001 | Ecuacréditos Ltda |
| 1190078937001 | CACPE Célica |
| 1190082462001 | Cristo Rey |
| 1191712249001 | De la Microempresa Fortuna |
| 1191720624001 | De la Cámara de Comercio de Gonzanamá |
| 1191723062001 | Gonzanamá |
| 1191736423001 | Saraguros |
| 1191736954001 | Vilcabamba CACVIL |
| 1290029224001 | 13 de Abril |
| 1291713013001 | 4 Ríos |
| 1291731518001 | La Nuestra Ltda |
| 1390017177001 | Magisterio Manabita Limitada |
| 1390141463001 | Abdón Calderón Ltda |
| 1391714246001 | Agrícola Junín |
| 1590017589001 | Coca Ltda |
| 1690000632001 | Educadores de Pastaza Ltda |
| 1790100294001 | San Cristóbal Ltda |
| 1790170047001 | Ciudad de Quito |
| 1790495507001 | Del Magisterio de Pichincha |
| 1790894053001 | San Juan de Cotogchoa |
| 1791375874001 | De los Empleados Jubilados y Ex-Empleados del Banco Central del Ecuador |
| 1791422708001 | Unidad y Progreso |
| 1791430956001 | Hermes Gaibor Verdesoto |
| 1791708288001 | Universidad Católica del Ecuador |
| 1792042518001 | Esperanza del Futuro Ltda |
| 1792057043001 | Pichincha Ltda |
| 1792060559001 | El Molino Limitada |
| 1792116449001 | 17 de Marzo Limitada |
| 1792253411001 | Orden y Seguridad "OYS" |
| 1792300657001 | Emprendedores Coopemprender Limitada |
| 1792311667001 | Negocios Andinos Ltda |
| 1891713750001 | Crediambato Ltda |
| 1891714633001 | La Floresta Ltda |
| 1891720587001 | Coorambato Ltda |
| 1891720978001 | Campesina Coopac |
| 1891724787001 | Credi Fácil Ltda |
| 1891725104001 | Juventud Unida Ltda |
| 1891726712001 | Crecer Wiñari Ltda |
| 1891726763001 | Indígena SAC Píllaro Ltda |
| 1891734650001 | Migrantes del Ecuador Ltda |
| 1891736882001 | Ecuafuturo Ltda |
| 1891737439001 | Pushak Runa Ltda |
| 1891737552001 | Financredit Ltda |
| 1891739113001 | Producción Ahorro Inversión Servicio País Ltda |
| 1891742319001 | Rhumy Wara |
| 1891742904001 | Angahuana |
| 1891745687001 | Credimás |
| 1990007124001 | Ciudad de Zamora |
| 1990010028001 | Educadores y Asociados Zamora Chinchipe |
| 2091756679001 | Indígenas Galápagos Ltda |
| 2191701227001 | Focla |
| 2290316947001 | Cámara de Comercio Joya de los Sachas Ltda |
| 1091761439001 | Rural Sierra Norte |

**Segment 1 — explicitly NOT targets, top entries by patrimonio for context on who to avoid:** JEP ($363.4M patrimonio), Jardín Azuayo ($275.1M), Alianza del Valle ($158.2M), Pequeña Empresa de Cotopaxi ($136.2M), Policía Nacional ($136.1M), San Francisco ($122.7M), 29 de Octubre ($104.6M), Riobamba ($99.1M), OSCUS ($85.5M), Vicentina Manuel Esteban Godoy ($84.6M), Comercio Ltda (Portoviejo).

## Competitive Landscape

| Segment | Incumbents | Moat strength | Vale's relevance |
|---|---|---|---|
| Generic SME/accountant (Track 1) | Siigo Contífico (dominant), Alegra, Defontana, Aspel, ContApp, Odoo (~$31/user/month, best cost-benefit for 10-80 employees per market guides) | Very strong — 200k+ client network effect, decade+ market presence | **High** — Vale gives you an existing warm base inside this exact market |
| Enterprise ERP (larger companies) | SAP Business One, Dynamics, Odoo Enterprise | Strong, different buyer (large corporates, not target here) | None |
| Cooperative core banking (Track 2) | Cobiscorp (COBIS Core) | Strong at segment 1 (~15 clients), absent at segments 2-3 | None — confirmed no coop overlap in Vale's customer base |

Local partner-implemented ERP typically runs **$15,000–50,000/year in TCO for 10-20 users** — a useful anchor: this is closer to what SAA's actual complexity level would command for Track 2, not Siigo Contífico's $40-110/year consumer-grade Track 1 pricing.

## Risks

| Risk | Status |
|---|---|
| Siigo Contífico's moat makes generic-market entry costly | **Softened for the Vale-upsell slice, not eliminated overall.** Cold acquisition against a 200k-client incumbent remains a poor use of resources; cheap entry now exists via Vale's existing 500-5,000 customers, but total revenue ceiling from that base alone is modest — don't mistake a good beachhead for market leadership. |
| "Only one reference client" (reference risk) | **Resolved for Track 1** — Vale gives provable, citable market presence in Ecuador's e-invoicing/compliance space. **Still open for Track 2** — ASOPREP-FCPC remains the only cooperative-sector reference. |
| SAA's known security gaps are a hard blocker for commercial launch | Unchanged and still mandatory to fix before selling to any regulated financial institution (Track 2) — no real server-side auth, an unauthenticated file read/delete vulnerability, wildcard CORS. |
| No shared base classes (~330 hand-copied backend trios, ~340 frontend services) | Unchanged — productizing into a configurable multi-tenant product remains expensive regardless of which track is pursued. |
| Cooperative sector shrinking in entity count (921→393 since 2016), smallest segment failing | Unchanged — Track 2 must target segments 2-3, not 4-5. |
| Long, relationship-driven B2B sales cycles for financial institutions | Unchanged for Track 2 — likely 6-12+ months per deal. |
| Unknown SEPS vendor certification/audit requirements | Unchanged — worth confirming directly before committing further to Track 2. |
| **New: positioning ambiguity for the Vale upsell** | Is the new accounting suite a bolt-on module to Vale, or a separate cross-sold product? Affects pricing, sales messaging, and whether existing Vale support staff can sell it directly. Decide before building the upsell campaign. |
| **New: unverified accountant-channel size within Vale** | "Mix of direct businesses and accountants" doesn't quantify the split. That ratio determines how much leverage the accountant sub-channel actually provides — worth pulling from existing customer data before sizing the campaign. |

## Opportunities

1. **The existing codebase is a genuine head start for Track 2** — CRD (credit/loan/member contributions) and TSR (treasury/bank reconciliation) are exactly what a cooperativa core system needs and exactly what Siigo Contífico/Alegra/generic bookkeeping tools don't have.
2. **A real, identifiable gap exists in Track 2**: ~150-165 segment-2/3 cooperativas are too complex for generic software and underserved by Cobiscorp's enterprise-tier focus. SEPS publishes segment rosters, so outreach can be targeted, not speculative.
3. **The e-invoicing mandate is a forcing function** across the whole market — every business needs compliant software by law, a tailwind for Track 1 broadly.
4. **Vale's existing base is a near-zero-CAC upsell channel for Track 1.** Cross-selling the fuller accounting suite to 500-5,000 already-trusting, already-paying customers is fundamentally different economics than net-new acquisition against Siigo Contífico.
5. **The accountant subset of Vale's base is a multiplier.** Accountants managing multiple client RUCs through Vale represent potential access to their other clients too — structurally the same mechanic behind Siigo Contífico's 70,000-accountant network effect, just at smaller current scale. This is the single highest-leverage channel identified for Track 1.
6. **Vale's technical foundation reduces Track 1's build cost.** The team has already solved SRI e-invoicing compliance (XML signing, real-time SRI validation) — this is not new technical ground, and can be integrated into or extended by the new suite rather than rebuilt.
7. **Vale strengthens Track 2's credibility even without direct overlap.** Being able to point to a real, operating, SRI-compliant product with hundreds of active Ecuadorian customers — not just one bespoke deployment — improves every pitch made to cooperativa leadership, even though Vale's customer list itself doesn't include any coops.
8. **Once won, switching costs for a financial institution's core system (Track 2) are extremely high** — unlike thin, easily-churned consumer economics, a core system deal tends to be sticky for years, mirroring the vendor lock-in dynamic that led ASOPREP-FCPC to commission SAA in the first place.

## Financial Outlook, Cost Estimates & Margins

### Track 1 — Generic SME/accountant market (via Vale upsell)

- **CAC for the Vale-upsell slice: near zero** — existing billing relationship, existing trust, no net-new acquisition spend needed.
- **Conservative conversion estimate:** a 10-20% upsell rate across 500-5,000 existing customers yields **50-1,000 new accounting-suite customers** essentially without marketing spend.
- **Revenue ceiling stays capped by Vale's base size** — this makes Track 1 immediately actionable and profitable, but it's a beachhead, not a path to displacing Siigo Contífico broadly. Its real value is fast, cheap, low-risk revenue that also funds/de-risks Track 2's slower ramp.
- Cold acquisition beyond the Vale base into the broader ~2M-taxpayer market is **not recommended** — matching or undercutting Siigo Contífico's $40-110/year pricing would mean razor-thin margins and would require volume (tens of thousands of clients) the team has no current path to reach at low cost.

### Track 2 — Financial cooperative niche (unaffected by Vale)

- **Productization cost:** turning SAA from a bespoke single-client deployment into a configurable, secure, multi-tenant product requires real re-architecture — multi-tenancy, per-client configuration tooling, fixing the security gaps, documentation, onboarding tooling. Estimate a team of 4-6 (backend, frontend, QA, DevOps) over 12-18 months, roughly **$200,000–450,000** total build-out at Ecuador-market fully-loaded engineering rates.

**Pricing structure relative to market options:**

| Option | Price | Fit for segment 2-3 coops |
|---|---|---|
| Siigo Contífico / Alegra (generic bookkeeping) | $40-110/year | Too cheap, but also too shallow — no credit/loan origination, no member-contribution tracking |
| Generic ERP (Odoo, local partner implementation) | $15,000-50,000/year TCO for 10-20 users | Right cost range, wrong functionality — would need heavy custom development to add credit/loan modules |
| Cobiscorp (COBIS Core) | Not publicly disclosed, presumably enterprise-tier (serves only ~15 largest coops) | Too expensive/complex for segment 2-3's scale |
| **Recommended: this product** | **Segment 3: $600-900/month (~$7,200-10,800/year); Segment 2: $1,200-2,000/month (~$14,400-24,000/year)** | Positioned in the gap — real core-system functionality (credit, member contributions, treasury) at a fraction of Cobiscorp's presumed enterprise pricing, tiered by the institution's ability to pay |

**Realistic sales pace:** 5-10 clients/year once the productized version and first reference cases exist, likely starting Year 2 after productization.

**Revenue projection (refined against the verified 158-entity SAM — segments 2+3 combined, per the official SEPS roster above):**

| Year | Cumulative clients | Avg revenue/client | Annual recurring revenue |
|---|---|---|---|
| 1 | 0-2 (pilot/beta, discounted for case studies) | — | ~$0-15,000 |
| 2 | 6-8 | ~$14,000 | ~$85,000-110,000 |
| 3 | 15-20 | ~$14,000 | ~$210,000-280,000 |
| 4 | 30-35 | ~$14,500 | ~$435,000-505,000 |
| 5 | 45-50 (≈28-32% of the 158-entity SAM — a realistic mature market share, not full penetration) | ~$15,000 | ~$675,000-750,000 |

- **Margins:** 70-85% gross margin once past the productization investment and the platform stabilizes — the real cost driver is sales-cycle length and per-client customization overhead, not per-unit delivery cost.
- **Payback:** breakeven falls in the **Year 3-4 range** against the $200-450k build cost — a genuine but patient business.

**Timeline:**
- **Months 1-6:** Close the known security gaps (real auth, file-handling fix, CORS) — non-negotiable before any regulated-institution pitch, run in parallel with productization.
- **Months 1-12:** Core productization — multi-tenancy, per-institution configuration tooling, onboarding tooling.
- **Months 6-9:** Recruit 1-2 pilot cooperativas from the segment-3 list above — smaller institutions, likely more open to a discounted pilot in exchange for being a formal reference case, building a second case study beyond ASOPREP-FCPC.
- **Months 12-18:** Formal go-to-market launch — direct outreach to the validated segment-2/3 roster, sector conference presence, federación partnership discussions.
- **Year 2:** First paying cohort, per the revenue table above.
- **Years 3-5:** Scale via referrals and the federación channel — this is a relationship-driven sector where later sales get easier, not harder, as reference cases compound.

### Combined view

Running both tracks in parallel rather than sequentially is the recommended structure: **Track 1 (Vale upsell) generates near-term, low-risk cash flow starting immediately**, which **funds and de-risks Track 2's productization investment**, whose slower 6-12+ month enterprise sales cycles play out over the same period.

## Marketing Strategy

### Track 1 — prioritize in this order

1. **Direct upsell campaign to Vale's existing base** — the new top priority, ahead of everything else in this track. In-app prompts, direct outreach from existing account managers/support relationships, bundled pricing for existing customers.
2. **Target the accountant subset specifically** — identify which Vale customers are accountants managing multiple client RUCs, and offer them a multi-client/practice-management pricing tier that incentivizes rolling the suite out across their client base. This replicates, at smaller scale, the exact mechanic behind Siigo Contífico's moat.
3. **Data check before campaign launch:** pull Vale's customer list by industry/activity code to confirm the "general businesses only" assumption — cooperativas are sometimes registered under generic commercial activity codes, so a quick check might surface unexpected Track 2 leads at near-zero cost.
4. **Decide product positioning first** — bolt-on module to Vale vs. separately cross-sold product — since this determines pricing, messaging, and whether existing Vale support staff can sell it directly.
5. Beyond the Vale base, **do not pursue broad paid acquisition** against the ~2M-taxpayer general market — CAC there is uneconomical given Siigo Contífico's entrenched position.

### Track 2 — unchanged, enterprise B2B motion

1. **Direct relationship sales to segment-2/3 cooperativa leadership** (gerentes generales, boards) — SEPS's public segment rosters make this a targeted list.
2. **Reference/case-study selling anchored on ASOPREP-FCPC** — in a trust-driven, peer-referential sector, a credible existing deployment outweighs ad spend. Now reinforced by Vale as a second, complementary credibility signal ("we already run compliant, at-scale financial software actively used by real Ecuadorian businesses").
3. **Cooperative federations and sector associations as a distribution channel** — one relationship can open doors to dozens of member institutions.
4. **Sector conferences and SEPS-adjacent events.**
5. **The "IT vendor independence" narrative as the core sales hook** — many segment-2/3 cooperativas likely feel the same vendor lock-in ASOPREP-FCPC did before commissioning SAA.
6. **Partnership with independent auditors/consultores** who advise cooperativas on IT modernization.
7. **Skip mass-market channels entirely** for this track — this buyer discovers vendors through peers and sector events, not ads or SEO.

## Sources

- [SEPS — Segmentación de entidades del SFPS (official roster, data as of 1 June 2026)](https://www.seps.gob.ec/wp-content/uploads/SEGMENTACI%C3%93N-A%C3%91O-2026.pdf) — downloaded and cross-checked entity-by-entity for the prospective client lists above, via [seps.gob.ec/institucion/segmentacion-de-esfps/](https://www.seps.gob.ec/institucion/segmentacion-de-esfps/)
- [Superintendencia de Compañías — crecimiento empresarial 2025 (172,641 active companies)](https://www.acavir.com/articulos/superintendencia-de-companias-en-ecuador-crecimiento-empresarial-en-2025)
- [Facturación electrónica obligatoria Ecuador 2024-2025 — Mobilvendor](https://mobilvendor.com/blogs/facturacion-electronica-obligatoria-ecuador)
- [Facturación electrónica inmediata desde 2026 — Manexware](https://www.manexware.com/blog/blog-odoo-1/facturacion-electronica-inmediata-en-ecuador-desde-2026-86)
- [Cooperativas pequeñas en Ecuador, las más numerosas y las que más entran en liquidación — Primicias](https://www.primicias.ec/economia/cooperativas-pequenas-numerosas-liquidacion-superintendencia-economia-popular-solidaria-121041/)
- [Cifras de las cooperativas más grandes de Ecuador en 2025 — Primicias](https://www.primicias.ec/economia/cifras-cooperativa-indicadores-solvencia-credito-morosidad-inversiones-ecuador-116398/)
- [Ecuador se destaca por sus soluciones especializadas de core bancario — Vistazo](https://www.vistazo.com/enfoque/ecuador-se-destaca-por-sus-soluciones-especializadas-de-core-bancario-FDVI216311)
- [Core Serverless de COBIS para cooperativas — Topaz Evolution](https://www.topazevolution.com/es/blog/core-serverless-cooperativas)
- [Siigo llega al mercado ecuatoriano](https://www.siigo.com/blog/siigo-llega-a-ecuador/)
- [Siigo y Contífico se fusionan para expandirse por América Latina — Primicias](https://www.primicias.ec/noticias/economia/siigo-contifico-fusion-expansion-america-latina/)
- [ERP para PYMEs en Ecuador 2026, guía completa con costos — Pacusoft](https://www.pacusoft.com/blog/erp-para-pymes-ecuador-guia-completa/)
- [Mejores ERPs PYMEs Ecuador 2026 — NM Tech Studio](https://www.nmtechstudio.com/blog/mejores-erps-pymes-ecuador-2026)
