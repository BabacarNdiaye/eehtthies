<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * « Votre bulletin de paie est disponible » : ni montant ni numéro de compte dans le message, qui peut être lu sur un
 * écran verrouillé ou dans une boîte partagée. Le détail se lit dans « Ma paie », après connexion.
 */
class PayslipAvailable extends Mailable
{
    use Queueable;

    public function __construct(
        public string $name,
        public string $periodLabel,
        public string $url,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Bulletin de paie disponible — {$this->periodLabel}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.payslip_available',
            with: [
                'name' => $this->name,
                'periodLabel' => $this->periodLabel,
                'url' => $this->url,
            ],
        );
    }
}
