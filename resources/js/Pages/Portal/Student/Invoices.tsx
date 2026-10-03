import InvoiceList from '@/Components/Portal/InvoiceList';
import PortalPageHeader from '@/Components/Portal/PortalPageHeader';
import PortalLayout from '@/Layouts/PortalLayout';
import { formatAmount } from '@/lib/portal';
import { studentNav } from '@/Pages/Portal/Student/Dashboard';
import { Invoice } from '@/types';
import { Head } from '@inertiajs/react';
import { CheckCircle2, Wallet } from 'lucide-react';

export default function Invoices({ invoices }: { invoices: Invoice[] }) {
    const totalDue = invoices.reduce((sum, invoice) => sum + (invoice.computed_balance ?? 0), 0);

    return (
        <PortalLayout title="Espace Élève" nav={studentNav}>
            <Head title="Mes factures" />
            <PortalPageHeader title="Mes factures" />

            {invoices.length > 0 && (
                <div
                    className={`mb-5 flex items-center gap-3 rounded-2xl p-4 ${totalDue > 0 ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}
                    role="status"
                >
                    {totalDue > 0 ? <Wallet className="h-6 w-6 shrink-0" /> : <CheckCircle2 className="h-6 w-6 shrink-0" />}
                    <div>
                        <p className="text-xs font-medium opacity-80">{totalDue > 0 ? 'Solde à régler' : 'Scolarité'}</p>
                        <p className="text-lg font-bold leading-tight">{totalDue > 0 ? formatAmount(totalDue) : 'À jour'}</p>
                    </div>
                </div>
            )}

            <InvoiceList invoices={invoices} receiptHref={(invoice, payment) => route('student.invoices.receipt', [invoice.id, payment.id])} />
        </PortalLayout>
    );
}
