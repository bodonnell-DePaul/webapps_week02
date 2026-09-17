# HW2 HTTP Fault Lab

Three deliberately broken HTTP behaviours, each modelled on a production failure that
happens constantly. You diagnose them from request/response evidence alone.

**These are real, runnable faults — not descriptions of faults.** Every transcript in this
folder was captured from `fault-server.mjs` running on `127.0.0.1`. You can reproduce all
of it, and HW2 Task 6 requires you to reproduce at least one.

---

## Running it

```bash
node fault-server.mjs
```

```
fault1    listening on http://127.0.0.1:8081
fault2    listening on http://127.0.0.1:8082
fault3    listening on http://127.0.0.1:8083
fault3-lb listening on http://127.0.0.1:8084
```

Ports busy? `node fault-server.mjs --port 9100` moves everything to 9100–9103.

For concurrent automated checks, use **`node fault-server.mjs --port 0`**.
Each of the four listeners asks the OS for its own available loopback port;
they are **not** assumed adjacent. After all four are listening, the process
prints one machine-readable `PORTS` line with the keys `fault1`, `fault2`,
`fault3`, and `proxy`. Use those actual values in requests and `--resolve`
arguments. The proxy targets the actual `fault3` port, and redirect URLs use
the actual listener ports. No arguments still means 8081–8084; a nonzero
`--port N` still means N through N+3, so N must not exceed 65532.

A bind failure prints its error and exits nonzero, closing any listeners this
process already started. It never stops another process to free a port.

**Requirements:** Node 18 or later. No dependencies, no `npm install`. The server binds
`127.0.0.1` only — nothing is exposed to your network.

---

## The three faults

### Fault 1 — `:8081`

> *"We pointed `www` at the platform four hours ago. `dig` agrees. The apex works. `www`
> returns 404. The DNS must not have propagated yet."*

Artifact: [`fault-1-host-header.txt`](fault-1-host-header.txt) — three parts. Part C is the
one worth studying: it removes DNS from the experiment entirely.

### Fault 2 — `:8082`

> *"The homepage flashes and then the browser says the page isn't redirecting properly."*
> *"Our incident-reporting POST silently stopped creating incidents after we moved the
> endpoint. No errors in the client."*

Artifact: [`fault-2-redirect-chain.txt`](fault-2-redirect-chain.txt) — three parts, **two
separate defects**.

> ⚠️ **Parts B and C are the same request with one flag different, and they produce
> opposite conclusions.** If your diagnosis does not account for that, you have missed the
> point of the artifact.

### Fault 3 — `:8083` behind `:8084`

> *"Staging is fine. Production redirects forever. Nothing changed in the app. We only put
> the load balancer in front of it."*

`:8084` is a stand-in for a TLS-terminating load balancer; `:8083` is the app behind it.
The app exposes two diagnostic response headers — `X-App-Saw-XFP` and
`X-App-Saw-Forwarded-Headers` — so you can see what it actually received.

Artifact: [`fault-3-x-forwarded-proto.txt`](fault-3-x-forwarded-proto.txt) — three parts:
through the proxy, bypassing the proxy, and bypassing the proxy with one header added by
hand.

> **Real apps do not expose `X-App-Saw-*` headers.** They are here so you can learn the
> reasoning. In production you get the same information by logging received headers at the
> app, or by using part B's technique: request the app *directly*, behind the proxy.

---

## What HW2 Task 6 asks for

For **each** fault, four things:

1. **The annotated request/response pair** — the specific lines carrying the evidence,
   with your annotation on each.
2. **The diagnosis** — one or two sentences naming the actual cause.
3. **The confirming command** — the single command that distinguishes your diagnosis from
   the next most plausible one, and the result that would confirm it.
4. **The fix** — what you would change, and where: app, proxy, or DNS.

Plus: reproduce **at least one** fault yourself and include your own capture.

---

## VS Code `.http` workbook

Open [`week02-faults.http`](week02-faults.http) in VS Code and execute each named
request with your HTTP request runner. The workbook covers the same three faults as the
captures: Host-header routing, redirect method behavior, and proxy/header mismatch.

Use the command-line examples below only when you need to compare VS Code's response pane
with curl's raw header/body output.

## Useful commands

```bash
# Set the Host header by hand against a literal address.
curl -sI http://127.0.0.1:8081/healthz -H "Host: status.campuspulse.example"

# Map a hostname to an address for this request only. This is the honest way
# to test a name before you point DNS at it.
curl -sv --resolve www.campuspulse.example:8081:127.0.0.1 \
  http://www.campuspulse.example:8081/healthz

# Follow redirects, cap them, and show the error. -S matters: plain -s hides it.
curl -sSIL --max-redirs 5 http://campuspulse.example:8082/ ; echo "exit=$?"

# Send a body and let curl choose the method. Do NOT add -X here.
curl -sv -L -d '{"service":"library-wifi"}' -H 'Content-Type: application/json' \
  http://campuspulse.example:8082/legacy/incidents

# Speak HTTP by hand. Connection: close, or nc will sit there.
printf 'GET /healthz HTTP/1.1\r\nHost: status.campuspulse.example\r\nConnection: close\r\n\r\n' \
  | nc 127.0.0.1 8081
```

**Windows without `nc`:** the PowerShell `TcpClient` block in [`../../lab.md`](../../lab.md)
Part 5.2 does the same job with no extra tooling.

---

## A hint that is not a spoiler

Every one of these three is diagnosed the same way: **change exactly one variable per
command, and read what the server actually received rather than what you meant to send.**

In `curl -v` output, `>` lines are what your client sent and `<` lines are what the server
returned. `*` lines are curl narrating its own behaviour — and in one of these artifacts,
curl's narration and curl's behaviour disagree.

---

## Files

| File | What it is |
| --- | --- |
| `fault-server.mjs` | The server. Read it *after* you have diagnosed the faults, not before. |
| `fault-1-host-header.txt` | Fault 1 evidence |
| `fault-2-redirect-chain.txt` | Fault 2 evidence |
| `fault-3-x-forwarded-proto.txt` | Fault 3 evidence |

> **Instructors:** diagnoses and grading notes are in
> `../../instructor-guide.md` (provided separately by the instructor), not here.
