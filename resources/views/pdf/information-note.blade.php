<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Note d'information {{ $note->reference }}</title>
    <style>
        /* Papier à en-tête EEHT : les marges réservent la place du bandeau, des logos et du pied de page,
           qui se répètent sur chaque page via des blocs fixes. */
        @page { margin: 245pt 60pt 125pt 60pt; }
        body { font-family: Helvetica, Arial, sans-serif; color: #111; font-size: 12pt; }
        .page-head { position: fixed; top: -245pt; left: -60pt; width: 595pt; height: 245pt; }
        .page-foot { position: fixed; bottom: -125pt; left: -60pt; width: 595pt; height: 125pt; }
        .abs { position: absolute; }
        .red { color: #d62828; }
        .rule { background: #000; height: 3pt; }
        h1.object { font-size: 22pt; text-align: center; margin: 0 0 22pt; }
        h1.object span { font-weight: normal; font-size: 15pt; }
        .content { line-height: 1.55; text-align: justify; }
        .content p { margin: 0 0 9pt; }
        .content ul, .content ol { margin: 0 0 9pt; padding-left: 20pt; }
        .content li { margin-bottom: 3pt; }
        .content h2 { font-size: 14pt; margin: 12pt 0 6pt; }
        .content h3 { font-size: 12.5pt; margin: 10pt 0 5pt; }
        .content blockquote { margin: 0 0 9pt; padding-left: 10pt; border-left: 3pt solid #7a1648; color: #333; }
        .content a { color: #7a1648; }
        .signature { margin-top: 36pt; text-align: right; font-style: italic; font-weight: bold; font-size: 15pt; page-break-inside: avoid; }
        .foot-text { text-align: center; font-size: 10pt; line-height: 1.45; color: #222; }
    </style>
</head>
<body>
    <div class="page-head">
        <img class="abs" style="top:0; left:0; width:595pt;" src="{{ public_path('images/letterhead/header-band.png') }}" alt="">
        <img class="abs" style="top:46pt; left:40pt; width:205pt;" src="{{ public_path('images/letterhead/republic.png') }}" alt="">
        <div class="abs" style="top:126pt; left:38pt; font-size:14pt; font-weight:bold; color:#2b3347;">Elite Ecole Hôtelière et Touristique</div>
        <img class="abs" style="top:88pt; left:293pt; width:62pt;" src="{{ public_path('images/letterhead/logo-eeht.png') }}" alt="">
        <div class="abs" style="top:97pt; left:400pt; width:190pt; font-size:10.5pt; font-weight:bold;">
            N° &nbsp;<span class="red">{{ str_pad((string) $note->number, 6, '0', STR_PAD_LEFT) }}.</span> {{ \App\Models\InformationNote::REFERENCE_SUFFIX }}
        </div>
        <div class="abs" style="top:117pt; left:420pt; width:170pt; font-size:12.5pt; font-weight:bold;">
            Thies le <span class="red">{{ $note->note_date->format('d/m/Y') }}</span>
        </div>
        <div class="abs rule" style="top:158pt; left:130pt; width:333pt;"></div>
    </div>

    <div class="page-foot">
        <div class="abs rule" style="top:0; left:125pt; width:333pt; height:2.5pt;"></div>
        <div class="abs foot-text" style="top:12pt; left:0; width:595pt;">
            EEHT: Elite Ecole Hôtelière et Touristique Thiès- Sénégal<br>
            Adresse : Située sur l’axe Thiès l’autoroute à péage à l’entrée de la ville.<br>
            Tel: 33 959 05 98 / 77379 48 98 / 76 182 28 54 . &nbsp;&nbsp; Email:eeht4034@gmail.com
        </div>
        <img class="abs" style="bottom:0; left:0; width:595pt;" src="{{ public_path('images/letterhead/footer-band.png') }}" alt="">
    </div>

    <h1 class="object">OBJET : <span>{{ $note->subject }}</span></h1>

    <div class="content">{!! $note->body_html !!}</div>

    <div class="signature">La Direction de l’EEHT de Thiès</div>
</body>
</html>
