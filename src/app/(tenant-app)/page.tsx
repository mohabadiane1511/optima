import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function TenantHome() {
    const jar = await cookies();
    const raw = jar.get('tenant_session')?.value;

    if (raw) {
        try {
            const payload = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as { mustChangePassword?: boolean };
            if (payload?.mustChangePassword) {
                redirect('/auth/change-password');
            }
            redirect('/dashboard');
        } catch {
            // ignore and go to login
        }
    }

    redirect('/auth/login');
}


