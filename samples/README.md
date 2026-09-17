# Week 2 — Captured Evidence

Every terminal transcript quoted in the Week 2 decks was captured live from real resolvers
and a real local server. **Nothing here is fabricated.** Where a slide shows less than the
full capture, the slide says so and the complete output is here.

**Captured:** 2026-08-15, from a residential connection in the US Pacific time zone.
Times in the transcripts are UTC.

> **Reproducibility note.** These are live-network captures. TTL remainders, anycast node
> selection, and CDN-steered addresses **will differ** when you re-run them, and that is
> the point of several of the slides. The *shapes* — flag combinations, referral
> structure, section contents — are stable.

---

## DNS — resolution path

| File | Command | What it shows |
| --- | --- | --- |
| `dig-trace-depaul.txt` | `dig -4 @1.1.1.1 +trace depaul.edu A` | The full delegation walk: root hints → `edu.` referral → `depaul.edu` referral → the answer |
| `dig-iter-1-root.txt` | `dig @a.root-servers.net depaul.edu A +norecurse` | A root referral. `flags: qr`, `ANSWER: 0`, `AUTHORITY: 13`, plus glue |
| `dig-iter-2-tld.txt` | `dig @a.edu-servers.net depaul.edu A +norecurse` | The `edu.` referral to DePaul's four nameservers at TTL 172800 |
| `dig-iter-3-auth.txt` | `dig @ns1.depaul.edu depaul.edu A +norecurse` | The authoritative answer. `flags: qr aa`, `ANSWER: 1` |
| `dig-iter-root.txt` | (first exploratory capture) | Kept for provenance; superseded by `dig-iter-1-root.txt` |
| `dig-recursive-vs-authoritative.txt` | both of the above, side by side | `qr rd ra` + falling TTL vs `qr aa` + zone TTL. **The block's key diagnostic.** |

## DNS — caching

| File | What it shows |
| --- | --- |
| `os-cache-ttl-windows.txt` | The Windows stub-resolver cache counting down 30 → 24 → 19 → 14 → 9 → 4 for `docs.github.com`. The cleanest TTL demonstration in the week. |
| `ttl-countdown.txt` | The same idea against a *public* resolver, where anycast makes the countdown non-monotonic. Honest, and a teaching point in itself. |
| `dig-anycast-cache-nodes.txt` | Six back-to-back queries to `1.1.1.1` returning different TTL remainders — proof that one resolver address is many independent caches. |
| `dig-cache-probe.txt` | `+norecurse` against a recursive resolver. An answer with `flags: qr ra` (no `rd`) proves the response came from cache. |
| `dig-nxdomain.txt` | NXDOMAIN with an SOA in AUTHORITY at TTL 900 — negative caching, bounded by the SOA `minimum`. |
| `dig-split-answers.txt` | The same name queried at 1.1.1.1, 8.8.8.8, and 9.9.9.9. Different TTL remainders **and** a different address from Quad9. |

## DNS — zone records

| File | What it shows |
| --- | --- |
| `dig-soa-depaul.txt` | The SOA, with all seven fields. `minimum` = 900, matching the negative-cache TTL above. |
| `dig-ns-depaul.txt` | The child zone's own NS RRset at TTL 1800/14400 — compare with the parent's 172800. |
| `dig-mx-depaul.txt` | A single MX with priority 0 pointing at a *name*, not an address. |
| `dig-txt-depaul.txt` | 21 TXT records, including an SPF record split into two quoted chunks (the 255-character rule) and 16 vendor domain-verification strings. Note `;; Truncated, retrying in TCP mode.` |
| `dig-caa-depaul.txt` | **NODATA** — `NOERROR` with `ANSWER: 0` and an SOA in AUTHORITY. No CAA policy exists, so any CA may issue. |
| `dig-caa-github.txt` | Seven CAA records, showing `issue` and `issuewild` in use. |
| `dig-www-depaul.txt` | A CNAME to a platform-generated hostname at TTL 86400, whose A records carry TTL 300 — each link cached independently. |
| `dig-cname-chain.txt` | Four A records at TTL 30 for `docs.github.com`. |
| `dig-jvns-a.txt`, `dig-jvns-ns.txt` | A small independently-operated domain, for contrast with an institutional one. |

## DNS over HTTPS

| File | What it shows |
| --- | --- |
| `doh-json.txt` | Cloudflare's JSON DoH API. Note `Status`, `RD`, `RA`, `TTL` — the same fields `dig` prints. **This is a vendor convenience API, not RFC 8484**, which uses `application/dns-message`. |
| `doh-wire.txt` | The same request with `curl -v`: port 443, ALPN `h2`, an ordinary `GET`. |

## HTTP

| File | What it shows |
| --- | --- |
| `http-redirect-chain-real.txt` | A real redirect in the wild: `depaul.edu` → `www.depaul.edu` via **307**, with `num_redirects` from curl's write-out. |
| `http-headers-real.txt` | Real response headers including `vary: Accept-Encoding`, `content-encoding: gzip`, `cache-status`, `etag`, and HSTS. **Sanitized** — see below. |
| `http-faults/` | The three HW2 fault artifacts and the server that produces them. See [`http-faults/README.md`](http-faults/README.md). |

---

## Redaction

`http-headers-real.txt` was captured from live public websites and then sanitized before
being committed:

| Value | Action |
| --- | --- |
| `set-cookie: __cf_bm=...` | Replaced with `REDACTED-BOT-MANAGEMENT-COOKIE`; **attributes preserved**, because the attributes are the evidence |
| `cf-ray` | Replaced with `REDACTED` |
| `x-nf-request-id` | Replaced with `REDACTED` |

Nothing else was altered. This is the same redaction discipline HW2 requires: **replace
values, keep their shape.**

---

## Reproducing these

```bash
# The delegation walk. Add -4 if your network has no IPv6 route.
dig +trace depaul.edu A

# One hop at a time.
dig @a.root-servers.net depaul.edu A +norecurse
dig @a.edu-servers.net  depaul.edu A +norecurse
dig @ns1.depaul.edu     depaul.edu A +norecurse

# Recursive vs authoritative — read the flags and the TTL.
dig @1.1.1.1 depaul.edu A
dig @ns1.depaul.edu depaul.edu A +norecurse

# Negative caching. The AUTHORITY SOA TTL is the negative-cache lifetime.
dig @1.1.1.1 nonexistent-week2-demo.depaul.edu A

# Three resolvers, one name. Expect disagreement.
for r in 1.1.1.1 8.8.8.8 9.9.9.9; do
  dig @$r www.microsoft.com A +noall +answer
done

# DoH, which is just an HTTPS GET.
curl -s -H "accept: application/dns-json" \
  "https://cloudflare-dns.com/dns-query?name=depaul.edu&type=A"
```

Windows OS-cache countdown, which needs no `dig`:

```powershell
Clear-DnsClientCache
Resolve-DnsName docs.github.com -Type A | Out-Null
1..6 | ForEach-Object {
  Get-DnsClientCache -Entry docs.github.com | Where-Object Type -eq 1 |
    Select-Object -First 1 Entry, TimeToLive, Data
  Start-Sleep 5
}
```
