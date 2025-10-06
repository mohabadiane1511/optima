export default function TenantRootLayout({ children }: { children: React.ReactNode }) {
    // Layout minimal: laisse les sous-groupes (tenant-app / tenant-auth) gérer leur UI
    return children;
}


