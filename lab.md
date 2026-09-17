# Week 2 Lab — Trace, Compare, and Replay HTTP

**35 minutes. Work individually. No domain ownership or DNS-console access required.**

Commands start at the **course content root** (student release; `instructor` for
authors). Continue [web foundations steps 4–6](../../docs/web-foundations.md) within
the HW2 work budget; this is not extra prep.

> **What you leave with.** A public `dig +trace` transcript, an authoritative-vs-cache
> comparison, a written cutover decision, and VS Code `.http` response evidence for the
> supplied HTTP faults.

---

## Before you start

| You need | Check it |
| --- | --- |
| `dig` or supplied trace fallback | `dig -v` prints a version |
| `curl` | `curl --version` (Windows: `curl.exe --version`) |
| Node 18+ | `node --version` |
| VS Code HTTP request runner | REST Client extension or equivalent |
| A scratch file | `week02-lab.md` — paste commands, outputs, and observations |

### Installing `dig`

| Platform | How |
| --- | --- |
| **Windows** | Use approved WSL with `sudo apt update && sudo apt install dnsutils`, or the assigned course Linux shell. |
| macOS | Built in. If missing: `brew install bind` |
| Debian/Ubuntu/WSL | `sudo apt install dnsutils` |
| Fedora/RHEL | `sudo dnf install bind-utils` |

> **If tooling fails:** use the supplied transcripts in `samples/` and label them as
> supplied evidence. Do not substitute a screenshot-only web lookup for `dig` output.

---

## Part 1 — Trace delegation from the root (7 min)

Run:

```bash
dig +trace depaul.edu A
```

**Record in your file:** the groups in the trace and, for each group, which server
answered and whether it returned a referral or an answer.

Then run the same query by hand, one hop at a time:

```bash
dig @a.root-servers.net depaul.edu A +norecurse
dig @a.edu-servers.net  depaul.edu A +norecurse
dig @ns1.depaul.edu     depaul.edu A +norecurse
```

**Checkpoint 1.** Which server sets the `aa` flag, and what does that flag let you
conclude?

---

## Part 2 — Compare authority with recursive caches (7 min)

Use a public web-app hostname:

```bash
zone=depaul.edu
name=www.depaul.edu
ns=$(dig +short NS "$zone" | head -n 1)
date -u '+%Y-%m-%dT%H:%M:%SZ'
dig "@$ns" "$name" A +norecurse
dig @1.1.1.1 "$name" A
dig @8.8.8.8 "$name" A
```

**Record:** flags, answer section, CNAME chain if present, and TTLs.

**Checkpoint 2.** Pick one RRset that appears in both authority and a recursive answer.
Subtract the resolver TTL from the authoritative TTL and call the result an **apparent**
cache age.

---

## Part 3 — Watch a TTL without changing DNS (5 min)

Run:

```bash
for i in 1 2 3 4; do
  date -u '+%H:%M:%SZ'
  dig @1.1.1.1 "$name" A +noall +answer
  sleep 10
done
```

PowerShell equivalent:

```powershell
1..4 | ForEach-Object {
  (Get-Date).ToUniversalTime().ToString('HH:mm:ssZ')
  dig '@1.1.1.1' $name A +noall +answer
  Start-Sleep -Seconds 10
}
```

**Checkpoint 3.** Did the TTL decrease, reset, or vary? Any result is acceptable if you
explain it: anycast resolver nodes and resolver refresh behavior can make live output
non-monotonic.

---

## Part 4 — Write the cutover decision (6 min)

Use this scenario; do not execute a DNS change:

```text
Production name : www.campuspulse.example
Old target      : old-edge.vendor.example
New target      : new-edge.vendor.example
Old TTL         : 86400
Temporary TTL   : 300
Target cutover  : Friday 20:00 UTC
```

Write four lines in your scratch file:

1. Latest safe time to lower the TTL.
2. Earliest safe cutover time and why the **old** TTL controls it.
3. The authority and resolver `dig` commands you would run.
4. One rollback trigger and one non-trigger that is merely expected cache lag.

---

## Part 5 — Replay HTTP requests in VS Code (10 min)

Start the local fault server:

```bash
node weeks/week02/samples/http-faults/fault-server.mjs
```

Authors working from this repository root can use:

```bash
node instructor/weeks/week02/samples/http-faults/fault-server.mjs
```

Open this file in VS Code:

```text
weeks/week02/samples/http-faults/week02-faults.http
```

Authors working from this repository root can open:

```text
instructor/weeks/week02/samples/http-faults/week02-faults.http
```

Run these request pairs and copy the response lines that prove the diagnosis:

| Request(s) | What to compare |
| --- | --- |
| Fault 1A vs Fault 1B | Same URL, different `Host`, `200` vs `404` |
| Fault 2B vs Fault 2C | Redirected POST vs direct POST |
| Fault 3A vs Fault 3C | Proxy loop vs direct request with `X-Forwarded-Proto` |

Then run the one curl envelope from HW2 so you can compare terminal output with VS Code:

```bash
curl --noproxy '*' -i --max-time 5 \
  http://127.0.0.1:8081/healthz \
  -H 'Host: status.campuspulse.example'
```

**Checkpoint 4.** For one fault, write the exact request or response line that proves
the diagnosis.

Press `Ctrl+C` in the server terminal when finished.

---

## What feeds HW2

| Lab artifact | HW2 task |
| --- | --- |
| Public `dig +trace` transcript | Task 1 |
| Record-type and resolver comparisons | Tasks 2–3 |
| Written cutover decision | Task 4 |
| VS Code `.http` responses + one curl envelope | Task 5 |
