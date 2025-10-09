import React from 'react';
import { TenantTopbar } from '../(tenant)/components/TenantTopbar';
import { TenantSidebar } from '../(tenant)/components/TenantSidebar';
import { Toaster } from '@/components/ui/sonner';

export default function TenantAppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="h-screen bg-gray-50 flex flex-col">
            <TenantTopbar />
            <div className="flex flex-1 overflow-hidden">
                <TenantSidebar />
                <main className="flex-1 p-6 overflow-auto">{children}</main>
                <Toaster position="top-right" />
            </div>
        </div>
    );
}


