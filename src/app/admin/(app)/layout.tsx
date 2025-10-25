import { Toaster } from 'sonner';
import { AdminSidebar } from '../components/AdminSidebar';
import { AdminTopbar } from '../components/AdminTopbar';

export default function AdminAppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="h-screen bg-gray-50 flex flex-col">
            <AdminTopbar />
            <div className="flex flex-1 overflow-hidden">
                <AdminSidebar />
                <main className="flex-1 p-6 overflow-auto">
                    <Toaster position="top-right" />
                    {children}
                </main>
            </div>
        </div>
    );
}


