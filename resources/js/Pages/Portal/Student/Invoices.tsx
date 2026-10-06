import InvoiceList from '@/Components/Portal/InvoiceList';
import PortalPageHeader from '@/Components/Portal/PortalPageHeader';
import PortalLayout from '@/Layouts/PortalLayout';
import { studentNav } from '@/Pages/Portal/Student/Dashboard';
import { Invoice, OnlinePaymentConfig } from '@/types';
import { Head } from '@inertiajs/react';

export default function Invoices({ invoices, online }: { invoices: Invoice[]; online: OnlinePaymentConfig | null }) {
    return (
        <PortalLayout title="Espace Élève" nav={studentNav}>
            <Head title="Mes factures" />
            <PortalPageHeader title="Mes factures" />

            <InvoiceList invoices={invoices} online={online} receiptHref={(invoice, payment) => route('student.invoices.receipt', [invoice.id, payment.id])} />
        </PortalLayout>
    );
}
