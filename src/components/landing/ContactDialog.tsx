"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Step = 1 | 2 | 3 | 4;

export default function ContactDialog() {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<Step>(1);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const [profileType, setProfileType] = useState<'individual' | 'company'>('company');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [company, setCompany] = useState('');
    const [companySize, setCompanySize] = useState('');
    const [intent, setIntent] = useState<'trial' | 'demo' | 'quote' | 'support' | 'partnership' | 'other'>('demo');
    const [modules, setModules] = useState<string[]>([]);
    const [message, setMessage] = useState('');

    // Ouvrir via hash #contact
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handler = () => {
            if (window.location.hash === '#contact') {
                setOpen(true);
            }
        };
        handler();
        window.addEventListener('hashchange', handler);
        const openEv = () => setOpen(true);
        window.addEventListener('open-contact', openEv as any);
        return () => { window.removeEventListener('hashchange', handler); window.removeEventListener('open-contact', openEv as any); };
    }, []);

    // Adapter les champs selon le profil
    useEffect(() => {
        if (profileType === 'individual') {
            setCompany('');
            setCompanySize('');
        }
    }, [profileType]);

    const canNext1 = useMemo(() => fullName.trim() && email.trim(), [fullName, email]);
    const canNext2 = useMemo(() => !!intent, [intent]);
    const canSubmit = useMemo(() => message.trim().length >= 10, [message]);

    async function submit() {
        if (!canSubmit) return;
        try {
            setLoading(true);
            const res = await fetch('/api/public/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profileType, fullName, email, phone, company, companySize, intent, modules, message }),
            });
            if (!res.ok) throw new Error('failed');
            setDone(true);
            setStep(4);
        } catch {
        } finally { setLoading(false); }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[620px]">
                <DialogHeader>
                    <DialogTitle>Contactez‑nous</DialogTitle>
                    <DialogDescription>
                        Dites‑nous qui vous êtes et comment nous pouvons vous aider.
                    </DialogDescription>
                </DialogHeader>

                {/* Steps indicator */}
                <div className="flex items-center gap-2 text-xs">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full ${step >= i ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                    ))}
                </div>

                {/* Step 1: Profil */}
                {step === 1 && (
                    <div className="space-y-4 mt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-600">Vous êtes</label>
                                <Select value={profileType} onValueChange={(v: any) => setProfileType(v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="company">Entreprise</SelectItem>
                                        <SelectItem value="individual">Particulier</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {profileType === 'company' && (
                                <div>
                                    <label className="text-sm text-gray-600">Taille de l'entreprise</label>
                                    <Select value={companySize} onValueChange={setCompanySize}>
                                        <SelectTrigger><SelectValue placeholder="Sélectionner (optionnel)" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1-5">1–5</SelectItem>
                                            <SelectItem value="6-20">6–20</SelectItem>
                                            <SelectItem value="21-50">21–50</SelectItem>
                                            <SelectItem value="50+">50+</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-600">Nom complet</label>
                                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Prénom Nom" />
                            </div>
                            <div>
                                <label className="text-sm text-gray-600">Email</label>
                                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-600">Téléphone (optionnel)</label>
                                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+221 ..." />
                            </div>
                            {profileType === 'company' && (
                                <div>
                                    <label className="text-sm text-gray-600">Entreprise (optionnel)</label>
                                    <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Nom de l'entreprise" />
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button onClick={() => setStep(2)} disabled={!canNext1}>Suivant</Button>
                        </DialogFooter>
                    </div>
                )}

                {/* Step 2: Sujet */}
                {step === 2 && (
                    <div className="space-y-4 mt-4">
                        <div>
                            <label className="text-sm text-gray-600">Votre objectif</label>
                            <Select value={intent} onValueChange={(v: any) => setIntent(v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="trial">Essai</SelectItem>
                                    <SelectItem value="demo">Démo</SelectItem>
                                    <SelectItem value="quote">Devis</SelectItem>
                                    <SelectItem value="support">Support</SelectItem>
                                    <SelectItem value="partnership">Partenariat</SelectItem>
                                    <SelectItem value="other">Autre</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">Modules d’intérêt (optionnel)</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {['Produits & Stocks', 'Ventes', 'Achats', 'Analytics', 'Audit', 'Équipe'].map((m) => (
                                    <button key={m} type="button" onClick={() => setModules((prev) => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])} className={`text-xs px-3 py-2 rounded border ${modules.includes(m) ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>{m}</button>
                                ))}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setStep(1)}>Retour</Button>
                            <Button onClick={() => setStep(3)} disabled={!canNext2}>Suivant</Button>
                        </DialogFooter>
                    </div>
                )}

                {/* Step 3: Message */}
                {step === 3 && (
                    <div className="space-y-4 mt-4">
                        <div>
                            <label className="text-sm text-gray-600">Votre message</label>
                            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} className="w-full rounded-md border border-gray-300 p-3" placeholder="Décrivez votre besoin (min. 10 caractères)" />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setStep(2)}>Retour</Button>
                            <Button onClick={submit} disabled={!canSubmit || loading}>{loading ? 'Envoi…' : 'Envoyer'}</Button>
                        </DialogFooter>
                    </div>
                )}

                {/* Step 4: Confirmation */}
                {step === 4 && (
                    <div className="mt-2">
                        <div className="text-center space-y-2 py-8">
                            <div className="text-2xl font-semibold">Merci !</div>
                            <p className="text-gray-600">Nous avons bien reçu votre message. Un accusé de réception vous a été envoyé.</p>
                            <Button onClick={() => { setOpen(false); setTimeout(() => { setDone(false); setStep(1); }, 300); }}>Fermer</Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}


