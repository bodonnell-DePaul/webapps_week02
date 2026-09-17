# Week 2 — Pre-Class Prep

**Budget: ~45 minutes.** Complete before class. The lecture assumes you have done it —
Block A opens on a real outage and does not re-explain what a recursive resolver is.

> **Why this is flipped.** Week 2 spends its 180 minutes on the things you cannot get
> from a video: reading real `dig` output, deciding a TTL, and executing a cutover.
> The vocabulary is your job tonight.

---

## Core prep — do all five (44 min)

| # | Resource | Publisher | Type | Time |
| --- | --- | --- | --- | ---: |
| 1 | [How DNS Works](https://www.youtube.com/watch?v=uOfonONtIuk) | Computerphile (Dr. Mike Pound) | Video | 13 min |
| 2 | [What is DNS? How does DNS work?](https://www.cloudflare.com/learning/dns/what-is-dns/) | Cloudflare Learning Center | Article | 8 min |
| 3 | [DNS Records](https://www.cloudflare.com/learning/dns/dns-records/) | Cloudflare Learning Center | Article | 10 min |
| 4 | [Domains and ownership](../../docs/getting-started.md#5-domains-choose-the-no-cost-route-or-your-own-registration) | Course worked guide | No purchase/paywall | 10 min |
| 5 | [Registrar (official definition)](https://www.icann.org/en/icann-acronyms-and-terms/registrar-en) | ICANN | Reference | 3 min |

**Accessible alternative:** if Cloudflare items 2–3 or the ICANN glossary will
not load, use [the public course reference](reference.md#resolution-and-registration-basics)
and its ownership/record table instead. They cover the same required vocabulary;
substitution earns the same credit and does not add time to the prep budget.
HTTP 403 from automation or a timeout is not sufficient to label a page dead.

### What to look for in each

**1 — Computerphile, How DNS Works.** Watch for the *sequence* of servers, not the
packet format. When you finish, you should be able to name the four parties a query
touches in order. If you cannot, rewind the middle five minutes.

**2 — Cloudflare, What is DNS.** Read for the recursive/authoritative distinction.
Ignore the marketing at the end.

**3 — Cloudflare, DNS Records.** This is your reference table. **Skim** the whole
thing, then read `A`, `AAAA`, `CNAME`, `MX`, `TXT`, `NS`, `SOA`, and `CAA` properly.
You will use every one of them in the lab. `SRV` is worth recognising; you will not
configure one.

**4 — Course domains guide.** Identify registrant, registrar, registry and DNS
host; choose the no-cost course subdomain or a personally registered name.
The [Julia Evans zine announcement](https://jvns.ca/blog/2022/04/26/new-zine--how-dns-works-/)
is optional enrichment. Buying the zine or reading unavailable panels is not required.

**5 — ICANN, Registrar.** Three minutes, and it is the authoritative definition rather
than a vendor's paraphrase. Note who accredits registrars and who operates registries.

---

## Reference only — skim, do not study (0 min budgeted)

These two are **optional lookup references**, not zero-minute required reading.
Recognition-level DNSSEC/routing vocabulary is introduced in class; configuration
is not assessed.

| # | Resource | Publisher | Why it is here |
| --- | --- | --- | --- |
| 6 | [How DNSSEC works](https://www.cloudflare.com/learning/dns/dnssec/how-dnssec-works/) | Cloudflare | You will see `RRSIG` and `DS` records in class; know what they are |
| 7 | [Route 53 routing policies](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy.html) | AWS | The authoritative source on DNS traffic management. Skim the policy list only |

> **Optional enrichment, if the reference items interested you:** Slack's
> [postmortem of their 2021 DNSSEC rollout](https://slack.engineering/what-happened-during-slacks-dnssec-rollout/)
> is the best real-world account of why DNSSEC changes are high-stakes. Not required.

---

## Come to class with

- [ ] Your DNS-host login or assigned course-zone change workflow works.
      Registrar access is needed only for your own registration/delegation.
- [ ] **Your DNS host console open and authenticated before class starts.** MFA prompts
      cost the lab three minutes it does not have.
- [ ] `dig` installed and `dig -v` printing a version. Install instructions are in
      [`lab.md`](lab.md); do it tonight, not at 6:05 pm.
- [ ] `curl --version` working.
- [ ] `node --version` showing **24 LTS**.
- [ ] One question about your own domain that the prep did not answer.

---

## Readiness check

Five questions. Answer before class; we debrief in the first ten minutes.
Do not look anything up — the point is to find out what you did not absorb.

**Q1.** Your laptop asks `1.1.1.1` for `example.com`. `1.1.1.1` then asks a root
server, then a `.com` server, then example.com's own nameserver. Which of those four
queries is *recursive*, and which are *iterative*?

**Q2.** You bought `mysite.example` from Namecheap and moved your DNS to Cloudflare.
You need to change the `A` record for `www`. Whose control panel do you open, and why?

**Q3.** A DNS record has a TTL of 3600. You change its value at 09:00. At 09:05, a
colleague in another country still sees the old value. Give the *mechanism* that
explains this, in one sentence. (The phrase "DNS propagation" is not a mechanism.)

**Q4.** What does a `CNAME` record do, and why can you not put one at the apex
(the bare `mysite.example`, with no subdomain)?

**Q5.** Name the record type you would use for each: (a) pointing a name at an IPv6
address; (b) telling the world which certificate authorities may issue certificates
for your domain; (c) proving to Google that you control the domain; (d) routing email.

---
