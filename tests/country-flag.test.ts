import test from "node:test";
import assert from "node:assert/strict";
import { resolveCountryFlagEmoji } from "../src/lib/country-data.ts";
import { getCountryFlagEmoji } from "../src/lib/country-pipeline.ts";

test("resolves 2-letter ISO country codes into flags", () => {
  assert.equal(getCountryFlagEmoji("RU", "Russia"), "🇷🇺");
  assert.equal(getCountryFlagEmoji("SA", "Saudi Arabia"), "🇸🇦");
  assert.equal(getCountryFlagEmoji("AE", "United Arab Emirates"), "🇦🇪");
  assert.equal(getCountryFlagEmoji("QA", "Qatar"), "🇶🇦");
  assert.equal(getCountryFlagEmoji("KW", "Kuwait"), "🇰🇼");
  assert.equal(getCountryFlagEmoji("OM", "Oman"), "🇴🇲");
  assert.equal(getCountryFlagEmoji("BH", "Bahrain"), "🇧🇭");
  assert.equal(getCountryFlagEmoji("MY", "Malaysia"), "🇲🇾");
  assert.equal(getCountryFlagEmoji("SG", "Singapore"), "🇸🇬");
  assert.equal(getCountryFlagEmoji("JP", "Japan"), "🇯🇵");
});

test("resolves 3-letter ISO and agency codes (like RUS, KSA, UAE, QAT)", () => {
  assert.equal(getCountryFlagEmoji("RUS", "Russia"), "🇷🇺");
  assert.equal(getCountryFlagEmoji("KSA", "Saudi Arabia"), "🇸🇦");
  assert.equal(getCountryFlagEmoji("UAE", "Dubai"), "🇦🇪");
  assert.equal(getCountryFlagEmoji("QAT", "Qatar"), "🇶🇦");
  assert.equal(getCountryFlagEmoji("KWT", "Kuwait"), "🇰🇼");
  assert.equal(getCountryFlagEmoji("DEU", "Germany"), "🇩🇪");
  assert.equal(getCountryFlagEmoji("USA", "United States"), "🇺🇸");
  assert.equal(getCountryFlagEmoji("GBR", "United Kingdom"), "🇬🇧");
  assert.equal(getCountryFlagEmoji("OTHER", "Other"), "🌐");
});

test("resolves country names even when code is blank or custom", () => {
  assert.equal(getCountryFlagEmoji("", "Russia"), "🇷🇺");
  assert.equal(getCountryFlagEmoji("", "Saudi Arabia"), "🇸🇦");
  assert.equal(getCountryFlagEmoji("", "Dubai"), "🇦🇪");
  assert.equal(getCountryFlagEmoji("", "Qatar"), "🇶🇦");
  assert.equal(getCountryFlagEmoji("", "Kuwait"), "🇰🇼");
  assert.equal(getCountryFlagEmoji("", "Oman"), "🇴🇲");
  assert.equal(getCountryFlagEmoji("", "Bahrain"), "🇧🇭");
  assert.equal(getCountryFlagEmoji("", "Singapore"), "🇸🇬");
  assert.equal(getCountryFlagEmoji("", "Japan"), "🇯🇵");
  assert.equal(getCountryFlagEmoji("", "Germany"), "🇩🇪");
  assert.equal(getCountryFlagEmoji("", "United Kingdom"), "🇬🇧");
});

test("honors explicit flag override", () => {
  assert.equal(getCountryFlagEmoji("RUS", "Russia", "🇷🇺"), "🇷🇺");
  assert.equal(getCountryFlagEmoji("OTHER", "Custom Zone", "🇪🇺"), "🇪🇺");
});
