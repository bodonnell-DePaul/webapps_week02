# Week 2: DNS: Turning a Name into an Address — class notes

These notes contain the student-visible teaching material and examples. Complete the exercises individually. Instructor delivery notes and answer keys are not included.

## Weekly session — DNS: Turning a Name into an Address

Review, preparation, logistics, teaching, individual practice, and the end-of-class brief

## Short review

### Recall the Week 1 journey

#### Retrieve the evidence

- Where did name lookup fit in a fresh visit to a website?
- What did the socket table reveal about "works on localhost"?
- Which observation changed your first explanation?

#### Bring that method forward

- You control a domain or an assigned subdomain
- Explain what you can change and where you manage it
- Today: identify who answers a name lookup and who remembers the answer

## Prelecture review

### What tonight's prep already told you

- **You watched:** the sequence of servers a query touches, stub to root to authoritative
- **You read:** the recursive/authoritative distinction, the DNS record reference table, and the registrar/registry/DNS-host distinction
- **You predicted (readiness check):** why a colleague sees an old value minutes after your change — "propagation" is not an accepted answer here
- **Today gives the mechanism:** which flags prove recursive vs. iterative, and which cache is holding that old answer
- **Registrar vs. DNS host** returns properly in Block B, when you edit your own zone

> **Key idea**
>
> If "DNS propagation" was your instinct, today replaces it with a cache and a clock you can name.

**Sources**

- Course — [Week 2 prep](prep.md)

## Weekly logistics

### This week, operationally

- **Tonight's lab needs your own domain.** If you used the Week 1 hardship path, your delegated subdomain works exactly the same way
- **Still solo work.** Your zone, your registrar login, your cutover — no shared submissions
- **Feeds Milestone 2 — Architecture.** Today's zone plan and TTL decision go into it; Weeks 1–2 milestones are ungraded formative checkpoints
- **HW2 is assigned at the end of class** — the brief and rubric are on the closing slides, after Block C

**Sources**

- Course — [syllabus](../../docs/new_syllabus.md) · [course map](../../docs/course-map.md)

## Block A — How a name resolves

### Fictional CampusPulse case: one name, two correct answers

#### 9:00 a.m. — the cutover

- The **status** name moves from `203.0.113.10` to `.44`
- Maya's campus resolver still returns `.10`
- Luis asks `1.1.1.1` and gets `.44`

#### 9:07 a.m. — inspect the clocks

- Maya's cached answer has **TTL 1127**
- The public resolver's answer has **TTL 58**
- Nothing is "still propagating"; two caches forget on different schedules

### The failure was a name with no address

- Amazon's DynamoDB DNS automation hit a **latent race condition** in its `us-east-1` region
- The result: an **empty DNS record** for `dynamodb.us-east-1.amazonaws.com`
- The automation that should have repaired it *could not*, because the record looked intentional
- DynamoDB errors ran 11:48 PM to 2:40 AM; the knock-on to NLB and EC2 ran until 2:20 PM

> **Key idea**
>
> No server was down. No code was deployed. A name pointed at nothing, and every
> service that depended on that name pointed at nothing too.

**Sources**

- AWS — [Service disruption in the N. Virginia (us-east-1) Region, 19–20 October 2025](https://aws.amazon.com/message/101925/)

### The model in your head is probably a phone book

- A phone book is **one** book, held by **one** party, that you read **once**
- DNS is a distributed database with at least four independent caches on the path
- Nobody holds the whole thing. Every participant knows only who to ask next
- There is no "the" answer to a name — there is *your* answer, right now, from *your* resolver

> **The myth we kill today**
>
> "DNS propagation." Nothing propagates. Nothing is pushed anywhere. Records are
> *pulled* on demand and *cached* on a timer you chose.

**Sources**

- Julia Evans — [New Zine: How DNS Works!](https://jvns.ca/blog/2022/04/26/new-zine--how-dns-works-/)

### Who is actually in the conversation

![Five participants in DNS resolution: the application](../../assets/class-notes/week02-session-s8-1.svg)

*Five participants. The stub asks once; the recursive resolver does all the walking.*

### Two words that get swapped constantly

#### Recursive

**"Answer this for me."**

Your laptop asks its resolver once and waits. It does not follow referrals.

`rd` = *recursion desired*.

#### Iterative

**"Tell me who to ask next."**

The resolver asks the root, then the TLD, then the authoritative server.

Named for the service it **provides**, not the queries it sends.

### Three questions, three servers

### Step 1 — ask a root server. It refuses to answer.

```console title="dig @a.root-servers.net depaul.edu A +norecurse" mark=4,7
$ dig @a.root-servers.net depaul.edu A +norecurse

;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 56760
;; flags: qr; QUERY: 1, ANSWER: 0, AUTHORITY: 13, ADDITIONAL: 27

;; AUTHORITY SECTION:
edu.          172800  IN  NS  a.edu-servers.net.
edu.          172800  IN  NS  b.edu-servers.net.
                                        ... 11 more edu. nameservers

;; ADDITIONAL SECTION:
a.edu-servers.net.  172800  IN  A     192.5.6.30

;; SERVER: 198.41.0.4#53(a.root-servers.net) (UDP)
```

> **Note**
>
> `ANSWER: 0` with **NS in AUTHORITY** is a *referral*. Flags are `qr` only — no
> `aa`, so this is not an authoritative answer.

### Step 2 — ask the TLD. It also refuses.

```console title="dig @a.edu-servers.net depaul.edu A +norecurse" mark=4,7
$ dig @a.edu-servers.net depaul.edu A +norecurse

;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 46795
;; flags: qr; QUERY: 1, ANSWER: 0, AUTHORITY: 4, ADDITIONAL: 5

;; AUTHORITY SECTION:
depaul.edu.   172800  IN  NS  ns1.depaul.edu.
depaul.edu.   172800  IN  NS  ns2.depaul.edu.
                                        ... ns3 and ns4

;; ADDITIONAL SECTION:
ns1.depaul.edu.  172800  IN  A  140.192.0.2

;; SERVER: 192.5.6.30#53(a.edu-servers.net) (UDP)
```

> **Key idea**
>
> **This is the delegation.** These NS records live in the *parent* zone (`edu.`),
> not in DePaul's. Changing nameservers means changing this.

### Step 3 — ask the authoritative server. Now you get an answer.

```console title="dig @ns1.depaul.edu depaul.edu A +norecurse" mark=4,7
$ dig @ns1.depaul.edu depaul.edu A +norecurse

;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 37664
;; flags: qr aa; QUERY: 1, ANSWER: 1, AUTHORITY: 4

;; ANSWER SECTION:
depaul.edu.   86400  IN  A   64.239.109.1

;; AUTHORITY SECTION:
depaul.edu.   14400  IN  NS  ns1.depaul.edu.

;; SERVER: 140.192.0.2#53(ns1.depaul.edu) (UDP)
```

> **Key idea**
>
> `aa` — **authoritative answer**. Only a server configured to hold this zone sets
> that flag. It is the end of the chain.

### `dig +trace` does all three, and shows its work

```console title="dig +trace depaul.edu A  (elided to the referral boundaries)"
$ dig +trace depaul.edu A

.           516715 IN NS a.root-servers.net.      <- root hints
;; Received from 1.1.1.1#53(1.1.1.1)

edu.        172800 IN NS a.edu-servers.net.       <- root referral
;; Received from 192.33.4.12#53(c.root-servers.net)

depaul.edu. 172800 IN NS ns1.depaul.edu.          <- edu referral
;; Received from 192.33.14.30#53(b.edu-servers.net)

depaul.edu.  86400 IN A  64.239.109.1             <- the answer
;; Received from 140.192.0.2#53(ns1.depaul.edu)
```

> **Tip**
>
> Read `+trace` bottom-up. The last `Received from` names the server that answered.

**Sources**

- IETF — [RFC 1034, Domain Names: Concepts and Facilities](https://www.rfc-editor.org/rfc/rfc1034.html)

### Who answered? Two flags tell you

#### A recursive resolver

```console
$ dig @1.1.1.1 depaul.edu A
;; flags: qr rd ra
depaul.edu. 85555 IN A ...
```

- `ra` = recursion available
- **No `aa`** — it is repeating
- TTL `85555` — *counting down*

#### An authoritative server

```console
$ dig @ns1... +norecurse
;; flags: qr aa
depaul.edu. 86400 IN A ...
```

- `aa` — it holds the zone
- **No `ra`** — will not recurse
- TTL `86400` — *the zone value*

### Nobody forgets on your schedule

### Four caches, four clocks, four operators

| Cache | Who controls it | How you clear it |
| --- | --- | --- |
| Browser | The browser vendor | Restart, or `net-internals/#dns` |
| OS stub cache | You, on your machine | `ipconfig /flushdns` |
| Recursive resolver | Your ISP, or Cloudflare | **You cannot.** Wait. |
| CDN / edge resolver | Your CDN vendor | Vendor purge, if offered |

### Watch one cache expire, in real time

```console title="Windows OS resolver cache — docs.github.com, zone TTL 30"
PS> Clear-DnsClientCache
PS> Resolve-DnsName docs.github.com -Type A | Out-Null
PS> 1..6 | % { Get-DnsClientCache -Entry docs.github.com; sleep 5 }

19:52:43Z  docs.github.com   TTL=  30   185.199.110.154
19:52:48Z  docs.github.com   TTL=  24   185.199.110.154
19:52:53Z  docs.github.com   TTL=  19   185.199.110.154
19:52:58Z  docs.github.com   TTL=  14   185.199.110.154
19:53:03Z  docs.github.com   TTL=   9   185.199.110.154
19:53:08Z  docs.github.com   TTL=   4   185.199.110.154

# at TTL=0 the entry is evicted and the next lookup leaves the machine
```

> **Key idea**
>
> The TTL is not a hint and not a target. It is a countdown that started the moment
> this cache was filled, and nothing you do at your DNS host restarts it.

### macOS: observe a native lookup

```bash title="macOS Terminal - Bash/zsh; internet; no administrator commands"
dscacheutil -q host -a name docs.github.com
dns-sd -G v4 docs.github.com
# Ctrl+C after an Add row, or if no result appears after 10 s.
sleep 5
dns-sd -G v4 docs.github.com
# Ctrl+C again after recording the address and TTL.
```

> **Key idea**
>
> dns-sd reports the native resolver's address and TTL. This is an active lookup, not a dump of every cached record.

**Sources**

- Apple — [dns-sd implementation and address/TTL output](https://github.com/apple-oss-distributions/mDNSResponder/blob/main/Clients/dns-sd.c)

### Run it: watch this machine's DNS cache

```powershell title="Windows PowerShell - any directory; internet required"
Resolve-DnsName docs.github.com -Type A -DnsOnly | Out-Null
1..6 | ForEach-Object {
  (Get-Date).ToUniversalTime().ToString('HH:mm:ss')
  Get-DnsClientCache -Entry docs.github.com |
    Where-Object Type -eq 1 |
    Select-Object Entry, TimeToLive, Data
  Start-Sleep -Seconds 5
}
```

**Sources**

- Microsoft — [`Get-DnsClientCache`](https://learn.microsoft.com/powershell/module/dnsclient/get-dnsclientcache)
- Course — [recorded countdown](samples/os-cache-ttl-windows.txt)

### macOS: compare the two recursive answers

```bash title="macOS Terminal - Bash/zsh; outbound DNS to these resolvers required"
name='depaul.edu'
dig "@1.1.1.1" "$name" A
dig "@8.8.8.8" "$name" A
```

> **Key idea**
>
> Read SERVER, status, answer, and TTL. These replies come from the selected recursive resolvers, not your local cache.

### Run it: compare two recursive answers

```powershell title="Windows PowerShell - outbound DNS to public resolvers required"
$name = 'depaul.edu'
Resolve-DnsName $name -Type A -Server 1.1.1.1 -DnsOnly
Resolve-DnsName $name -Type A -Server 8.8.8.8 -DnsOnly
```

**Sources**

- Microsoft — [`Resolve-DnsName`](https://learn.microsoft.com/powershell/module/dnsclient/resolve-dnsname)
- Course — [resolver comparison](samples/dig-split-answers.txt)

### Interpret the comparison before changing anything

| Your observation | Plausible mechanism | What to conclude |
| --- | --- | --- |
| Different remaining TTLs | Caches filled or refreshed at different times | Compare cache age, not just the name |
| Different addresses | Cached older data or authoritative traffic steering | Compare time, resolver, and authority |
| Matching answers | These two queries agree right now | Other clients may still differ |

**Sources**

- Course — [split answers and provenance](samples/dig-split-answers.txt)
- IETF — [RFC 1034, caching](https://www.rfc-editor.org/rfc/rfc1034.html)

### Maya and Luis can both be reading valid cache state

| Illustrative time | Maya's cache | Luis's cache |
| --- | --- | --- |
| 09:00, before edit | Old address; 600 seconds remain | No entry |
| 09:01, record changed | Still old; 540 seconds remain | Fetches new authoritative value |
| 09:05, compare browsers | Still old; 300 seconds remain | New address |
| Maya's entry expires | Next lookup can fetch the new value | Independent timer continues |

**Sources**

- IETF — [RFC 1034 §4.3.4, caching](https://www.rfc-editor.org/rfc/rfc1034.html#section-4.3.4)

### macOS: read the same offline evidence

```bash title="macOS Terminal - Bash/zsh; repository root; offline"
cat ./weeks/week02/samples/os-cache-ttl-windows.txt
cat ./weeks/week02/samples/dig-split-answers.txt
```

> **Key idea**
>
> The first file is a Windows cache capture, not Mac output. Stop any dns-sd watch with Ctrl+C; no cache flush is needed.

### Same caching question, different observations

| Probe | Observation | Important limit |
| --- | --- | --- |
| Windows cache command | A local cached record and remaining TTL | A snapshot, not a browser trace |
| Mac native lookup | An address and a reported TTL | The lookup may trigger fresh work |
| dig to a named server | That resolver's answer and TTL | Not a dump of the OS cache |

### Offline comparison and a clean stopping point

```powershell title="Windows PowerShell - repository root; offline"
Get-Content .\weeks\week02\samples\os-cache-ttl-windows.txt
Get-Content .\weeks\week02\samples\dig-split-answers.txt
```

> **Key idea**
>
> Read the capture date. No records, servers, or cache settings were changed.

### "It hasn't propagated yet" is always the wrong sentence

- Nothing is pushed **to any resolver**. No recursive cache is notified
- The old value persists because a resolver already fetched it and is honoring **your** TTL
- The delay is not distance and not sync — it is a **timer you chose**
- The fix is lowering the TTL **before** the change, not after

> **Caution**
>
> Lowering the TTL after the cutover does nothing for caches already holding the
> old record at the old TTL.

**Sources**

- Julia Evans — [New Zine: How DNS Works!](https://jvns.ca/blog/2022/04/26/new-zine--how-dns-works-/)

### Failure is cached too, and the TTL comes from somewhere surprising

```console title="dig @1.1.1.1 nonexistent-week2-demo.depaul.edu A" mark=3,7
$ dig @1.1.1.1 nonexistent-week2-demo.depaul.edu A

;; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN, id: 61390
;; flags: qr rd ra; QUERY: 1, ANSWER: 0, AUTHORITY: 1

;; AUTHORITY SECTION:
depaul.edu.  900  IN  SOA  ns1.depaul.edu. networks.depaul.edu.
                           3 14400 1800 1209600 900
                                                 ^^^ minimum
```

> **Note**
>
> The **last** field of the SOA — here `900` — is the negative-cache TTL. The
> record's own TTL does not apply, because there is no record.

**Sources**

- IETF — [RFC 2308, Negative Caching of DNS Queries](https://www.rfc-editor.org/rfc/rfc2308.html)

### NXDOMAIN and NODATA are not the same

#### NODATA — the name exists

```console
$ dig @1.1.1.1 depaul.edu CAA
;; status: NOERROR
;; ANSWER: 0, AUTHORITY: 1
;; AUTHORITY holds SOA
```

The name is real; this *type* is not. **SOA** in AUTHORITY is the tell.

#### A referral looks identical

```console
$ dig @a.root-servers.net ...
;; status: NOERROR
;; ANSWER: 0, AUTHORITY: 13
;; AUTHORITY holds NS
```

Same status, same zero answers. **NS** in AUTHORITY means "ask elsewhere."

### Same name, same second, three different answers

```console title="one name, three public resolvers, run back to back"
$ dig @1.1.1.1 www.microsoft.com A +noall +answer
www.microsoft.com.  3584  IN  CNAME  ...edgekey.net.
e13678.dscb.akamaiedge.net.  4  IN  A  23.0.194.92

$ dig @8.8.8.8 www.microsoft.com A +noall +answer
www.microsoft.com.  1494  IN  CNAME  ...edgekey.net.
e13678.dscb.akamaiedge.net.  20  IN  A  23.0.194.92

$ dig @9.9.9.9 www.microsoft.com A +noall +answer
www.microsoft.com.  2061  IN  CNAME  ...edgekey.net.
e13678.dscb.akamaiedge.net.  17  IN  A  184.28.10.89
```

> **Key idea**
>
> Different addresses **and** different TTL remainders. Neither is wrong. There is
> no single correct answer to "what does this name resolve to."

### Even one resolver IP is many caches

```console title="six back-to-back queries to the SAME address, 1.1.1.1"
$ for i in 1 2 3 4 5 6; do dig @1.1.1.1 depaul.edu A +noall +answer; done

depaul.edu.  86400  IN  A  64.239.109.1
depaul.edu.  86400  IN  A  64.239.109.1
depaul.edu.  86290  IN  A  64.239.109.1     <- 110 s older
depaul.edu.  86400  IN  A  64.239.109.1
depaul.edu.  86290  IN  A  64.239.109.1     <- same older node
depaul.edu.  86400  IN  A  64.239.109.1
```

> **Note**
>
> `1.1.1.1` is an **anycast** address announced from hundreds of sites, each with
> its own cache — and each site load-balances across several machines.

### DoH and DoT move the conversation, not the answer

- **DoT** — DNS over TLS, port **853**. Encrypted, but on a port that is obviously DNS
- **DoH** — DNS over HTTPS, port **443**. Encrypted, and hard to distinguish from web traffic
- The resolution logic is unchanged — same recursion, same caches, same TTLs
- What changes is **who can see and who can intercept** — and *which resolver you ask*

> **What actually breaks**
>
> Split-horizon DNS. A browser using DoH to a public resolver bypasses the
> corporate or campus resolver that serves internal-only names — so `intranet.
> depaul.edu` stops resolving on a machine that is physically on the network.

**Sources**

- IETF — [RFC 8484, DNS Queries over HTTPS](https://www.rfc-editor.org/rfc/rfc8484.html) · [RFC 7858, DNS over TLS](https://www.rfc-editor.org/rfc/rfc7858.html)

### DoH really is just an HTTPS request

```console title="Cloudflare's DoH JSON API — the same fields dig shows you" mark=2,5
$ curl -s -H "accept: application/dns-json" \
    "https://cloudflare-dns.com/dns-query?name=depaul.edu&type=A"
{"Status":0,"TC":false,"RD":true,"RA":true,"AD":false,"CD":false,
 "Question":[{"name":"depaul.edu","type":1}],
 "Answer":[{"name":"depaul.edu","type":1,"TTL":86400,
            "data":"64.239.109.1"}]}

# and on the wire:
* Connected to cloudflare-dns.com (104.16.249.249) port 443
* ALPN: server accepted h2
> GET /dns-query?name=depaul.edu&type=A HTTP/2
< HTTP/2 200
```

> **Note**
>
> This JSON API is a **vendor convenience**. Standard DoH (RFC 8484) carries the
> binary wire format as `application/dns-message`.

### You changed an A record 20 minutes ago. Three people see three different things.

1. **You** see the new address immediately from your laptop
2. **A second device you own**, same wifi, still shows the old address
3. **The grader** gets `NXDOMAIN` for the `status.` hostname you created 5 minutes ago

**Sources**

- IETF — [RFC 2308, Negative Caching of DNS Queries](https://www.rfc-editor.org/rfc/rfc2308.html)

## Block B — Owning a zone

### Owning a zone

Registrar, registry, DNS host — and the records you will actually configure tonight

You bought a domain last week. Tonight you make it point at something.

### Fictional CampusPulse case: Priya edited a zone nobody queries

#### The change

- The registrar account shows an editable DNS zone
- Priya changes `status` from `203.0.113.10` to `.44`
- The UI says **Saved**, but public answers never move

#### The ownership check

- `dig NS` names a different host for **campuspulse.example**
- That host owns the authoritative copy of the `A` record
- Priya moves the change, lowers TTL first, and writes a rollback time

### The one question that ends most DNS support tickets

- "My domain is broken" is never a single system's fault, because a domain is **three** systems
- The **registry** runs the TLD. The **registrar** sells you the name. The **DNS host** answers queries
- They can be three different companies, and usually are
- Almost every DNS ticket is really "I edited the wrong one of these three"

> **Key idea**
>
> Ask first: *is this a delegation problem or a record problem?* Delegation lives
> at the registrar. Records live at the DNS host. Different company, different
> console, different blast radius.

**Sources**

- ICANN — [Registrar (official definition)](https://www.icann.org/en/icann-acronyms-and-terms/registrar-en)
- Julia Evans — [New Zine: How DNS Works!](https://jvns.ca/blog/2022/04/26/new-zine--how-dns-works-/)

### Who holds what

![Diagram of three organisations: the registry operates the top level domain and holds the delegation NS records; the registrar sells the domain and is the only party that can change the delegation; the DNS host runs the authoritative nameservers and holds the zone records such as A, MX and TXT](../../assets/class-notes/week02-session-s39-1.svg)

*Three organisations. Only one of them answers queries; only one of them can change who does.*

### Delegation is two copies of the same fact, held by two parties

```console title="the parent's copy vs the child's copy" mark=3,10
$ dig @a.edu-servers.net depaul.edu NS +norecurse   # parent: edu.
;; flags: qr;  ANSWER: 0, AUTHORITY: 4              # a referral
depaul.edu.  172800  IN  NS  ns1.depaul.edu.        # TTL set by the registry

$ dig @ns1.depaul.edu depaul.edu NS +norecurse      # child: your zone
;; flags: qr aa;  ANSWER: 4                         # authoritative
depaul.edu.   14400  IN  NS  ns1.depaul.edu.        # TTL set by you
```

> **Key idea**
>
> The parent's copy is what the world follows. You cannot edit it from your DNS
> host — you edit it at your **registrar**, and the registry publishes it.

### The SOA is the zone's identity card

```console title="dig SOA depaul.edu — seven fields, two you will actually set"
$ dig @1.1.1.1 depaul.edu SOA +noall +answer

depaul.edu. 1800 IN SOA ns1.depaul.edu. networks.depaul.edu. (
                        3          ; serial   bump on every change
                        14400      ; refresh  secondary polls primary
                        1800       ; retry    after a failed poll
                        1209600    ; expire   secondary stops answering
                        900 )      ; minimum  NEGATIVE-cache TTL
```

> **Caution**
>
> `networks.depaul.edu.` is an **email address** with the first dot standing in for
> the `@`. It is `networks@depaul.edu`. This trips up everyone exactly once.

**Sources**

- IETF — [RFC 1035 §3.3.13, SOA RDATA format](https://www.rfc-editor.org/rfc/rfc1035.html)

### Seven record types you will actually configure

### The record types you will actually use

| Type | Answers | The trap |
| --- | --- | --- |
| `A` | name → IPv4 | Hard-codes an address you may not own |
| `AAAA` | name → IPv6 | Missing it fails IPv6 clients silently |
| `CNAME` | name → a name | **Illegal at the apex** — next slide |
| `TXT` | strings | 255-char chunking |
| `CAA` | who may issue certs | Absent = **any CA may issue** |
| `MX` | where mail goes | A *name*, never an address |

### The apex CNAME problem

- A `CNAME` means "this name **is** another name."
- The apex must hold `SOA` and `NS`, and usually `MX`, `TXT`, and `CAA`.
- A `CNAME` cannot coexist with those records.
- `www` is a subdomain, so a CNAME is legal there.
- The apex needs `ALIAS` or flattening — useful, but not in any RFC.

> **Key idea**
>
> Do not put a CNAME at the zone apex.

### CAA: the record that says who is allowed to issue for you

```console title="github.com publishes a CAA policy; depaul.edu does not" mark=8
$ dig @1.1.1.1 github.com CAA +noall +answer
github.com. 3600 IN CAA 0 issue     "letsencrypt.org"
github.com. 3600 IN CAA 0 issuewild "letsencrypt.org"
             ... 5 more: digicert, sectigo, globalsign, 2 issuewild

$ dig @1.1.1.1 depaul.edu CAA
;; status: NOERROR
;; ANSWER: 0             <- NODATA, and edu. has none either
```

> **Key idea**
>
> `issue` authorizes issuance; `issuewild` **overrides it for wildcards** when
> present. A CA must check this record — climbing to the parent if there is none.

**Sources**

- IETF — [RFC 8659, DNS Certification Authority Authorization](https://www.rfc-editor.org/rfc/rfc8659.html)

### TXT records carry other systems' truth, not yours

```console title="dig TXT depaul.edu — 21 records, elided"
$ dig @1.1.1.1 depaul.edu TXT +noall +answer

depaul.edu. 86400 IN TXT "v=spf1 include:spf.protection.outlook.com"
                         " include:_spf.google.com ... ~all"
depaul.edu. 86400 IN TXT "google-site-verification=GgecFA3L0pqdJ..."
depaul.edu. 86400 IN TXT "apple-domain-verification=fJm7Ug5BsVd0I7Fi"
depaul.edu. 86400 IN TXT "atlassian-domain-verification=tl5FjTuHJ..."
depaul.edu. 86400 IN TXT "ZOOM_verify_e622Dwe-Qi-ZMEJfMH3t1w"
                                        ... 16 more verification strings
```

> **Note**
>
> Every one of these is a third party asking "prove you control this domain."
> Control of DNS **is** the proof of ownership on the modern web.

### TTL is a decision, not a default

### What a TTL actually buys and costs

#### Long TTL — 86400

- Fewer queries, cheaper, faster
- Survives an authoritative outage
- **A mistake is live for a day**

#### Short TTL — 60

- Change takes effect in a minute
- Rollback is genuinely fast
- More query load
- **An outage hits users in 60 s**

### The cutover timeline

![A five stage cutover timeline: T minus 48 hours lower the TTL from 86400 to 60, wait at least the old TTL of 24 hours so every cache refreshes, T zero change the record, T plus 5 minutes verify from at least two independent resolvers, T plus 24 hours raise the TTL back to 3600. A rollback arrow spans from the change point back to a one minute recovery window.](../../assets/class-notes/week02-session-s49-1.svg)

*The TTL drop must precede the change by at least the OLD TTL. That is the whole technique.*

### A zone with reasons: every TTL is a decision

```dns title="campuspulse.example — exported zone, annotated" lines mark=4,7
$ORIGIN campuspulse.example.
@       3600  IN  NS    ns1.vendor.net.
@       3600  IN  A     203.0.113.20
@         60  IN  A     198.51.100.7    ; low: cutover window open
@       3600  IN  AAAA  2001:db8::20
www     3600  IN  CNAME campuspulse.example.
status    60  IN  CNAME edge.vendor.net. ; low: may repoint
@       3600  IN  MX    10 mail.vendor.net.
@       3600  IN  CAA   0 issue "letsencrypt.org"
@       3600  IN  TXT   "v=spf1 include:_spf.vendor.net -all"
```

### Failover and geo-routing, in one slide

- Your authoritative server can answer **differently per query** — that is all these features are
- **Failover:** health-check the target, stop returning the address that fails
- **Weighted:** return address A 90% of the time, B 10% — a canary
- **Latency / geo:** answer based on where the query appeared to come from
- Recovery is bounded by **health-detection time + the remaining TTL** on every cached answer

> **Recognition level only**
>
> This is a concept tour, not a build. You are not implementing traffic management
> this quarter. You **are** expected to recognise it in someone else's zone.

**Sources**

- AWS — [Route 53 routing policies](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy.html)

### DNSSEC: read it at recognition level, and know why

- **DNSSEC** — cryptographic signatures over DNS answers; `RRSIG`, `DS`, `NSEC3`
- You already saw `RRSIG` and `DS` records in the Block A `+trace` output
- Slack's 2021 outage was a **DNSSEC rollout** that broke resolution for hours
- Recognition level: know what a `DS` record is for and that a broken chain is a hard failure

> **Note**
>
> Tested at recognition level only, per the course outline's depth note. The
> reading is in this week's prep and it is worth doing before Week 4's certificate
> work.

**Sources**

- Slack Engineering — [What happened during Slack's DNSSEC rollout](https://slack.engineering/what-happened-during-slacks-dnssec-rollout/)
- Cloudflare — [How DNSSEC works](https://www.cloudflare.com/learning/dns/dnssec/how-dnssec-works/)

### Live: create a record, watch it become real

#### Steps

1. Use an already delegated zone you own; open its DNS host console
2. Follow your OS preparation; create only its new demo label
3. Compare an authoritative answer with two recursive answers

#### Expected observations

- Authoritative and cached state may differ briefly
- `NXDOMAIN` needs diagnosis, not an arbitrary wait

#### Fallback

No owned zone or `dig`? Use the exact saved-evidence commands below.

### macOS: prepare an isolated demo name

```bash title="macOS Terminal - Bash/zsh; owned delegated zone; dig on PATH"
command -v dig
printf 'Delegated zone you own: '; read -r zone
label="csc436-$(uuidgen | tr 'A-F' 'a-f' | cut -c1-8)"
name="$label.$zone"
ns=$(dig +short NS "$zone" | head -n 1)
[ -n "$ns" ] || printf 'STOP: no nameserver; use offline evidence.\n'
printf 'label=%s\nname=%s\nserver=%s\n' "$label" "$name" "$ns"
```

> **Key idea**
>
> If the zone or server is blank, stop and use the fallback. A nameserver answer is not proof of ownership.

### Prepare an isolated demo name

```powershell title="Windows PowerShell - owned delegated zone; dig on PATH"
Get-Command dig
$zone = Read-Host 'Already delegated DNS zone you own'
$label = 'csc436-' + [guid]::NewGuid().ToString('N').Substring(0,8)
$name = "$label.$zone"
$ns = dig +short NS $zone | Select-Object -First 1
if (-not $ns) { throw 'No NS answer; use the offline fallback.' }
$label
$name
$ns
```

**Sources**

- Course — [owned-domain lab](lab.md)
- ISC — [`dig`](https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility)

### In the DNS host console, save exactly one record

| Field | Enter | Why |
| --- | --- | --- |
| Type | `A` | Map the test label to IPv4 |
| Name | The printed `$label` | Do not edit apex, mail, or `www` |
| Value | `203.0.113.10` | Documentation address; no real service |
| TTL | `60`, or the allowed minimum | Record the value actually accepted |
| Proxy mode, if offered | DNS only | Keep the experiment about DNS |

**Sources**

- IETF — [RFC 5737, documentation addresses](https://www.rfc-editor.org/rfc/rfc5737.html)
- Course — [zone-change lab](lab.md)

### macOS: query authority, then the caches

```bash title="macOS Terminal - same Bash/zsh session as preparation"
date -u '+%Y-%m-%dT%H:%M:%SZ'
dig "@$ns" "$name" A +norecurse
dig "@1.1.1.1" "$name" A
dig "@8.8.8.8" "$name" A
sleep 30
dig "@1.1.1.1" "$name" A
```

> **Key idea**
>
> After the console edit, compare the authoritative answer with each cached answer and its remaining TTL.

### Query the source, then two caches

```powershell title="Same PowerShell terminal - variables from the preparation slide"
(Get-Date).ToUniversalTime().ToString('o')
dig "@$ns" $name A +norecurse
dig "@1.1.1.1" $name A
dig "@8.8.8.8" $name A
Start-Sleep -Seconds 30
dig "@1.1.1.1" $name A
```

**Sources**

- Course — [recursive versus authoritative evidence](samples/dig-recursive-vs-authoritative.txt)
- IETF — [RFC 2308, negative caching](https://www.rfc-editor.org/rfc/rfc2308.html)

### Which DNS fields carry the conclusion?

| Read this field | Expected after publication | Interpretation |
| --- | --- | --- |
| Authoritative flags include `aa` | A record for `203.0.113.10` | This authority serves the saved value |
| Recursive ANSWER address and TTL | Same address; its own remaining TTL | A cache answers on its own clock |
| `NXDOMAIN` with an SOA | Authority and resolver may disagree | Inspect negative-cache lifetime |

**Sources**

- IETF — [RFC 2308 §5, caching negative answers](https://www.rfc-editor.org/rfc/rfc2308.html#section-5)
- Course — [negative-cache evidence](samples/dig-nxdomain.txt)

### What this changes about the CampusPulse cutover

#### The false reassurance

"The console saved it."

That only describes a control-plane action, not every resolver's answer.

#### The operational decision

Compare authority and caches.

Lower TTL before a real cutover; retain the old service during cache expiry.

**Sources**

- Course — [cutover and rollback exercise](lab.md)

### macOS: check the record after deletion

```bash title="macOS Terminal - same session; AFTER deleting only the new label"
dig "@$ns" "$name" A +norecurse
dig "@1.1.1.1" "$name" A
```

> **Key idea**
>
> Delete only the generated demo record in the provider console. A recursive server can still return its cached answer.

### Delete only the demo record; verify the aftermath

```powershell title="Same PowerShell terminal - AFTER deleting the new label in the console"
dig "@$ns" $name A +norecurse
dig "@1.1.1.1" $name A
```

> **Key idea**
>
> Delete the record whose name matches `$label`, not the zone or its nameservers.

### macOS: the offline authority/cache comparison

```bash title="macOS Terminal - Bash/zsh; repository root; no zone required"
samples='./weeks/week02/samples'
cat "$samples/dig-recursive-vs-authoritative.txt"
cat "$samples/dig-nxdomain.txt"
```

> **Key idea**
>
> These are the same archived examples used on Windows. Reading them creates no record, process, or cleanup task.

### Offline fallback: authority, cache, and negative cache

```powershell title="Windows PowerShell - repository root; no zone required"
$samples = '.\weeks\week02\samples'
Get-Content "$samples\dig-recursive-vs-authoritative.txt"
Get-Content "$samples\dig-nxdomain.txt"
```

> **Note**
>
> These are 2026-08-15 captures of other names, not a recording of your demo label.

**Sources**

- Course — [capture provenance](samples/README.md)

### Four zone changes. Which console, and what is the blast radius?

1. Point `www` at a new hosting provider
2. Move DNS from your registrar's free service to Cloudflare
3. Add a `CAA` record naming Let's Encrypt
4. Change the apex from `203.0.113.20` to `198.51.100.7` at 09:00 tomorrow

**Sources**

- ICANN — [Registrar (official definition)](https://www.icann.org/en/icann-acronyms-and-terms/registrar-en)

## Block C — HTTP as a contract

### HTTP as a contract

Methods, status codes, and the handful of headers that decide whether your request means anything

The name resolved. Now something has to answer — and answering is a contract.

### Fictional CampusPulse case: a redirect quietly drops the report

#### The request

- The mobile client sends a report with `POST` over HTTP
- The edge answers `302` and points to the HTTPS URL
- The client follows the redirect as `GET`; the JSON body is gone

#### The contract repair

- `307` preserves the method and body for a temporary redirect
- `308` preserves them for a permanent redirect
- Evidence is the followed request line, not the first response alone

### An HTTP request is text you could have typed

```console title="a request and response, hand-written over netcat (headers elided)"
$ printf 'GET /healthz HTTP/1.1\r\nHost: status.campuspulse.example\r\n\
Connection: close\r\n\r\n' | nc 127.0.0.1 8081

HTTP/1.1 200 OK
Server: campuspulse-fault-lab/1.0
Content-Type: application/json
Content-Length: 39
Vary: Accept-Encoding
                                    ... Date and Connection also returned
{"status":"ok","service":"campuspulse"}
```

> **Key idea**
>
> Request line, headers, blank line, body. Response line, headers, blank line,
> body. The blank line is not decoration — it is the delimiter.

### `Host` is how one IP serves many sites

#### What it does

A TCP connection carries no name — only an address and a port.

`Host` is how the server learns which of the 500 sites on that address you
wanted. Required in HTTP/1.1.

#### Why you will care

```console
$ curl -sI 127.0.0.1:8081/ \
    -H "Host: status.cp"
HTTP/1.1 200 OK

$ curl -sI 127.0.0.1:8081/ \
    -H "Host: www.cp"
HTTP/1.1 404 Not Found
```

### Safe and idempotent are different

| Method | Safe | Idem. | What that permits |
| --- | :---: | :---: | --- |
| `GET` | yes | yes | Cache it, prefetch it, retry it |
| `HEAD` | yes | yes | Same as GET, headers only |
| `PUT` | no | yes | Retry a timeout, no duplicate |
| `DELETE` | no | yes | Retry; code may become `404` |
| `POST` | no | **no** | **Never blind-retry.** May charge twice |
| `PATCH` | no | **no** | Depends on your patch semantics |

### Status families, read operationally

| Family | Says | What you actually do |
| --- | --- | --- |
| `2xx` | It worked | Check the body — `200` can wrap an error |
| `3xx` | Look elsewhere | Count hops; did the method survive? |
| `4xx` | **You** are wrong | Fix it — but `408`/`425`/`429` say *retry* |
| `5xx` | **I** am wrong | Retry with backoff — not `POST`, not `501` |

### The four redirects

#### The old pair

`301 Moved Permanently`
`302 Found`

Clients are **permitted** to rewrite a `POST` to `GET`. In practice they always
do — the body is dropped.

#### The pair that fixed it

`307 Temporary Redirect`
`308 Permanent Redirect`

Method and body **must** be preserved. Redirecting anything but a page view? Use
these.

**Sources**

- IETF — [RFC 9110 §15.4, Redirection 3xx](https://www.rfc-editor.org/rfc/rfc9110.html)

### A `POST` that quietly became a `GET`

```console title="HW2 fault 2 — real capture, curl following a 302" mark=5,7,9
$ curl -sv -L -d '{"service":"library-wifi","state":"degraded"}' \
    -H 'Content-Type: application/json' \
    http://campuspulse.example:8082/legacy/incidents

> POST /legacy/incidents HTTP/1.1       <- the request you wrote
< HTTP/1.1 302 Found
< Location: http://campuspulse.example:8082/api/incidents
* Switch from POST to GET               <- curl obeying the spec
> GET /api/incidents HTTP/1.1           <- the request that arrived
< HTTP/1.1 405 Method Not Allowed
< Allow: POST
{"error":"method_not_allowed","expected":"POST"}
```

> **Failure to avoid**
>
> The `405` is the lucky outcome. If `GET /api/incidents` had returned a `200` list
> of incidents, the client would have reported success and created nothing.

### Your tool will lie to you if you let it

```console title="the SAME request, with -X POST added" mark=4,6
$ curl -sv -L -X POST -d '{...}' \
    http://campuspulse.example:8082/legacy/incidents

< HTTP/1.1 302 Found
* Switch from POST to GET                <- curl says it switched
> POST /api/incidents HTTP/1.1           <- but -X forced POST anyway
< HTTP/1.1 201 Created
{"created":true}
```

> **Caution**
>
> `-X POST` overrides curl's method handling on redirects. The transcript now shows
> success — and no longer reproduces the bug your users are reporting.

**Sources**

- curl — [manual page, `--request`](https://curl.se/docs/manpage.html)

### The headers that carry meaning

#### On the request

- `Host` — which site
- `Accept` — what I can parse
- `Content-Type` — what I send
- `Authorization` — who I am
- `Cookie` — state the server gave me

#### On the response

- `Set-Cookie` — state to hold
- `Location` — where to go next
- `Cache-Control` — how long it is good
- `Vary` — what the cache key depends on
- `Allow` — which methods this URL takes

### Real headers, from a real response

```console title="curl -sSI -H 'Accept-Encoding: gzip' https://jvns.ca/" mark=6,8
$ curl -sSI -H "Accept-Encoding: gzip" https://jvns.ca/

HTTP/2 200
cache-control: public,max-age=0,must-revalidate
cache-status: "Netlify Edge"; fwd=miss; fwd-status=200; stored
content-encoding: gzip
content-type: text/html; charset=UTF-8
vary: Accept-Encoding
strict-transport-security: max-age=31536000
etag: "6008c0f02c21b4ab160180f6d8a36d15-ssl-df"
server: Netlify
```

> **Note**
>
> `vary: Accept-Encoding` plus `content-encoding: gzip` is the correct pair. The
> edge is storing the compressed and uncompressed copies under different keys.

### `X-Forwarded-*` is a claim, not a fact

- A TLS-terminating proxy ends the client's connection and opens a **new** one to your app
- Your app sees the *proxy's* address and protocol — true about the proxy, wrong about the client
- So the proxy *asserts* the client's details: `X-Forwarded-For`, `X-Forwarded-Proto`, `X-Forwarded-Host`
- **Anyone can send these headers.** They are trustworthy only from a proxy you control

> **Failure to avoid**
>
> An app that trusts `X-Forwarded-For` from any source can be given any client IP
> by any client — defeating rate limits, IP allowlists, and audit logs.

**Sources**

- MDN — [X-Forwarded-Proto](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Forwarded-Proto)
- IETF — [RFC 7239, Forwarded HTTP Extension](https://www.rfc-editor.org/rfc/rfc7239.html)

### One letter-group wrong, and it redirects forever

```console title="HW2 fault 3 — trimmed capture; POSIX shell command" mark=6,7,12
$ curl -sSIL --max-redirs 4 \
    --resolve status.campuspulse.example:8084:127.0.0.1 \
    http://status.campuspulse.example:8084/healthz

HTTP/1.1 301 Moved Permanently
x-app-saw-xfp: (absent)
x-app-saw-forwarded-headers: x-forwarded-protocol, x-forwarded-for,
                             x-forwarded-host
location: http://status.campuspulse.example:8084/healthz
x-proxy: campuspulse-lb/1.0 (terminates TLS)
                                      ... four identical hops elided
curl: (47) Maximum (4) redirects followed

$ curl -sI -H "X-Forwarded-Proto: https" http://127.0.0.1:8083/healthz
HTTP/1.1 200 OK              <- the app is fine. the header was wrong.
```

> **Key idea**
>
> The app reads the Proto header; the proxy sends the differently named Protocol header.

### Live: speak HTTP with your hands

#### Steps

1. Start the local fixture using your OS's A command
2. Use your OS's raw-request step in B; keep the destination fixed
3. Change only `Host`: `status` succeeds; `www` fails

#### Expected observations

- One `Host` value returns `200`; the other returns `404`

#### Fallback

The last command slide opens all three real fault transcripts.

### macOS A: start the same local faults

```bash title="macOS Terminal - Bash/zsh; repository root; Node 18+"
# Default ports are 8081-8084.
# Busy? Add --port 9100; use 9100-9103 in ALL later requests.
node ./weeks/week02/samples/http-faults/fault-server.mjs
```

> **Key idea**
>
> Expect the four loopback listeners. Keep A running; if changing the base port, update every request URL too.

### Terminal A: start all three local faults

```powershell title="Windows PowerShell - repository root; Node 18+"
# Expected on loopback: 8081 Host, 8082 redirect, 8083 app, 8084 proxy.
# Busy ports? Add --port 9100; use ports 9100-9103 in later commands.
node .\weeks\week02\samples\http-faults\fault-server.mjs
```

**Sources**

- Course — [HTTP fault server](samples/http-faults/fault-server.mjs)

### macOS B: write the HTTP bytes

```bash title="macOS Terminal - Bash/zsh; native nc; A still running"
printf '%s\r\n' 'GET /healthz HTTP/1.1' \
  'Host: status.campuspulse.example' 'Connection: close' '' |
  nc -w 5 127.0.0.1 8081
```

> **Key idea**
>
> Expect 200 for this Host. Repeat with `www.campuspulse.example` as Host: the same socket now returns 404.

### Terminal B: write the HTTP bytes yourself

```powershell title="Windows PowerShell - raw request; change only Host"
$c = [Net.Sockets.TcpClient]::new('127.0.0.1', 8081)
$c.ReceiveTimeout = 5000
try {
  $s = $c.GetStream()
  $req = "GET /healthz HTTP/1.1`r`nHost: "
  $req += "status.campuspulse.example`r`nConnection: close`r`n`r`n"
  $b = [Text.Encoding]::ASCII.GetBytes($req)
  $s.Write($b, 0, $b.Length)
  [IO.StreamReader]::new($s).ReadToEnd()
} finally { $c.Dispose() }
```

**Sources**

- Course — [raw-request lab](lab.md)
- IETF — [RFC 9112 §2.1, message format](https://www.rfc-editor.org/rfc/rfc9112.html#section-2.1)

### macOS B: repeat the Host experiment

```bash title="macOS Terminal - Bash/zsh; same listener, same path"
url='http://127.0.0.1:8081/healthz'
curl --noproxy '*' -i --max-time 5 "$url" \
  -H 'Host: status.campuspulse.example'
curl --noproxy '*' -i --max-time 5 "$url" \
  -H 'Host: www.campuspulse.example'
```

> **Key idea**
>
> The two responses are 200 then 404. Only the Host value changed; no DNS lookup was needed for the numeric destination.

### Repeat the Host experiment with curl

```powershell title="Terminal B - the same listener and path; only Host changes"
$url = 'http://127.0.0.1:8081/healthz'
curl.exe --noproxy '*' -i --max-time 5 $url `
  -H 'Host: status.campuspulse.example'
curl.exe --noproxy '*' -i --max-time 5 $url `
  -H 'Host: www.campuspulse.example'
```

**Sources**

- Course — [host-routing capture](samples/http-faults/fault-1-host-header.txt)

### macOS B: follow the disappearing POST

```bash title="macOS Terminal - Bash/zsh; synthetic requests only"
base='http://127.0.0.1:8082'
curl --noproxy '*' -v -L --max-redirs 4 --max-time 5 \
  -d 'service=library-wifi' "$base/legacy/incidents"
curl --noproxy '*' -v --max-time 5 \
  -d 'service=library-wifi' "$base/api/incidents"
```

> **Key idea**
>
> The redirected request changes method and fails; the direct POST gets 201. Read the outgoing method at each hop.

### Reproduce the disappearing POST

```powershell title="Terminal B - synthetic request; no real incident is stored"
$base = 'http://127.0.0.1:8082'
curl.exe --noproxy '*' -v -L --max-redirs 4 --max-time 5 `
  -d 'service=library-wifi' "$base/legacy/incidents"
curl.exe --noproxy '*' -v --max-time 5 `
  -d 'service=library-wifi' "$base/api/incidents"
```

**Sources**

- Course — [redirect and method capture](samples/http-faults/fault-2-redirect-chain.txt)
- curl — [redirect behavior](https://curl.se/docs/manpage.html)

### Follow the request, not the success-shaped story

| Expected fixture exchange | Result | Interpretation |
| --- | --- | --- |
| Correct `Host` on port 8081 | `200` | The virtual host is configured |
| Unknown `Host`, same socket | `404` | DNS is not the changed variable |
| POST, then follow a `302` | GET arrives; `405` | Redirect behavior changed the method |
| Direct POST to the target | `201` | The target accepts POST in this fixture |

**Sources**

- IETF — [RFC 9110 §15.4.3, 302](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.4.3)
- Course — [fault implementation](samples/http-faults/fault-server.mjs)

### macOS B: inspect the proxy mistake

```bash title="macOS Terminal - Bash/zsh; HTTP-only local model"
curl --noproxy '*' -I -L --max-redirs 3 --max-time 5 \
  http://127.0.0.1:8084/healthz
curl --noproxy '*' -i --max-time 5 \
  http://127.0.0.1:8083/healthz -H 'X-Forwarded-Proto: https'
```

> **Key idea**
>
> The first path loops until curl stops; the corrected header reaches 200. This models a handoff, not real encryption.

### Locate the proxy's protocol-header mistake

```powershell title="Terminal B - HTTP-only local proxy model, not real TLS"
curl.exe --noproxy '*' -I -L --max-redirs 3 --max-time 5 `
  http://127.0.0.1:8084/healthz
curl.exe --noproxy '*' -i --max-time 5 `
  http://127.0.0.1:8083/healthz -H 'X-Forwarded-Proto: https'
```

**Sources**

- Course — [proxy-header capture](samples/http-faults/fault-3-x-forwarded-proto.txt)

### macOS: stop, or use the recorded evidence

```bash title="macOS Terminal - Bash/zsh; repository root; offline"
samples='./weeks/week02/samples/http-faults'
cat "$samples/fault-1-host-header.txt"
cat "$samples/fault-2-redirect-chain.txt"
cat "$samples/fault-3-x-forwarded-proto.txt"
```

> **Key idea**
>
> Ctrl+C in Terminal A stops all four local listeners. No generated files or network settings need removal.

### Finish the demo or open the recorded evidence

```powershell title="Terminal B - repository root; offline fallback"
$samples = '.\weeks\week02\samples\http-faults'
Get-Content "$samples\fault-1-host-header.txt"
Get-Content "$samples\fault-2-redirect-chain.txt"
Get-Content "$samples\fault-3-x-forwarded-proto.txt"
```

> **Key idea**
>
> Press Ctrl+C in Terminal A; that stops all four local listeners.

### Four symptoms. Name the most likely cause and the one command that confirms it.

1. `www` returns 404; `dig` shows the CNAME resolving correctly
2. A client's `POST` returns `200` but nothing is ever created
3. The browser reports too many redirects; `curl` against the app directly is fine
4. Logged-out users are being served a page with someone else's name on it

**Sources**

- IETF — [RFC 9110, HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)

## Individual practice

### Guided lab: trace, delegate, cut over, speak HTTP

- **Now, 35 minutes:** on your own domain — trace delegation with `dig +trace`, add a real record, and watch a TTL count down
- **Execute a cutover with a rollback plan**, not just a change
- **Then type an HTTP request by hand** and read the response yourself
- **Evidence, not a screenshot:** four of five parts feed HW2 directly — save everything as you go

> **Key idea**
>
> Full instructions and setup checklist: [`lab.md`](lab.md).

## Homework brief

### HW2: Zone Build and HTTP Forensics

- **Purpose:** operate the domain you bought in HW1 — configure it deliberately, change it on a plan, diagnose it from evidence
- **Deliverables:** an annotated `dig +trace`, an exported zone file with a rationale per record, and an apex-vs-`www` decision
- **Plus:** resolution proven from two resolvers, an executed TTL cutover with rollback, and three diagnosed HTTP failures
- **Full handout and rubric:** [`homework.md`](homework.md) — due before Week 3

> **Tip**
>
> Start tonight — the cutover task has a mandatory wait of at least one TTL, not just active work.

**Sources**

- Course — [HW2 handout](homework.md) · [evidence standard](../../docs/evidence-standard.md)

## Closing logistics

### Before you go

- **Exit ticket:** one sentence — which cache in tonight's evidence surprised you most
- **Before Week 3 class:** complete the [Week 3 prep](../week03/prep.md) — items 1–6, about 57 minutes, plus the tooling checklist
- **Any logistics question we didn't reach:** the discussion board, not a hallway guess
- **Next week:** what the AI writes — reading TypeScript, React, and containers as a reviewer
