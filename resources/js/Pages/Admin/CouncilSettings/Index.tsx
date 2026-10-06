import PageHeader from '@/Components/Admin/PageHeader';
import AppreciationsTab from '@/Components/Admin/CouncilSettings/AppreciationsTab';
import DecisionTypesTab from '@/Components/Admin/CouncilSettings/DecisionTypesTab';
import IncompatibilitiesTab from '@/Components/Admin/CouncilSettings/IncompatibilitiesTab';
import MessagesTab from '@/Components/Admin/CouncilSettings/MessagesTab';
import InternshipCriteriaTab from '@/Components/Admin/CouncilSettings/InternshipCriteriaTab';
import RulesTab from '@/Components/Admin/CouncilSettings/RulesTab';
import SubjectGroupsTab from '@/Components/Admin/CouncilSettings/SubjectGroupsTab';
import ThresholdsTab from '@/Components/Admin/CouncilSettings/ThresholdsTab';
import VoteTab, { VoteOptions } from '@/Components/Admin/CouncilSettings/VoteTab';
import AdminLayout from '@/Layouts/AdminLayout';
import { CouncilRules, DecisionTypeRow, SubjectGroupRow, SubjectRow, ThresholdSet } from '@/lib/council';
import { PageProps } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { KeyboardEvent, useState } from 'react';

interface Props {
    decisionTypes: DecisionTypeRow[];
    categories: Record<string, string>;
    tones: Record<string, string>;
    mentions: Record<string, string>;
    reportDecisions: Record<string, string>;
    thresholds: { default: ThresholdSet; formations: Record<string, ThresholdSet> };
    thresholdLevels: Record<'orange' | 'red', string>;
    formations: { id: number; name: string }[];
    sanctionLevels: Record<string, string>;
    subjectGroups: SubjectGroupRow[];
    subjects: SubjectRow[];
    rules: CouncilRules;
    appreciations: { id: number; level: string; theme: string; text: string; is_active: boolean }[];
    appreciationLevels: Record<string, string>;
    appreciationThemes: Record<string, string>;
    internshipCriteria: { id: number; label: string; is_active: boolean }[];
    voteOptions: VoteOptions;
    placeholders: Record<string, string>;
}

const TABS = [
    { id: 'types', label: 'Types de décision' },
    { id: 'incompatibilites', label: 'Incompatibilités' },
    { id: 'seuils', label: "Seuils d'alerte" },
    { id: 'groupes', label: 'Groupes de matières' },
    { id: 'appreciations', label: 'Banque d’appréciations' },
    { id: 'stage', label: 'Grille de stage' },
    { id: 'vote', label: 'Vote' },
    { id: 'messages', label: 'Messages aux familles' },
    { id: 'validation', label: 'Validation et recours' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function Index(props: Props) {
    const canEdit = usePage<PageProps>().props.auth.permissions.includes('modifier_parametrage_conseils');
    const [tab, setTab] = useState<TabId>(() => {
        const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';

        return (TABS.find((item) => item.id === hash)?.id ?? 'types') as TabId;
    });

    const choose = (id: TabId) => {
        setTab(id);
        window.history.replaceState(window.history.state, '', `#${id}`);
    };

    // Flèches gauche/droite entre les onglets (motif « tablist » de l'ARIA).
    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        const index = TABS.findIndex((item) => item.id === tab);
        const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;

        if (step === 0) return;
        event.preventDefault();
        const next = TABS[(index + step + TABS.length) % TABS.length].id;
        choose(next);
        document.getElementById(`tab-${next}`)?.focus();
    };

    return (
        <AdminLayout>
            <Head title="Réglages des conseils" />
            <PageHeader
                title="Réglages des conseils de classe"
                subtitle="Décisions possibles, seuils des pastilles d'alerte, groupes de matières, règles de vote et circuit de validation du procès-verbal."
            />

            <div role="tablist" aria-label="Rubriques du paramétrage" className="-mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-ink-100 px-4 sm:mx-0 sm:px-0">
                {TABS.map((item) => {
                    const active = item.id === tab;

                    return (
                        <button
                            key={item.id}
                            id={`tab-${item.id}`}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            aria-controls={`panel-${item.id}`}
                            tabIndex={active ? 0 : -1}
                            onClick={() => choose(item.id)}
                            onKeyDown={onKeyDown}
                            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-gold-500 ${
                                active ? 'border-ink-900 text-ink-900' : 'border-transparent text-ink-500 hover:text-ink-800'
                            }`}
                        >
                            {item.label}
                        </button>
                    );
                })}
            </div>

            <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
                {tab === 'types' && (
                    <DecisionTypesTab types={props.decisionTypes} categories={props.categories} tones={props.tones} mentions={props.mentions} reportDecisions={props.reportDecisions} canEdit={canEdit} />
                )}
                {tab === 'incompatibilites' && <IncompatibilitiesTab types={props.decisionTypes} categories={props.categories} canEdit={canEdit} />}
                {tab === 'seuils' && (
                    <ThresholdsTab thresholds={props.thresholds} formations={props.formations} levels={props.thresholdLevels} sanctionLevels={props.sanctionLevels} canEdit={canEdit} />
                )}
                {tab === 'groupes' && <SubjectGroupsTab groups={props.subjectGroups} subjects={props.subjects} canEdit={canEdit} />}
                {tab === 'appreciations' && <AppreciationsTab templates={props.appreciations} levels={props.appreciationLevels} themes={props.appreciationThemes} canEdit={canEdit} />}
                {tab === 'stage' && <InternshipCriteriaTab criteria={props.internshipCriteria} canEdit={canEdit} />}
                {tab === 'vote' && <VoteTab rules={props.rules} options={props.voteOptions} canEdit={canEdit} />}
                {tab === 'messages' && <MessagesTab rules={props.rules} placeholders={props.placeholders} canEdit={canEdit} />}
                {tab === 'validation' && <RulesTab rules={props.rules} canEdit={canEdit} />}
            </div>
        </AdminLayout>
    );
}
