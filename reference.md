# Week 2 public reference — operating names and HTTP

This is an in-task lookup, not extra assigned prep. Start with the domain and
supported `dig` paths in [getting started](../../docs/getting-started.md).
Use [web foundations steps 4–6](../../docs/web-foundations.md) for forms,
HTTP/JSON, validation and persistence. No private lecture notes are required.

## Resolution and registration basics

Suppose a client needs an address for a hostname. Its stub resolver asks a
recursive resolver to return the result. With no usable cache, that resolver
asks a root server for the relevant TLD, a TLD server for the domain's
authoritative servers, then an authoritative server for the requested record.
Referrals tell it where to ask next; the terminal answer supplies the data.
The resolver caches records according to their TTLs. A cached lookup can skip
much of this walk, and aliases or additional delegations can add steps.

A registrar manages registration and parent delegation on the registrant's
behalf. For generic TLDs in ICANN's system, registrars are accredited and
registries operate their TLD under registry arrangements; country-code TLD
policies can differ. The DNS host serves the actual zone. Buying from a
registrar does not require buying that company's hosting, email or certificates.
Changing a website address belongs at the DNS host; changing delegation belongs
at the registrar or parent administrator. The table below is the prep's record
reference, independent of any vendor website.

## Ownership and record decisions

| Term/record | Job and boundary |
| --- | --- |
| Registrant / registrar / registry | Holder of registration rights / registration service / TLD operator |
| DNS host | Serves the zone's records; may be separate from the registrar |
| A / AAAA | IPv4 / IPv6 address. Publish AAAA only when that path actually works |
| CNAME | Alias to a hostname, not a scheme, port or path; cannot coexist with ordinary other data at that name |
| Apex | Zone's root, which needs NS/SOA and therefore cannot be an ordinary CNAME |
| ALIAS / flattening | Provider-specific address synthesis; verify your host's actual behavior |
| TXT | Public text, such as a non-secret verification nonce; not a place for passwords |
| MX | Mail routing. Null MX (`0 .`) declares no mail service where supported |
| CAA | Restricts compliant CA issuance, not use of an existing certificate or browser trust |
| NS / SOA | Delegation/authority and zone metadata. A shared-zone leaf may have neither |
| SRV | Advertises a service's target hostname/port and priority/weight where clients support that service convention; recognition only this week |

A course subdomain earns the same credit as a purchased domain. If it is not
independently delegated, document the parent-zone owner's role and your
record-change rights rather than inventing a registrar transaction.

## Reading resolution evidence

- Recursive service returns an answer on a client's behalf; iterative queries
  follow referrals. `dig +trace` follows the latter, after bootstrapping root
  information through a resolver.
- `aa` marks an authoritative answer. `ra` advertises recursion availability;
  it is not proof that this answer required a fresh recursive lookup.
- NOERROR with an empty answer may be NODATA or a referral: inspect SOA versus
  NS in the authority section. NXDOMAIN means the queried name does not exist.
- Negative caching normally uses the smaller of SOA TTL and SOA.MINIMUM.
- Authority TTL minus resolver TTL gives **apparent** cache age. Caps, refresh,
  prefetch and different cache nodes can change the result.

For a cutover, record the old target and rollback plan; lower TTL; wait out the
**previous** TTL; change target; compare authority and independent resolvers;
keep the old service available through overlap. A zone edit does not invalidate
every recursive cache. Record the actual provider minimum instead of assuming 60.

## HTTP contract reminders

An HTTP request has a method, target, headers and sometimes a body. Its response
has a status, headers and sometimes a body. DNS success does not prove the
platform recognizes the Host name. A redirect's method behavior matters:
307/308 preserve method/body; clients commonly change POST to GET for 301/302.
Inspect the actual request chain rather than force `-X POST` through every hop.

Use status and content type as part of the contract. Validate server inputs even
when HTML validation exists. A proxy's forwarded headers are trustworthy only
within an enforced proxy trust boundary; an untrusted client can supply headers.

Use the [HW2 supplied change-plan draft](../../docs/non-ai-review-artifacts.md#hw2---dns-change-plan-draft)
for the no-personal-AI critique, connected to your own permitted evidence.
