import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  detectIpVersion,
  formatCoordinates,
  formatLocation,
  getMapPoint,
  normalizeIpInfo,
} from "../public/app.js";
import { createIpResponse, getCallerIp } from "../functions/api/v1/get.js";

test("detectIpVersion recognizes common public IP shapes", () => {
  assert.equal(detectIpVersion("203.0.113.10"), "IPv4");
  assert.equal(detectIpVersion("2001:db8::1"), "IPv6");
  assert.equal(detectIpVersion("not an ip"), "Unknown");
});

test("normalizeIpInfo reads complete lookup payload", () => {
  assert.deepEqual(
    normalizeIpInfo({
      ip: "203.0.113.10",
      version: "IPv4",
      city: "Portland",
      region: "Oregon",
      country_name: "United States",
      timezone: "America/Los_Angeles",
      org: "Example Net",
      asn: "AS64500",
      network: "203.0.113.0/24",
      latitude: 45.5152,
      longitude: -122.6784,
    }),
    {
      ip: "203.0.113.10",
      version: "IPv4",
      city: "Portland",
      region: "Oregon",
      country: "United States",
      timezone: "America/Los_Angeles",
      org: "Example Net",
      asn: "AS64500",
      network: "203.0.113.0/24",
      latitude: 45.5152,
      longitude: -122.6784,
    },
  );
});

test("normalizeIpInfo falls back to Unknown and infers version", () => {
  assert.deepEqual(
    normalizeIpInfo({
      ip: "2001:db8::1",
      latitude: "45.0",
      longitude: Number.NaN,
    }),
    {
      ip: "2001:db8::1",
      version: "IPv6",
      city: "Unknown",
      region: "Unknown",
      country: "Unknown",
      timezone: "Unknown",
      org: "Unknown",
      asn: "Unknown",
      network: "Unknown",
      latitude: null,
      longitude: null,
    },
  );
});

test("format helpers keep empty and numeric values readable", () => {
  assert.equal(formatLocation({ city: "Portland", region: "Oregon" }), "Portland, Oregon");
  assert.equal(formatLocation({ city: "Unknown", region: "Unknown" }), "Unknown");
  assert.equal(formatCoordinates({ latitude: 45.51521, longitude: -122.67843 }), "45.5152, -122.6784");
  assert.equal(formatCoordinates({ latitude: null, longitude: -122.67843 }), "Unknown");
});

test("getMapPoint projects coordinates into map bounds", () => {
  assert.deepEqual(getMapPoint({ latitude: 0, longitude: 0 }), { x: 50, y: 50 });

  const point = getMapPoint({ latitude: 45, longitude: -90 });
  assert.ok(point);
  assert.equal(point.x, 25);
  assert.equal(point.y, 25);
  assert.equal(getMapPoint({ latitude: null, longitude: -122.6784 }), null);
});

test("getCallerIp prefers edge caller IP headers", () => {
  const request = new Request("https://example.test/api/v1/get", {
    headers: {
      "cf-connecting-ip": "203.0.113.10",
      "x-forwarded-for": "198.51.100.9, 198.51.100.10",
    },
  });

  assert.equal(getCallerIp(request), "203.0.113.10");
});

test("createIpResponse returns no-store JSON payload", async () => {
  const response = createIpResponse(
    new Request("https://example.test/api/v1/get", {
      headers: {
        "x-forwarded-for": "198.51.100.9, 198.51.100.10",
      },
    }),
  );

  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { ip: "198.51.100.9" });
});

test("getCallerIp falls back when caller header is absent", () => {
  assert.equal(getCallerIp(new Request("https://example.test/api/v1/get")), "Unknown");
});

test("served files do not reference disallowed providers or tooling", async () => {
  const servedFiles = [
    "public/app.js",
    "public/humans.txt",
    "public/index.html",
    "public/llm.txt",
  ];

  for (const file of servedFiles) {
    const content = await readFile(file, "utf8");
    assert.doesNotMatch(content, /\bgit\b|cloudflare/i, file);
  }
});
