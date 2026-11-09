import test from "node:test";
import assert from "node:assert/strict";
import { matchesCountry, findCountryByString } from "../src/lib/country-package-sync.ts";
import { prisma } from "../src/lib/prisma.ts";

test("country package demand synchronization and isolation", async (t) => {
  await t.test("matchesCountry correctly identifies countries and aliases", () => {
    assert.equal(matchesCountry("Saudi Arabia", "SA", "Saudi Arabia"), true);
    assert.equal(matchesCountry("Saudi Arabia", "SA", "ksa"), true);
    assert.equal(matchesCountry("Saudi Arabia", "SA", "Oman"), false);
    assert.equal(matchesCountry("Oman", "OM", "Oman"), true);
    assert.equal(matchesCountry("Oman", "OM", "Saudi Arabia"), false);
    assert.equal(matchesCountry("Dubai", "AE", "UAE"), true);
  });

  await t.test("Demand package belongs ONLY to its destination country and matches demand name", async () => {
    // Check that Demand DEM-2026-027860 belongs to Saudi Arabia
    const saDemand = await prisma.demand.findFirst({
      where: { demandNo: "DEM-2026-027860" },
    });
    assert.ok(saDemand, "Saudi demand should exist");
    assert.equal(saDemand.country, "Saudi Arabia");

    // Fetch Saudi packages
    const saCountry = await prisma.country.findFirst({
      where: { code: "SA" },
      include: { packages: true },
    });
    assert.ok(saCountry);

    // Saudi Arabia must have the package matching the Demand's name
    const saDemandPkg = saCountry.packages.find((p) => p.name === saDemand.title || p.name === "Almarai Electrician");
    assert.ok(saDemandPkg, "Saudi Arabia must have package matching the demand name");
    assert.equal(Number(saDemandPkg.price), Number(saDemand.visaRate));

    // Fetch Oman packages
    const omanCountry = await prisma.country.findFirst({
      where: { code: "OM" },
      include: { packages: true },
    });
    assert.ok(omanCountry);

    // Oman must NOT have Saudi Arabia's demand package or generic Quota package
    const omanSaudiPkg = omanCountry.packages.find(
      (p) => p.name === "Almarai Electrician" || p.name === "Works & Demands Quota Package"
    );
    assert.equal(omanSaudiPkg, undefined, "Oman must NOT have Saudi Arabia's demand package");

    // Fetch Qatar packages
    const qatarCountry = await prisma.country.findFirst({
      where: { code: "QA" },
      include: { packages: true },
    });
    assert.ok(qatarCountry);

    // Qatar must NOT have Saudi Arabia's demand package or generic Quota package
    const qatarSaudiPkg = qatarCountry.packages.find(
      (p) => p.name === "Almarai Electrician" || p.name === "Works & Demands Quota Package"
    );
    assert.equal(qatarSaudiPkg, undefined, "Qatar must NOT have Saudi Arabia's demand package");
  });
});
