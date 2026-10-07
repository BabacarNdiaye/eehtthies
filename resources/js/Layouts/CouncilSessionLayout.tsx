import MeetingBand from '@/Components/Council/MeetingBand';
import { usePage } from '@inertiajs/react';
import { ReactNode } from 'react';

interface SessionProps {
    council: { id: number; status: string };
    can: { conduct: boolean };
    sitting: { id: number } | null;
    visio: { meeting: { id: number; type: string } | null; iceServers: RTCIceServer[]; me: { id: number; name: string }; maxParticipants: number; canJoin: boolean };
}

/**
 * Mise en page persistante de l'écran de séance : la visioconférence (bandeau) reste connectée quand on passe d'une
 * classe à l'autre d'une séance commune — elle est commune à la séance, seule la fiche affichée change.
 */
export default function CouncilSessionLayout({ children }: { children: ReactNode }) {
    const { council, can, sitting, visio } = usePage().props as unknown as SessionProps;
    const showBand = council.status === 'in_session' && visio.canJoin;

    return (
        <>
            {showBand && (
                <MeetingBand
                    key={sitting ? `seance-${sitting.id}` : `conseil-${council.id}`}
                    councilId={council.id}
                    meeting={visio.meeting}
                    iceServers={visio.iceServers}
                    me={visio.me}
                    canConduct={can.conduct}
                    maxParticipants={visio.maxParticipants}
                />
            )}
            {children}
        </>
    );
}
