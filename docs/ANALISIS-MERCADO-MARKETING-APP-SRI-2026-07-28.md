# Market Analysis & Marketing Plan: Personal Tax Compliance App (Ecuador SRI)

> **Note:** Companion document to `PROPUESTA-APP-PERSONAL-DECLARACION-SRI-2026-07-28.md` (the architecture/build plan). This document covers market viability, profitability, and a low-cost go-to-market plan. Same caveat applies: this is a standalone product concept, not part of the SAA/ASOPREP-FCPC engagement.

## Bottom line

This is a real but small and shallow niche. Direct-to-consumer, it supports a modest, sustainable small-team business — not a venture-scale outcome — unless distribution pivots from individual app-store acquisition toward accountants and professional associations who already reach this population in bulk.

## Market Sizing (TAM → SAM → SOM)

No official source tallies this segment directly — no directory or SRI publication breaks out "personas naturales no obligadas a llevar contabilidad who exceed the exempt income threshold" as its own statistic. The estimate below is bounded reasoning, not a cited figure.

- Ecuador's actual filing threshold matches the "$12k" framing almost exactly: the **fracción básica desgravada is $12,081 for 2025 and $12,208 for 2026** — below that, zero income tax is owed.
- Ecuador's economically active population (PEA) is **8.6 million** (Dec 2025); only **37.1% have "empleo adecuado/pleno"** (full, at-least-minimum-wage employment) — roughly 3.2M people.
- Median monthly labor income is only **$397.80**, national average **$498.80–513/month** — well under the ~$1,017/month needed to clear the annual threshold. Only **~14% of households earn $1,500+/month** (household, not individual).
- The most directly enumerable adjacent bracket, **RIMPE Negocios Populares, has ~1.2M contributors** — but that's gross revenue up to $20k for micro-businesses, not personal net income above $12k, so it overstates TAM if used directly.

**Working TAM estimate:** 300,000–700,000 individuals nationally who clear ~$12k/year and aren't obligated to full accounting. Bounded above by the RIMPE Negocios Populares population, bounded below by the fact most of the "empleo adecuado" bracket still falls short of the threshold.

**SAM:** narrower — device access isn't the limiter (83.7% internet penetration, 15.2M users), but willingness-to-pay and awareness are. The strongest real evidence: **Kupuna**, the one competitor built specifically for this niche, "hasn't received enough ratings to display a full overview" on its App Store listing despite being live for a couple of years — a direct signal that the converting SAM across *all* 6-7 competing apps combined is likely low tens of thousands, not hundreds of thousands.

**SOM (new entrant, years 1-2, with genuine differentiation):** realistically **2,000–10,000 users**, mostly on a free tier.

## Competitive Landscape

| App | Positioning | Pricing signal |
|---|---|---|
| Kupuna | Closest direct competitor — built for this exact niche, auto-classifies purchases, nets IVA/retenciones, handles the personal-expense annex | Not published; low review volume suggests limited traction |
| Calculadora Tributaria Ecuador | Simple free calculator, no ongoing tracking | Free |
| Apolo Software, ContApp | Invoicing-first, tax-adjacent | ContApp bundles with accountant service; general Ecuador bookkeeping runs $50-80/month (business-oriented, not personal-filing-oriented) |
| Siigo Contífico | Full accounting/invoicing platform, RIMPE-targeted, dominant commercial player | **$40.9–$110.9/year** — effective price ceiling for anything positioned as "more than a calculator" |

The field is fragmented (six-plus apps splitting an already-small market), and pricing is uniformly low because the underlying population's income (median ~$400-500/month) caps what anyone can charge. Competing here means competing against "free SRI portal + free YouTube tutorial + a modest seasonal accountant fee," not enterprise SaaS comparables.

## Revenue Model

Given the pricing ceiling, avoid a monthly subscription (feels expensive for a once-a-year need). Recommended structure:
- **Free** all-year expense/income tracking — the acquisition funnel, no cost to try, builds the habit.
- **Paid unlock at filing time** — $10–20 one-time per fiscal year for the auto-prepared declaration + guided walkthrough (Phase 4's deliverable). Matches how the target user already prices this problem mentally (a seasonal accountant fee).

## Cost vs. Revenue

- **Build cost:** ~$30k–75k to reach Phase 4, depending on team size/rates (per the phased build plan).
- **Recurring cost:** hosting (modest at this scale), OCR (Tesseract free unless P2-15's benchmark demands a paid upgrade), and a genuine annual maintenance burden — SRI changes rates and portal UI yearly (P1-17, P3-14, P4-08 all exist because of this). Not a build-once product.
- **Revenue at SOM (Year 2, ~8,000 paying users × $15-20/year):** roughly **$120k–160k/year**.

Profitable at niche/small-team scale; thin against the annual maintenance obligation. Not enough to justify a large dedicated team long-term at pure B2C scale.

## Key Risks

1. Willingness-to-pay ceiling is structural (set by population income), not fixable with better marketing.
2. SRI itself is a moving-target competitor for free — they could improve their own portal's personal-expense annex UX at any time.
3. First-mover advantage on this exact positioning is already spent (Kupuna occupies it today); differentiation must be real — automatic e-invoice import + bank reconciliation, not just another calculator.
4. Market isn't growing fast — dollarized economy, slow formal-employment growth (37.1% empleo adecuado, barely up from 33.0% a year earlier).

## Strategic Recommendation

Direct-to-consumer, this is a viable **small/niche business**, not a scalable venture. The materially better economics come from a **B2B2C pivot through accounting firms/contadores** — each already serves dozens to hundreds of individual clients matching this exact profile, giving near-zero CAC per end-user instead of competing app-store-search-term by app-store-search-term against Kupuna and five others.

---

## Low-Cost Marketing Plan

**Guiding constraint:** with LTV around $15-20/user/year (from the profitability model above), customer acquisition cost must stay in the **$1-3 range** for unit economics to work. This rules out broad paid acquisition (search/social ads) as the backbone of the plan — it's a small test budget at most, not the primary channel.

### Priority 1 — SEO/content marketing (near-zero cost)
Publish practical, keyword-targeted guides timed to when people actually search: "cómo declarar el impuesto a la renta paso a paso", "anexo de gastos personales — qué se puede deducir", "calendario noveno dígito SRI". Existing competitors (Factuplan, ContApp, boletincontable-style sites) already rank on these terms — that's evidence the channel works, not that it's saturated, since content quality across the fragmented field is inconsistent. Each guide ends with a soft CTA into the free tracking tier.

### Priority 2 — App Store Optimization (near-zero cost)
Target exact-match terms: "declaración impuesto a la renta Ecuador", "anexo gastos personales", "SRI persona natural". Kupuna's own listing shows weak review volume — outranking it doesn't require ad spend, just consistent keyword/screenshot work and prompting early users for reviews.

### Priority 3 — B2B2C via accountants and professional associations (lowest CAC per user)
- Offer a free/white-label tier to independent contadores who currently do this manually for many individual clients — turns a substitute into a distribution channel.
- Direct outreach to professional associations with concentrated honorarios-profesionales earners (colegios de médicos, abogados, ingenieros) — an identifiable, reachable slice of the target population.
- Pitch HR departments at mid/large employers as an employee benefit for salaried staff above the threshold — bulk licenses at a steep discount, near-zero marginal CAC per employee reached.

### Priority 4 — Seasonal concentration, not year-round spend
SRI's declaration window concentrates around Feb-March (per SRI's own March boletín on personal-declaration deadlines). Front-load content publishing, ASO pushes, and any paid tests into Jan-March; shift to retention/engagement (the free tracking habit) the rest of the year. The deadline-based push notifications already planned for Phase 3 (P3-12, tied to the 9th-digit calendar) double as a retention lever, not just a feature.

### Priority 5 — Organic short-form video
Ecuador has high social media penetration (74% of the population). Tax-fee/tax-tip content already gets organic traction on platforms like TikTok. Keep it low-cost and seasonal: simple explainer videos ("3 gastos que sí puedes deducir y casi nadie declara") around filing season, not year-round production.

### Priority 6 — Referral loop (near-zero cost, compounds over time)
Target users cluster in professional/workplace circles. A simple "invite a colleague" incentive (e.g., an extra free filing-season unlock) leverages the same concentration that makes the B2B2C channel effective, without needing a formal partnership.

### What to skip
- Broad paid search/social ads at scale — CAC will exceed LTV given the pricing ceiling.
- TV/radio or other mass-market spend — the addressable population is a specific income/professional slice, not the general population.

## Sources

- [SRI Boletín 011 — declaración personas naturales](https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/6eb8a7b2-22ad-4dd9-9adc-d0a2773448f4/BOLET%C3%8DN%20011%20-%20EN%20MARZO%20LAS%20PERSONAS%20NATURALES%20DEBEN%20DECLARAR%20EL.pdf)
- [SRI — Impuesto a la Renta](https://www.sri.gob.ec/en/impuesto-renta)
- [Fracción básica desgravada 2026 — Boletín Contable](https://boletincontable.com/2025/12/29/fraccion-basica-desgravada-del-impuesto-a-la-renta-en-ecuador-2026-valor-actualizado-y-tabla-proyectada/)
- [Tabla impuesto a la renta 2026 — Factuplan](https://factuplan.com.ec/blog/tabla-impuesto-a-la-renta-2026-ecuador)
- [Régimen RIMPE en Ecuador 2026 — Siigo](https://www.siigo.com/ec/blog/emprendimiento-y-ventas/regimen-para-emprendedores-y-negocios-populares/)
- [Régimen RIMPE Ecuador 2026 — CVE Abogados](https://cvecabogados.com/servicios/regimen-rimpe-ecuador-2026/)
- [Digital 2025: Ecuador — DataReportal](https://datareportal.com/reports/digital-2025-ecuador)
- [Planes y precios — Siigo Contífico](https://www.siigo.com/ec/planes/)
- [Precio de software contable en Ecuador 2026 — Anfibius](https://anfibius.net/precio-de-software-contable-en-ecuador-cuanto-deberias-pagar-en-2026/)
- [Kupuna Impuestos + Facturación — App Store](https://apps.apple.com/us/app/kupuna-impuestos-facturaci%C3%B3n/id1661450588)
- [Mayoría de hogares vive con no más de $513 — Expreso](https://www.expreso.ec/economia-y-negocios/mayoria-hogares-ecuador-vive-no-513-283516.html)
- [¿Cuánto ganan los hogares en Ecuador? — El Diario](https://www.eldiario.ec/negocios/el-dato-que-genero-debate-cuanto-ganan-realmente-los-hogares-en-el-ecuador-actual-12052026/)
- [Cifras de empleo Ecuador diciembre 2025 — Primicias](https://www.primicias.ec/economia/cifras-empleo-trabajo-desempleo-ecuador-diciembre2025-trabajadores-113355/)
- [Empleo adecuado alcanza 36.8% de la PEA — El Diario](https://www.eldiario.ec/negocios/el-empleo-adecuado-en-ecuador-alcanza-al-36-8-de-la-poblacion-economicamente-activa-30012026/)
- [¿Cuánto cuesta contratar un contador? — ContApp](https://www.contapp.ec/blogs/contratar-un-contador)
