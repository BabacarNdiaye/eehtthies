import AdminLayout from '@/Layouts/AdminLayout';
import Card from '@/Components/Admin/Card';
import PageHeader from '@/Components/Admin/PageHeader';
import { Head, Link } from '@inertiajs/react';
import { UserRound } from 'lucide-react';

interface OrgNode {
    id: number;
    name: string;
    position: string | null;
    department: string | null;
    avatar: string | null;
    role: string | null;
    children: OrgNode[];
}

function Node({ node }: { node: OrgNode }) {
    return (
        <li>
            <Link href={route('admin.users.edit', node.id)} className="orgchart-node">
                <div className="mx-auto flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-ink-100 bg-ink-50">
                    {node.avatar ? (
                        <img src={`/storage/${node.avatar}`} alt={node.name} className="h-full w-full object-cover" />
                    ) : (
                        <UserRound className="h-6 w-6 text-ink-300" />
                    )}
                </div>
                <p className="mt-2 text-sm font-semibold text-ink-900">{node.name}</p>
                {node.position && <p className="text-xs text-ink-500">{node.position}</p>}
                {node.department && (
                    <span className="mt-1 inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">
                        {node.department}
                    </span>
                )}
            </Link>
            {node.children.length > 0 && (
                <ul>
                    {node.children.map((child) => (
                        <Node key={child.id} node={child} />
                    ))}
                </ul>
            )}
        </li>
    );
}

export default function Index({ tree }: { tree: OrgNode[] }) {
    return (
        <AdminLayout>
            <Head title="Organigramme" />
            <PageHeader
                title="Organigramme"
                subtitle="Structure hiérarchique du personnel administratif, basée sur le supérieur hiérarchique de chacun."
            />

            <Card className="p-6">
                {tree.length === 0 ? (
                    <p className="py-10 text-center text-ink-400">
                        Aucun membre du personnel administratif pour le moment.
                    </p>
                ) : (
                    <div className="orgchart-tree overflow-x-auto pb-4">
                        <ul>
                            {tree.map((node) => (
                                <Node key={node.id} node={node} />
                            ))}
                        </ul>
                    </div>
                )}
            </Card>

            <p className="mt-4 text-xs text-ink-400">
                Astuce : définissez le « Supérieur hiérarchique » de chaque membre depuis sa fiche{' '}
                <Link href={route('admin.users.index')} className="text-brand-600 underline">
                    Personnel administratif
                </Link>{' '}
                pour construire l'organigramme.
            </p>

            <style>{`
                .orgchart-tree, .orgchart-tree ul {
                    padding-top: 20px;
                    position: relative;
                    transition: all 0.4s;
                }
                .orgchart-tree ul {
                    display: flex;
                    justify-content: center;
                }
                .orgchart-tree li {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    list-style-type: none;
                    position: relative;
                    padding: 20px 12px 0 12px;
                }
                .orgchart-tree li::before,
                .orgchart-tree li::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    right: 50%;
                    border-top: 2px solid #e5ddd3;
                    width: 50%;
                    height: 20px;
                }
                .orgchart-tree li::after {
                    right: auto;
                    left: 50%;
                    border-left: 2px solid #e5ddd3;
                }
                .orgchart-tree li:only-child::after,
                .orgchart-tree li:only-child::before {
                    display: none;
                }
                .orgchart-tree li:only-child {
                    padding-top: 0;
                }
                .orgchart-tree li:first-child::before,
                .orgchart-tree li:last-child::after {
                    border: 0 none;
                }
                .orgchart-tree li:last-child::before {
                    border-right: 2px solid #e5ddd3;
                    border-radius: 0 5px 0 0;
                }
                .orgchart-tree li:first-child::after {
                    border-radius: 5px 0 0 0;
                }
                .orgchart-tree ul ul::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 50%;
                    border-left: 2px solid #e5ddd3;
                    width: 0;
                    height: 20px;
                }
                .orgchart-node {
                    display: inline-block;
                    min-width: 140px;
                    border: 1px solid #ece4d8;
                    border-radius: 0.5rem;
                    background: #fff;
                    padding: 12px 14px;
                    text-align: center;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
                    transition: box-shadow 0.15s, border-color 0.15s;
                }
                .orgchart-node:hover {
                    border-color: #c9a15a;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.08);
                }
            `}</style>
        </AdminLayout>
    );
}
