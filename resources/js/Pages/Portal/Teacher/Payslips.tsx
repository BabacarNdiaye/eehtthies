import PayslipList, { PayslipSummary } from '@/Components/Payslips/PayslipList';
import PortalPageHeader from '@/Components/Portal/PortalPageHeader';
import PortalLayout from '@/Layouts/PortalLayout';
import { teacherNav } from '@/Pages/Portal/Teacher/Dashboard';
import { Head } from '@inertiajs/react';

/** « Ma paie » de l'enseignant : ses bulletins, une fois le salaire versé. */
export default function Payslips({ payslips }: { payslips: PayslipSummary[] }) {
    return (
        <PortalLayout title="Espace Enseignant" nav={teacherNav}>
            <Head title="Ma paie" />
            <PortalPageHeader title="Ma paie" subtitle="Vos bulletins de paie, disponibles dès que votre salaire du mois est versé." />

            <PayslipList payslips={payslips} downloadRoute="teacher.payslips.download" />
        </PortalLayout>
    );
}
