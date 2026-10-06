import AdminLayout from '@/Layouts/AdminLayout';
import PageHeader from '@/Components/Admin/PageHeader';
import PayslipList, { PayslipSummary } from '@/Components/Payslips/PayslipList';
import { Head } from '@inertiajs/react';

/** « Ma paie » du personnel administratif : ses bulletins, une fois le salaire versé. */
export default function Index({ payslips }: { payslips: PayslipSummary[] }) {
    return (
        <AdminLayout>
            <Head title="Ma paie" />
            <PageHeader title="Ma paie" subtitle="Vos bulletins de paie, disponibles dès que votre salaire du mois est versé." />

            <PayslipList payslips={payslips} downloadRoute="admin.my-payslips.download" />
        </AdminLayout>
    );
}
