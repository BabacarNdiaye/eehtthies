import SiteLogo from '@/Components/SiteLogo';
import { contactActions, legalLinks } from '@/lib/publicNav';
import { PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Clock, Facebook, Instagram, Linkedin, MapPin, Youtube } from 'lucide-react';

/**
 * Pied de page du téléphone et de la tablette (celui d'ordinateur est trop large) : identité, coordonnées à toucher,
 * réseaux et pages légales. Réserve sous lui la place de la barre du bas flottante.
 */
export default function MobileFooter() {
    const { siteSettings } = usePage<PageProps>().props;
    const actions = contactActions(siteSettings);
    const call = actions.find((action) => action.key === 'call');
    const email = actions.find((action) => action.key === 'email');
    const socials = [
        { label: 'Facebook', href: siteSettings.facebook_url, icon: Facebook },
        { label: 'Instagram', href: siteSettings.instagram_url, icon: Instagram },
        { label: 'LinkedIn', href: siteSettings.linkedin_url, icon: Linkedin },
        { label: 'YouTube', href: siteSettings.youtube_url, icon: Youtube },
    ].filter((social) => social.href);

    return (
        <footer className="bg-ink-950 px-5 pt-8 text-ink-300 lg:hidden" style={{ paddingBottom: 'calc(var(--portal-bar-h, 0px) + 1.5rem)' }}>
            <div className="flex items-center gap-3">
                <SiteLogo size={36} tone="gold" />
                <span className="font-serif text-base font-bold text-white">{siteSettings.site_name}</span>
            </div>

            <ul className="mt-5 space-y-3 text-sm">
                {siteSettings.site_address && (
                    <li className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
                        {siteSettings.site_address}
                    </li>
                )}
                {call && (
                    <li>
                        <a href={call.href} className="inline-flex items-center gap-2">
                            <call.icon className="h-4 w-4 shrink-0 text-gold-400" />
                            {siteSettings.site_phone}
                        </a>
                    </li>
                )}
                {email && (
                    <li>
                        <a href={email.href} className="inline-flex items-center gap-2 break-all">
                            <email.icon className="h-4 w-4 shrink-0 text-gold-400" />
                            {siteSettings.site_email}
                        </a>
                    </li>
                )}
                {siteSettings.opening_hours && (
                    <li className="flex items-start gap-2 whitespace-pre-line">
                        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
                        {siteSettings.opening_hours}
                    </li>
                )}
            </ul>

            {socials.length > 0 && (
                <div className="mt-5 flex gap-2">
                    {socials.map((social) => (
                        <a
                            key={social.label}
                            href={social.href as string}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={social.label}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-ink-100"
                        >
                            <social.icon className="h-4 w-4" />
                        </a>
                    ))}
                </div>
            )}

            <div className="mt-6 border-t border-white/10 pt-4 text-xs text-ink-300">
                <p className="flex flex-wrap gap-x-4 gap-y-1">
                    {legalLinks.map((legal) => (
                        <Link key={legal.route} href={route(legal.route)} className="underline underline-offset-2">
                            {legal.label}
                        </Link>
                    ))}
                </p>
                <p className="mt-3">
                    © {new Date().getFullYear()} {siteSettings.site_name}. Tous droits réservés.
                </p>
            </div>
        </footer>
    );
}
