"use client";
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const KpiCards = dynamic(() => import('./sections/KpiCards'), { ssr: false, loading: () => <Skeleton className="h-24" /> });
const RevenueSection = dynamic(() => import('./sections/RevenueSection'), { ssr: false, loading: () => <Skeleton className="h-64" /> });
const StatusDonutSection = dynamic(() => import('./sections/StatusDonutSection'), { ssr: false, loading: () => <Skeleton className="h-64" /> });
const PaymentMethodsSection = dynamic(() => import('./sections/PaymentMethodsSection'), { ssr: false, loading: () => <Skeleton className="h-64" /> });
const ProductMarginsSection = dynamic(() => import('./sections/ProductMarginsSection'), { ssr: false, loading: () => <Skeleton className="h-64" /> });
const InvoicesTodo = dynamic(() => import('./sections/InvoicesTodo'), { ssr: false, loading: () => <Skeleton className="h-40" /> });
const PurchaseOrdersTodo = dynamic(() => import('./sections/PurchaseOrdersTodo'), { ssr: false, loading: () => <Skeleton className="h-40" /> });
const LowStockList = dynamic(() => import('./sections/LowStockList'), { ssr: false, loading: () => <Skeleton className="h-40" /> });
const StockRecent = dynamic(() => import('./sections/StockRecent'), { ssr: false, loading: () => <Skeleton className="h-40" /> });

export default function TenantDashboardPage() {
    return (
        <div className="space-y-6 p-4 md:p-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
                <p className="text-gray-600">Vue d’ensemble des ventes, achats et stock</p>
            </div>

            <Suspense>
                <KpiCards />
            </Suspense>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                    <Suspense>
                        <RevenueSection />
                    </Suspense>
                </div>
                <div className="space-y-4">
                    <Suspense>
                        <StatusDonutSection />
                    </Suspense>
                    <Suspense>
                        <PaymentMethodsSection />
                    </Suspense>
                </div>
            </div>

            <Suspense>
                <ProductMarginsSection />
            </Suspense>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Suspense>
                    <InvoicesTodo />
                </Suspense>
                <Suspense>
                    <PurchaseOrdersTodo />
                </Suspense>
                <Suspense>
                    <LowStockList />
                </Suspense>
            </div>

            <Suspense>
                <StockRecent />
            </Suspense>
        </div>
    );
}


