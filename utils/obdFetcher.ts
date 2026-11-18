// utils/obdFetcher.ts

export async function fetchObdDefinition(rawCode: string) {
  const code = rawCode.trim().toUpperCase();

  try {
    const res = await fetch(
      `https://autotools.brightcoding.dev/api/obd/${code}`,
      {
        next: { revalidate: 86400 }, // Cache results for 24 hours in Next.js
      },
    );

    if (!res.ok) {
      return {
        code,
        meaning: "Unrecognized or Manufacturer-Specific DTC Code",
        causes: [],
        symptoms: [],
      };
    }

    const data = await res.json();
    return {
      code: data.code || code,
      meaning: data.meaning || data.description || "No description available",
      system: data.system || "General",
      causes: data.causes || [],
      symptoms: data.symptoms || [],
    };
  } catch (err) {
    return {
      code,
      meaning: "Error fetching code definition",
      causes: [],
      symptoms: [],
    };
  }
}

export async function parseAndFetchObdCodes(commaSeparatedInput: string) {
  if (!commaSeparatedInput) return [];

  const codes = commaSeparatedInput
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter((c) => c.length > 0);

  // Fetch all code definitions in parallel
  const results = await Promise.all(
    codes.map((code) => fetchObdDefinition(code)),
  );
  return results;
}
