import Pagination from '@/Components/Admin/Pagination';
import AttendanceRecords, { AttendanceRow, AttendanceStats } from '@/Components/Portal/AttendanceRecords';
import PortalPageHeader from '@/Components/Portal/PortalPageHeader';
import PortalLayout from '@/Layouts/PortalLayout';
import { studentNav } from '@/Pages/Portal/Student/Dashboard';
import { Paginated } from '@/types';
import { Head } from '@inertiajs/react';

interface Props {
    records: Paginated<AttendanceRow>;
    stats: Record<string, number>;
}

export default function Attendance({ records, stats }: Props) {
    return (
        <PortalLayout title="Espace Élève" nav={studentNav}>
            <Head title="Mes présences" />
            <PortalPageHeader title="Mes présences" />

            <div className="mb-6">
                <AttendanceStats stats={stats} />
            </div>

            <AttendanceRecords records={records.data} />
            <div className="mt-4">
                <Pagination data={records} />
            </div>
        </PortalLayout>
    );
}
