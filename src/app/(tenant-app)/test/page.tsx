"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TenantApiTestPage() {
    const [tenantHost, setTenantHost] = useState("synaptik.localhost:3000");
    const [catName, setCatName] = useState("Cat-Test");
    const [catId, setCatId] = useState("");
    const [sku, setSku] = useState("PRD-0101");
    const [log, setLog] = useState<string>("");

    async function createCategory() {
        try {
            const res = await fetch("/api/tenant/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: catName }),
            });
            const data = await res.json();
            setLog((l) => l + `\nCAT ${res.status}: ${JSON.stringify(data)}`);
            if (res.ok) setCatId(data.id);
        } catch (e: any) {
            setLog((l) => l + `\nCAT ERR: ${e?.message}`);
        }
    }

    async function createProduct() {
        try {
            const body = {
                sku,
                name: `Produit ${sku}`,
                salePrice: 1500,
                purchasePrice: 1200,
                unit: "unité",
                active: true,
                categoryId: catId || null,
            };
            const res = await fetch("/api/tenant/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            setLog((l) => l + `\nPRD ${res.status}: ${JSON.stringify(data)}`);
        } catch (e: any) {
            setLog((l) => l + `\nPRD ERR: ${e?.message}`);
        }
    }

    async function listProducts() {
        const res = await fetch("/api/tenant/products");
        const data = await res.json();
        setLog((l) => l + `\nLIST ${res.status}: ${JSON.stringify(data).slice(0, 500)}`);
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Test API tenant (Catégories & Produits)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-600">Host tenant (info)</label>
                            <Input value={tenantHost} onChange={(e) => setTenantHost(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-600">Nom catégorie</label>
                            <Input value={catName} onChange={(e) => setCatName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-600">SKU</label>
                            <Input value={sku} onChange={(e) => setSku(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={createCategory}>Créer catégorie</Button>
                        <Button onClick={createProduct}>Créer produit</Button>
                        <Button variant="outline" onClick={listProducts}>Lister produits</Button>
                    </div>
                    <pre className="text-xs bg-gray-100 p-3 rounded max-h-72 overflow-auto whitespace-pre-wrap">{log}</pre>
                </CardContent>
            </Card>
        </div>
    );
}


