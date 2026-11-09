import { prisma } from "./prisma.ts";

export function matchesCountry(countryName: string, countryCode: string, targetStr: string): boolean {
  const cn = (countryName || "").trim().toLowerCase();
  const code = (countryCode || "").trim().toLowerCase();
  const tn = (targetStr || "").trim().toLowerCase();

  if (!tn || (!cn && !code)) return false;
  if (cn === tn || code === tn) return true;

  if (cn.includes("saudi") || code === "sa" || code === "ksa") {
    return tn.includes("saudi") || tn === "sa" || tn === "ksa";
  }
  if (cn.includes("dubai") || code === "ae" || code === "uae") {
    return tn.includes("dubai") || tn.includes("uae") || tn.includes("emirates") || tn === "ae";
  }
  if (cn.includes("oman") || code === "om") {
    return tn.includes("oman") || tn === "om";
  }
  if (cn.includes("qatar") || code === "qa") {
    return tn.includes("qatar") || tn === "qa";
  }
  if (cn.includes("malta") || code === "mt") {
    return tn.includes("malta") || tn === "mt";
  }

  return tn.includes(cn) || cn.includes(tn);
}

/**
 * Finds the matching Country record from the database for a given country name or code
 */
export async function findCountryByString(countryStr: string) {
  if (!countryStr || !countryStr.trim()) return null;
  const target = countryStr.trim();
  const countries = await prisma.country.findMany();

  return countries.find((c) => matchesCountry(c.name, c.code, target)) || null;
}

/**
 * Synchronizes a single Demand record into that specific destination country's CountryPackage.
 * If the demand belongs to Saudi Arabia, it is ONLY added to Saudi Arabia.
 * The package name matches the Demand name/title ("work demand name same thakbe").
 */
export async function syncDemandToCountryPackage(demandId: string) {
  try {
    const demand = await prisma.demand.findUnique({
      where: { id: demandId },
      include: { company: true },
    });
    if (!demand) return;

    const rate = demand.visaRate ? Number(demand.visaRate) : 0;
    const demandIdentifier = demand.demandNo;
    const demandTag = `[Demand: ${demandIdentifier}]`;

    // Package name must match the demand title / position
    const packageName = (
      demand.title ||
      `${demand.company?.name || "Company"} ${demand.profession || "Work Demand"}`
    ).trim();

    // Find any existing package created for this demand
    const existingPackage = await prisma.countryPackage.findFirst({
      where: {
        OR: [
          { description: { contains: demandIdentifier } },
          { description: { contains: demandTag } },
        ],
      },
    });

    // If demand rate is 0 or demand is Expired / Cancelled, remove package if exists
    if (rate <= 0 || demand.status === "Expired" || demand.status === "Cancelled") {
      if (existingPackage) {
        await prisma.countryPackage.delete({ where: { id: existingPackage.id } }).catch(() => {});
      }
      return;
    }

    // Match country
    const country = await findCountryByString(demand.country);
    if (!country) return;

    const desc = `Work & Demand quota package for ${packageName} (${demandIdentifier}) ${demandTag}`;

    if (existingPackage) {
      await prisma.countryPackage.update({
        where: { id: existingPackage.id },
        data: {
          countryId: country.id, // Moves to new country if demand's country changed
          name: packageName,
          price: rate,
          description: desc,
          active: true,
        },
      });
    } else {
      // Check if there is an unlinked generic "Works & Demands Quota Package" in this country
      const oldGeneric = await prisma.countryPackage.findFirst({
        where: {
          countryId: country.id,
          name: "Works & Demands Quota Package",
        },
      });

      if (oldGeneric) {
        await prisma.countryPackage.update({
          where: { id: oldGeneric.id },
          data: {
            name: packageName,
            price: rate,
            description: desc,
            active: true,
          },
        });
      } else {
        await prisma.countryPackage.create({
          data: {
            countryId: country.id,
            name: packageName,
            price: rate,
            description: desc,
            isDefault: false,
            active: true,
          },
        });
      }
    }
  } catch (error) {
    console.error(`Failed to sync demand ${demandId} to country package:`, error);
  }
}

/**
 * Removes the corresponding CountryPackage when a Demand is deleted
 */
export async function removeDemandCountryPackage(demandNo: string) {
  try {
    if (!demandNo) return;
    const demandTag = `[Demand: ${demandNo}]`;
    const existingPackage = await prisma.countryPackage.findFirst({
      where: {
        OR: [
          { description: { contains: demandNo } },
          { description: { contains: demandTag } },
        ],
      },
    });

    if (existingPackage) {
      await prisma.countryPackage.delete({ where: { id: existingPackage.id } });
    }
  } catch (error) {
    console.error(`Failed to remove country package for demand ${demandNo}:`, error);
  }
}

/**
 * Ensures all active demands in the database are synced to their respective countries' packages,
 * and purges any cross-country or orphaned quota packages.
 */
export async function syncAllDemandsToCountryPackages() {
  try {
    const demands = await prisma.demand.findMany({
      include: { company: true },
    });

    const activeDemandNos = new Set<string>();

    for (const demand of demands) {
      activeDemandNos.add(demand.demandNo);
      await syncDemandToCountryPackage(demand.id);
    }

    // Clean up any packages referencing demands that no longer exist
    const packagesWithDemandTag = await prisma.countryPackage.findMany({
      where: {
        description: { contains: "[Demand: " },
      },
    });

    for (const pkg of packagesWithDemandTag) {
      const match = pkg.description?.match(/\[Demand:\s*([^\]]+)\]/);
      if (match && match[1]) {
        const dNo = match[1].trim();
        if (!activeDemandNos.has(dNo)) {
          await prisma.countryPackage.delete({ where: { id: pkg.id } }).catch(() => {});
        }
      }
    }

    // Clean up any generic "Works & Demands Quota Package" lingering in countries without demands
    const orphanGenerics = await prisma.countryPackage.findMany({
      where: {
        name: "Works & Demands Quota Package",
      },
      include: { country: true },
    });

    for (const orphan of orphanGenerics) {
      const hasMatchingDemand = demands.some(
        (d) =>
          orphan.country &&
          matchesCountry(orphan.country.name, orphan.country.code, d.country) &&
          d.visaRate &&
          Number(d.visaRate) > 0
      );
      if (!hasMatchingDemand) {
        await prisma.countryPackage.delete({ where: { id: orphan.id } }).catch(() => {});
      }
    }
  } catch (error) {
    console.error("Failed to run syncAllDemandsToCountryPackages:", error);
  }
}
