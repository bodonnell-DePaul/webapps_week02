# HW2 — DNS Observation and HTTP Forensics

**Due:** before Week 3 class · **Points:** 100 · **Weight:** part of the 35% homework component
**Effort:** ~6–8 hours including the beginner bridge
**Individual:** every student captures their own command output and writes their own analysis.

> **The point of this assignment, in one sentence.** Diagnose DNS and HTTP behavior from
> reproducible public evidence — no personal domain, registrar account, DNS host, or
> instructor-owned demo domain is required.

---

## 1. Where this fits

| This assignment satisfies | Which means |
| --- | --- |
| **Milestone 2 — Architecture**, the *DNS and HTTP evidence* component | Your Task 1–4 DNS analysis and Task 5 HTTP diagnosis are reused in the milestone. |
| **HW4 (Week 4) prerequisite** | Your CAA and redirect-method analysis prepares you for ACME and HTTPS redirect work. |
| **Final Evidence Dossier**, DNS/HTTP section | Your raw transcripts and interpretations can be submitted essentially unchanged. |

Everything you produce here is reused. Nothing in this assignment is throwaway.

Use the [public weekly reference](reference.md), not private lecture/speaker notes. For
evidence-standard parts without a personal AI session, use the supplied DNS change-plan draft if it has been provided separately, cite it, and connect the claim to your captured public DNS evidence.

---

## 2. Prerequisites

Before you start, confirm all five. If any fails, use the supplied transcript fallback and say so in your report.

1. **`dig` works.** `dig -v` prints a version. Installation table in [`lab.md`](lab.md).
2. **`curl` works.** `curl --version` on macOS/Linux or `curl.exe --version` on Windows.
3. **Node 18+** for the supplied HTTP fault server: `node --version`.
4. **VS Code can execute `.http` files.** Use the REST Client extension or the HTTP
   request runner available in your environment.
5. **This repository is available locally.** Task 5 uses
   `weeks/week02/samples/http-faults/`.

> **No domain required.** Do not buy a domain for this assignment. Do not ask for DNS
> credentials. If you already own a domain, you may mention it as an optional comparison,
> but every graded DNS task below uses public names and supplied evidence.

---

## 3. Tasks

### Task 1 — Trace and explain a public delegation path (15 pts)

Run and capture:

```bash
dig +trace depaul.edu A
dig +trace www.depaul.edu A
```

Then annotate the first transcript. For **every** group in the output — starting with the root-hints bootstrap and ending with the terminal authoritative answer — write one line naming:

1. which server answered,
2. whether it gave a referral or an answer, and
3. how you can tell from the output.

The exact responding server can vary. That is normal; root, TLD, and authoritative roles are what matter.

**Deliverable:** `evidence/01-dig-trace.txt` (raw) + a report section with your annotation.

> If `+trace` stalls, use `dig -4 +trace` and say in your report that you did, and why.
> If it still stalls, use `samples/dig-trace-depaul.txt` as supplied evidence and label
> it honestly.

---

### Task 2 — Read a real zone's record choices (15 pts)

Capture these read-only lookups:

```bash
dig @1.1.1.1 depaul.edu SOA +noall +answer
dig @1.1.1.1 www.depaul.edu A +noall +answer
dig @1.1.1.1 depaul.edu MX +noall +answer
dig @1.1.1.1 depaul.edu TXT +noall +answer
dig @1.1.1.1 github.com CAA +noall +answer
dig @1.1.1.1 depaul.edu CAA
```

Write a short operator note for each record type:

| Record | What to explain |
| --- | --- |
| `SOA` | Which field controls negative-cache TTL and why operators care |
| `CNAME` | Which name points at another name and why each hop has its own TTL |
| `MX` | Why mail delivery uses a hostname, not a raw IP address |
| `TXT` | Which third-party verification or policy strings you can recognize |
| `CAA` | What `github.com` restricts and what `depaul.edu`'s NODATA result means |

**Deliverable:** `evidence/02-record-types.txt` + the operator notes in your report.

> DNS output changes over time. Grade the reasoning against the evidence you captured,
> not against one expected static answer.

---

### Task 3 — Compare authoritative truth with recursive caches (15 pts)

Use `www.depaul.edu` because it demonstrates a common web-app pattern: a friendly
hostname points at a platform-managed hostname.

Run and capture:

```bash
zone=depaul.edu
name=www.depaul.edu
ns=$(dig +short NS "$zone" | head -n 1)
date -u '+%Y-%m-%dT%H:%M:%SZ'
dig "@$ns" "$name" A +norecurse
dig @1.1.1.1 "$name" A
dig @8.8.8.8 "$name" A
dig @9.9.9.9 "$name" A
```

In your report:

1. Identify which response is authoritative and where the `aa` flag appears.
2. Identify the CNAME hop, if present, and the TTL on that hop.
3. Pick one RRset that appears in both the authoritative and recursive answers.
4. Compute apparent cache age:

```text
authoritative TTL measured at the same time − resolver-reported TTL
    = apparent seconds since that resolver's cache last refreshed
```

Call it **apparent** cache age. A resolver may cap, prefetch, reset, or serve stale.

**Deliverable:** `evidence/03-resolvers.txt` + the analysis.

---

### Task 4 — Write a cutover plan without executing one (15 pts)

You do **not** need a domain to learn the cutover mechanics. Use this scenario:

```text
Production name     : www.campuspulse.example
Current target      : old-edge.vendor.example
New target          : new-edge.vendor.example
Current TTL         : 86400
Temporary TTL       : 300
Cutover window      : Friday 20:00 UTC
Rollback target     : old-edge.vendor.example
Success criteria    : authority serves the new target, then two selected resolvers
                      show the new target after their cached TTLs expire
```

Write a plan that includes:

1. When to lower the TTL and why the old TTL controls the waiting period.
2. The earliest safe cutover time.
3. What exact `dig` commands you would run against authority, `1.1.1.1`, and `8.8.8.8`.
4. What evidence would trigger rollback.
5. What evidence is **not** a rollback trigger because it is expected cache lag.
6. When it is safe to retire the old target.

Then add a two-sentence reflection connecting the plan to your Task 3 public DNS
evidence.

**Deliverable:** a report section named "Cutover plan from public evidence."

---

### Task 5 — Diagnose supplied HTTP failures using VS Code `.http` requests (30 pts)

Three broken behaviours are supplied in `weeks/week02/samples/http-faults/`. Each is a
real, runnable fault, not a description of one.

Start the server:

```bash
node weeks/week02/samples/http-faults/fault-server.mjs
```

Then open:

```text
weeks/week02/samples/http-faults/week02-faults.http
```

Run the requests from VS Code. Save the response output you use for evidence.

| Fault | Request(s) in `.http` | The reported symptom |
| --- | --- | --- |
| 1 | Fault 1A and 1B | "`www` 404s but DNS is right. Not propagated yet?" |
| **2A** | Fault 2A | "Homepage redirect loop" |
| **2B** | Fault 2B and 2C | "Our POST silently stopped creating things" |
| 3 | Fault 3A, 3B, and 3C | "Redirects forever, but only in production" |

**Fault 2 contains two independent defects.** Treat 2A and 2B as separate faults and
produce all four outputs below for each. That is four faults' worth of write-up in total.

For **each** fault, produce all four:

1. **The annotated request/response pair** — the specific lines that carry the
evidence, with your annotation on each.
2. **The diagnosis** — one or two sentences naming the actual cause.
3. **The confirming request** — the `.http` request that distinguishes your diagnosis
from the next most plausible one, and what result confirms it.
4. **The fix** — what you would change, and where: app, proxy, platform edge, or DNS.

You must also include **one curl transcript** for Fault 1A so you can connect VS Code's
response pane back to the command-line envelope:

```bash
curl --noproxy '*' -i --max-time 5 \
  http://127.0.0.1:8081/healthz \
  -H 'Host: status.campuspulse.example'
```

**Deliverable:** `evidence/05-http-faults.txt`, containing your VS Code response
captures and the one curl capture, plus the four-part write-up per fault in your report.

> **Fault 2B contains a trap that will catch you if you are careless.** Two captures can
> look like the same request with one client behavior changed, and they produce opposite
> conclusions. If your diagnosis does not mention redirect method behavior, you missed it.

---

### Task 6 — The evidence standard and AI-use log (10 pts)

Every submission in this course carries the same eight parts. Items 5–8 are the ones
students lose marks on.

1. **Commit SHA or release tag** for the repo state you submitted.
2. **Reproduction commands** and the `.http` requests you executed.
3. **Raw sanitized evidence** — the `evidence/` files above.
4. **Annotated interpretation** in your own words — the report.
5. **At least one deliberate false lead and its rejection.** Example: "DNS is probably
   wrong" for Fault 1, rejected by the paired Host-header requests.
6. **AI-use log** — what you generated, accepted, rejected, and how you verified it.
7. **One challenged AI claim**, with the evidence that rejected it.
8. **Redaction attestation** — no live secrets, tokens, cookies, session identifiers,
   or API keys. Replace values; keep their shape.

> **Redaction, specifically for this assignment.** DNS output from the assigned public
> domains is generally safe. HTTP captures from the local fault server are safe. If you
> optionally test any real site, redact every `Set-Cookie` value and keep only its
> attributes — the attributes are the evidence.

---

## 4. Rubric

Within each row, assess 60% domain/protocol correctness and 40% reproducible evidence,
as specified in the syllabus. Do not penalize one defect again in a matching gate's
evidence dossier.

| # | Criterion | Pts |
| --- | --- | ---: |
| 1 | Public delegation trace captured and correctly annotated at every group | 15 |
| 2 | Real record types captured and explained operationally | 15 |
| 3 | Authoritative vs recursive answers compared, with apparent cache-age arithmetic | 15 |
| 4 | Cutover plan written from TTL mechanics and public evidence, without executing a DNS change | 15 |
| 5 | Four HTTP faults (1, 2A, 2B, 3) diagnosed from `.http` evidence and one curl envelope | 30 |
| 6 | Evidence standard complete, including false lead, AI-use log, challenged claim, and redaction | 10 |
| | **Total** | **100** |

---

## 5. Submission format

Push to your repository and submit the commit SHA in D2L.

```text
hw2/
├── README.md                     <- your report; all written sections
├── evidence/
│   ├── 01-dig-trace.txt
│   ├── 02-record-types.txt
│   ├── 03-resolvers.txt
│   └── 05-http-faults.txt
└── ai-use-log.md                 <- items 6 and 7 of the evidence standard
```

- Plain text for transcripts. **Not** screenshots — a screenshot of a terminal or VS Code
  response pane is not greppable and cannot be verified.
- Timestamps on DNS resolver comparisons. `date -u` before a command block is fine.
- `README.md` must link to each evidence file at the point it is discussed.
- For VS Code `.http` responses, copy the response text into the evidence file.

---

## 6. What good looks like vs. what will lose points

| ✅ What good looks like | ❌ What will lose points |
| --- | --- |
| "`www.depaul.edu` is a CNAME to a provider-managed name; the CNAME TTL and target A TTL are separate cache lifetimes." | "The site has a TTL." |
| "The authoritative answer had `aa`; the recursive answer had `ra` and a lower TTL, so I computed an apparent cache age of 312 s." | "The change propagated after a few minutes." |
| "Lowering TTL at 19:00 for a 20:00 cutover is unsafe because the old 86400-second TTL can still be cached." | "Set TTL low right before the change." |
| "`Host: status...` returns 200 and `Host: www...` returns 404 against the same URL, so DNS is not the changed variable." | "`www` is broken because DNS has not propagated." |
| "Fault 2B fails because a followed 302 can turn POST into GET; the direct POST request returns 201." | "The API is down." |
| A deliberate false lead you rejected with evidence. | "Everything worked on the first try." |

---

## 7. The non-generatable component

An AI can describe DNS and HTTP in four seconds. It cannot do any of this honestly for
you:

- **It cannot capture your current resolver answers.** Public DNS changes over time and
  anycast resolvers vary by location.
- **It cannot know which response lines you actually observed in VS Code.**
- **It cannot decide which false lead you believed first.** That judgment is part of the
  learning.
- **It cannot verify its own protocol claims without your transcripts.**

If you use a model for this — and you should — the honest split is: let it draft your
rationale prose, then check every technical claim against your own `dig`, curl, and
`.http` evidence. Log the corrections. That log is worth marks.
