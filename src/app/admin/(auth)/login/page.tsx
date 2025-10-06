"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogDescription } from "@/components/ui/alert-dialog";

export default function AdminLoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [msg, setMsg] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setMsg("");
        setIsLoading(true);

        try {
            const res = await fetch("/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (res.ok) {
                setMsg("Connecté. Redirection…");
                window.location.href = "/admin/dashboard";
            } else {
                const data = await res.json();
                setMsg(data.error || "Erreur de connexion");
            }
        } catch (error) {
            setMsg("Erreur de connexion");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl text-center">Super Admin</CardTitle>
                    <CardDescription className="text-center">
                        Connexion à la plateforme Optima ERP
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="mohabadiane67@gmail.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Mot de passe</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {msg && (
                            <AlertDialog>
                                <AlertDialogDescription>{msg}</AlertDialogDescription>
                            </AlertDialog>
                        )}
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Connexion..." : "Se connecter"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

