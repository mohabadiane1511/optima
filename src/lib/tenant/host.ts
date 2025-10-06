export type ResolvedTenant = {
  tenantSlug: string | null;
  isAdminHost: boolean;
};

// Resolve tenant from request host. In dev, supports {slug}.localhost:3000
export function resolveTenantFromHost(hostHeader: string | null | undefined): ResolvedTenant {
  if (!hostHeader) return { tenantSlug: null, isAdminHost: false };

  const host = hostHeader.toLowerCase();

  // Super admin lives under path /admin, not a special host
  // We only consider subdomains for tenant space.

  // Dev: {slug}.localhost:3000
  if (host.endsWith("localhost:3000")) {
    const sub = host.replace(".localhost:3000", "");
    if (sub && sub !== "localhost:3000") {
      return { tenantSlug: sub, isAdminHost: false };
    }
    return { tenantSlug: null, isAdminHost: false };
  }

  // Prod: {slug}.domain.tld
  const parts = host.split(":")[0].split(".");
  if (parts.length >= 3) {
    const [sub] = parts;
    return { tenantSlug: sub, isAdminHost: false };
  }

  return { tenantSlug: null, isAdminHost: false };
}


