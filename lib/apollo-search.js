/**
 * Apollo API client for contact search and enrichment
 */

/**
 * Search for contacts at a company using Apollo API
 * @param {string} companyName - Company name
 * @param {string} website - Company website (optional)
 * @param {string} apiKey - Apollo API key
 * @returns {Promise<Array>} - Array of contact objects
 */
export async function searchApolloContacts(companyName, website, apiKey) {
  if (!apiKey) {
    throw new Error("Apollo API key not configured");
  }

  console.log(`[APOLLO] Searching for contacts at ${companyName}`);

  try {
    // Extract domain from website URL if provided
    const domain = website ? extractDomain(website) : null;

    const response = await fetch("https://api.apollo.io/v1/contacts/search", {
      method: "POST",
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "application/json",
        "X-Api-Key": apiKey
      },
      body: JSON.stringify({
        q_organization_name: companyName,
        organization_domains: domain ? [domain] : undefined,
        per_page: 50,
        page: 1,
        // Only return contacts with emails
        contact_email_status: ["verified", "guessed"]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Apollo API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    console.log(`[APOLLO] Found ${data.contacts?.length || 0} contacts`);

    // Transform Apollo response to our format
    return (data.contacts || []).map(contact => ({
      name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
      title: contact.title || null,
      email: contact.email || null,
      phone: contact.sanitized_phone || contact.phone_numbers?.[0] || null,
      linkedin: contact.linkedin_url || null,
      apollo_id: contact.id,
      apollo_confidence_score: calculateConfidenceScore(contact),
      source: 'apollo'
    }));
  } catch (error) {
    console.error("[APOLLO] Search error:", error.message);
    throw error;
  }
}

/**
 * Calculate confidence score based on Apollo data quality
 */
function calculateConfidenceScore(contact) {
  let score = 0.5; // Base score

  // Email verification adds confidence
  if (contact.email_status === 'verified') score += 0.3;
  else if (contact.email_status === 'guessed') score += 0.1;

  // Phone number adds confidence
  if (contact.sanitized_phone) score += 0.1;

  // LinkedIn URL adds confidence
  if (contact.linkedin_url) score += 0.1;

  return Math.min(score, 1.0); // Cap at 1.0
}

/**
 * Extract domain from website URL
 */
function extractDomain(website) {
  if (!website) return null;

  try {
    // Add protocol if missing
    const url = website.startsWith('http') ? website : `https://${website}`;
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch (e) {
    // If parsing fails, try to extract domain manually
    return website.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  }
}

/**
 * Enrich organization data using Apollo API
 * @param {string} companyName - Company name
 * @param {string} domain - Company domain (optional)
 * @param {string} apiKey - Apollo API key
 * @returns {Promise<Object>} - Organization data
 */
export async function enrichApolloOrganization(companyName, domain, apiKey) {
  if (!apiKey) {
    throw new Error("Apollo API key not configured");
  }

  console.log(`[APOLLO] Enriching organization data for ${companyName}`);

  try {
    const payload = {
      organization_name: companyName
    };

    if (domain) {
      payload.domain = domain;
    }

    const response = await fetch("https://api.apollo.io/v1/organizations/enrich", {
      method: "POST",
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "application/json",
        "X-Api-Key": apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Apollo API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const org = data.organization;

    if (!org) {
      console.log(`[APOLLO] No organization data found for ${companyName}`);
      return null;
    }

    console.log(`[APOLLO] Found organization data for ${org.name}`);

    // Transform Apollo organization data to our format
    return {
      name: org.name || companyName,
      website: org.primary_domain ? `https://${org.primary_domain}` : null,
      description: org.short_description || org.description || null,
      employee_count: org.estimated_num_employees || null,
      industry: org.industry || null,
      founded_year: org.founded_year || null,
      linkedin_url: org.linkedin_url || null,
      twitter_url: org.twitter_url || null,
      // Apollo doesn't provide funding/revenue directly, but we can note the company size
      raw_employee_range: org.employee_range || null
    };
  } catch (error) {
    console.error("[APOLLO] Organization enrichment error:", error.message);
    throw error;
  }
}

/**
 * Create Apollo client with API key
 */
export function createApolloClient(apiKey) {
  return {
    searchContacts: (companyName, website) => searchApolloContacts(companyName, website, apiKey),
    enrichOrganization: (companyName, domain) => enrichApolloOrganization(companyName, domain, apiKey),
    isEnabled: () => !!apiKey
  };
}
