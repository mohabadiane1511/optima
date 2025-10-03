import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { ProductCreateDialog } from "@/app/products/ProductCreateDialog";

export default async function ProductsPage() {
    const [products, categories] = await Promise.all([
        (prisma as any).product.findMany({
            include: { category: true },
            orderBy: { createdAt: "desc" },
            take: 100,
        }),
        (prisma as any).category.findMany({ orderBy: { name: "asc" } }),
    ]);

    return (
        <div className="max-w-6xl mx-auto w-full py-10 animate-in fade-in-50 duration-300">
            <PageHeader
                title="Produits"
                actions={<ProductCreateDialog categories={categories} />}
            />
            <Card className="transition hover:shadow-md">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>SKU</TableHead>
                                <TableHead>Nom</TableHead>
                                <TableHead>Catégorie</TableHead>
                                <TableHead>Prix</TableHead>
                                <TableHead>Statut</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.map((p: any) => (
                                <TableRow key={p.id}>
                                    <TableCell className="font-mono">{p.sku}</TableCell>
                                    <TableCell>{p.name}</TableCell>
                                    <TableCell>{p.category?.name ?? "—"}</TableCell>
                                    <TableCell>{Number(p.price).toFixed(2)} FCFA</TableCell>
                                    <TableCell>{p.active ? "Actif" : "Inactif"}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}


