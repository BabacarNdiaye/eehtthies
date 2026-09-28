<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>@yield('title', \App\Models\Setting::get('site_name', 'EEHT de Thiès'))</title>
</head>
<body style="margin:0; padding:0; background-color:#eef1f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
    @hasSection('preheader')
        <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">
            @yield('preheader')
        </div>
    @endif

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef1f4; padding: 40px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(11,23,40,0.08);">

                    {{-- En-tête --}}
                    <tr>
                        <td style="background-color:#0b1728; padding: 28px 32px; border-bottom: 3px solid #e2ac37;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td width="44" valign="middle">
                                        @php($logo = \App\Models\Setting::get('site_logo'))
                                        @if($logo)
                                            <img src="{{ url('/storage/'.$logo) }}" alt="{{ \App\Models\Setting::get('site_short_name', 'EEHT') }}" width="40" height="40" style="display:block; width:40px; height:40px; border-radius:50%; object-fit:cover; background-color:#ffffff;">
                                        @else
                                            <table role="presentation" width="40" height="40" cellpadding="0" cellspacing="0" style="background-color:#e2ac37; border-radius:50%;">
                                                <tr><td align="center" valign="middle" style="font-family: Georgia, 'Times New Roman', serif; font-weight:bold; font-size:18px; color:#0b1728;">E</td></tr>
                                            </table>
                                        @endif
                                    </td>
                                    <td valign="middle" style="padding-left: 14px;">
                                        <span style="font-family: Georgia, 'Times New Roman', serif; font-size: 17px; font-weight: bold; color: #ffffff; line-height:1.3;">
                                            {{ \App\Models\Setting::get('site_short_name', 'EEHT de Thiès') }}
                                        </span><br>
                                        <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 11px; color: #9fb0c3; letter-spacing: 0.04em; text-transform: uppercase;">
                                            @yield('eyebrow', 'Notification automatique')
                                        </span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    {{-- Contenu --}}
                    <tr>
                        <td style="padding: 36px 32px;">
                            @yield('content')
                        </td>
                    </tr>

                    {{-- Pied de page --}}
                    <tr>
                        <td style="padding: 20px 32px; background-color:#f7f9fb; border-top: 1px solid #eef1f4;">
                            <p style="margin:0; font-size: 12px; line-height: 1.6; color: #7c8ea3;">
                                <strong style="color:#445a72;">{{ \App\Models\Setting::get('site_name', 'EEHT de Thiès') }}</strong>
                                @if(\App\Models\Setting::get('site_address'))
                                    <br>{{ \App\Models\Setting::get('site_address') }}
                                @endif
                                @if(\App\Models\Setting::get('site_phone'))
                                    · {{ \App\Models\Setting::get('site_phone') }}
                                @endif
                            </p>
                            <p style="margin:10px 0 0; font-size: 11px; color: #a3b1c2;">
                                Ceci est un message automatique, merci de ne pas y répondre directement.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
