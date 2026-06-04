import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  detectIpVersion,
  formatCoordinates,
  formatLocation,
  normalizeIpInfo,
} from "../public/app.js";

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
