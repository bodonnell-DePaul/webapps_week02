#!/usr/bin/env node
// CSC 436 — Week 2 — HW2 HTTP fault server.
//
// Three deliberately broken HTTP behaviours, each modelled on a real production
// failure. Students diagnose them from request/response evidence alone.
//
//   node fault-server.mjs              # 8081, 8082, 8083 (+ 8084 proxy)
//   node fault-server.mjs --port 9000  # 9000, 9001, 9002 (+ 9003 proxy)
//   node fault-server.mjs --port 0     # four independent OS-assigned loopback ports
//                                      # PORTS {...} reports the actual mapping
//
// No dependencies. Node 18+. Binds 127.0.0.1 only — nothing is exposed.
//
// Fault 1 (:8081) — Host-header routing.   The edge only knows one hostname.
// Fault 2 (:8082) — Redirect chain.        apex <-> www ping-pong, and a 302
//                                          that silently downgrades POST to GET.
// Fault 3 (:8083) — X-Forwarded-Proto.     The app enforces HTTPS from a header
//        (:8084)                           the proxy in front never sets right.

import { createServer, request } from "node:http";

const argPort = Number(
  process.argv.includes("--port")
    ? process.argv[process.argv.indexOf("--port") + 1]
    : 8081
);
if (!Number.isInteger(argPort) || argPort < 0 || argPort > 65532) {
  throw new RangeError("--port must be 0 or an integer from 1 through 65532.");
}
const BASE = argPort;
const ports = { fault1: null, fault2: null, fault3: null, proxy: null };

const KNOWN_HOST = "status.campuspulse.example";
const stamp = () => new Date().toISOString().replace("T", " ").slice(0, 19) + "Z";
const log = (fault, req, code) =>
  console.log(
    `[${stamp()}] fault${fault} ${req.method} ${req.url} ` +
      `Host=${req.headers.host ?? "(none)"} -> ${code}`
  );

const common = (res) => {
  res.setHeader("Server", "campuspulse-fault-lab/1.0");
};

// ---------------------------------------------------------------- fault 1
// A shared edge. It routes by Host and has never been told about your domain.
const fault1 = createServer((req, res) => {
  common(res);
  const host = (req.headers.host || "").split(":")[0].toLowerCase();

  if (host === KNOWN_HOST) {
    const body = JSON.stringify({ status: "ok", service: "campuspulse" });
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
      Vary: "Accept-Encoding",
    });
    log(1, req, 200);
    return res.end(body);
  }

  const body =
    "404 Not Found\n\n" +
    "This shared edge has no site configured for the requested hostname.\n" +
    `Requested Host: ${req.headers.host}\n`;
  res.writeHead(404, {
    "Content-Type": "text/plain",
    "Content-Length": Buffer.byteLength(body),
    "X-Served-By": "shared-edge-7",
  });
  log(1, req, 404);
  res.end(body);
});

// ---------------------------------------------------------------- fault 2
// Two redirect defects in one origin.
//   /            apex -> www (301), www -> apex (301). A loop.
//   /legacy      302 to a new path. Method-preserving? No. POST becomes GET.
const fault2 = createServer((req, res) => {
  common(res);
  const host = (req.headers.host || "").split(":")[0].toLowerCase();
  const port = ports.fault2;

  if (req.url.startsWith("/legacy")) {
    res.writeHead(302, {
      Location: `http://${req.headers.host}/api/incidents`,
      "Content-Length": "0",
    });
    log(2, req, 302);
    return res.end();
  }

  if (req.url.startsWith("/api/incidents")) {
    if (req.method === "GET") {
      const body = JSON.stringify({ error: "method_not_allowed", expected: "POST" });
      res.writeHead(405, {
        "Content-Type": "application/json",
        Allow: "POST",
        "Content-Length": Buffer.byteLength(body),
      });
      log(2, req, 405);
      return res.end(body);
    }
    const body = JSON.stringify({ created: true });
    res.writeHead(201, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    });
    log(2, req, 201);
    return res.end(body);
  }

  // The loop: each side is individually "correct" and jointly fatal.
  const target = host.startsWith("www.")
    ? host.slice(4)
    : `www.${host || "campuspulse.example"}`;
  res.writeHead(301, {
    Location: `http://${target}:${port}${req.url}`,
    "Content-Length": "0",
  });
  log(2, req, 301);
  res.end();
});

// ---------------------------------------------------------------- fault 3
// The app is TLS-terminated by a proxy. It redirects any request it believes is
// plaintext. It reads X-Forwarded-Proto. The proxy sets X-Forwarded-Protocol.
const fault3 = createServer((req, res) => {
  common(res);
  const port = ports.fault3;
  const xfp = req.headers["x-forwarded-proto"];

  res.setHeader("X-App-Saw-XFP", xfp ?? "(absent)");
  res.setHeader(
    "X-App-Saw-Forwarded-Headers",
    Object.keys(req.headers)
      .filter((h) => h.startsWith("x-forwarded") || h === "forwarded")
      .join(", ") || "(none)"
  );

  if (xfp !== "https") {
    res.writeHead(301, {
      Location: `https://${req.headers.host || `127.0.0.1:${port}`}${req.url}`,
      "Content-Length": "0",
    });
    log(3, req, 301);
    return res.end();
  }

  const body = JSON.stringify({ status: "ok", secure: true });
  res.writeHead(200, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  log(3, req, 200);
  res.end(body);
});

const start = (srv, offset, key, label) =>
  new Promise((resolve, reject) => {
    srv.once("error", reject);
    srv.listen(BASE === 0 ? 0 : BASE + offset, "127.0.0.1", () => {
      srv.off("error", reject);
      ports[key] = srv.address().port;
      console.log(`fault${label} listening on http://127.0.0.1:${ports[key]}`);
      resolve();
    });
  });

// ------------------------------------------------------- fault 3, front door
// The "TLS-terminating load balancer" that sits in front of fault 3.
// It believes it is the public HTTPS listener. It forwards the client protocol
// in `X-Forwarded-Protocol` — one letter-group away from the standard name —
// and it rewrites the app's `Location` back onto its own listener, which is what
// turns a single bad redirect into an unbounded loop.
const proxy = createServer((req, res) => {
  const appPort = ports.fault3;
  const selfPort = ports.proxy;
  const upstream = request(
    {
      host: "127.0.0.1",
      port: appPort,
      method: req.method,
      path: req.url,
      headers: {
        ...req.headers,
        "X-Forwarded-Protocol": "https", // <-- the defect: wrong header name
        "X-Forwarded-For": "203.0.113.9",
        "X-Forwarded-Host": req.headers.host ?? "",
      },
    },
    (up) => {
      const headers = { ...up.headers };
      if (headers.location) {
        headers.location = headers.location.replace(
          /^https:\/\/[^/]+/,
          `http://${req.headers.host ?? `127.0.0.1:${selfPort}`}`
        );
      }
      headers["x-proxy"] = "campuspulse-lb/1.0 (terminates TLS)";
      res.writeHead(up.statusCode ?? 502, headers);
      up.pipe(res);
      log("3-lb", req, up.statusCode ?? 502);
    }
  );
  upstream.on("error", () => {
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end("502 Bad Gateway\n");
  });
  req.pipe(upstream);
});

try {
  await start(fault1, 0, "fault1", "1");
  await start(fault2, 1, "fault2", "2");
  await start(fault3, 2, "fault3", "3");
  await start(proxy, 3, "proxy", "3-lb");
  console.log(`PORTS ${JSON.stringify(ports)}`);
  console.log("\nCtrl+C to stop. Request log follows.\n");
} catch (error) {
  console.error(`fault-server startup failed: ${error.code ?? error.name}: ${error.message}`);
  await Promise.all([fault1, fault2, fault3, proxy].filter((srv) => srv.listening).map((srv) =>
    new Promise((resolve) => {
      srv.close(resolve);
      srv.closeAllConnections();
    })
  ));
  process.exitCode = 1;
}
