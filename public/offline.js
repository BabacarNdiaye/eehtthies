// EEHT de Thiès — page hors ligne : affiche, sans réseau, ce que l'application a gardé dans le navigateur
// (« photographie » enregistrée par les accueils élève et enseignant : emploi du temps de la semaine, et pour un
// élève sa carte avec le code QR de pointage). Rien n'est envoyé nulle part ; tout est effacé à la déconnexion.
(function () {
    var DAYS = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    var root = document.getElementById('snapshot');
    var data = null;

    try {
        data = JSON.parse(localStorage.getItem('eeht:snapshot') || 'null');
    } catch (e) {
        data = null;
    }

    if (!root || !data || !data.userId) {
        return;
    }

    function el(tag, className, text) {
        var node = document.createElement(tag);

        if (className) node.className = className;
        if (text !== undefined && text !== null) node.textContent = text;

        return node;
    }

    function pad(n) {
        return n < 10 ? '0' + n : String(n);
    }

    function hhmm(time) {
        return String(time).slice(0, 5);
    }

    // Heures de cours lues en UTC = heure de Dakar, comme dans l'application.
    var now = new Date();
    var todayIso = now.getUTCDay() === 0 ? 7 : now.getUTCDay();
    var saved = data.savedAt ? new Date(data.savedAt) : null;

    var head = el('div', 'who');
    head.appendChild(el('h2', null, data.name || ''));
    if (data.subtitle) head.appendChild(el('p', 'muted', data.subtitle));
    if (saved && !isNaN(saved)) {
        head.appendChild(el('p', 'muted small', 'Dernière synchronisation : ' + pad(saved.getDate()) + '/' + pad(saved.getMonth() + 1) + ' à ' + pad(saved.getHours()) + ':' + pad(saved.getMinutes())));
    }
    root.appendChild(head);

    if (data.card && data.card.qr) {
        var card = el('section', 'panel');
        card.appendChild(el('h3', null, 'Ma carte'));

        var img = document.createElement('img');
        img.className = 'qr';
        img.alt = 'Code QR de pointage';
        img.src = 'data:image/svg+xml;base64,' + data.card.qr;
        card.appendChild(img);

        card.appendChild(el('p', 'matricule', data.card.matricule || ''));
        card.appendChild(el('p', 'muted small', "À présenter au lecteur, à l'entrée de l'établissement."));
        root.appendChild(card);
    }

    var week = Array.isArray(data.week) ? data.week : [];
    var today = week
        .filter(function (entry) {
            return entry.day_of_week === todayIso;
        })
        .sort(function (a, b) {
            return String(a.start_time).localeCompare(String(b.start_time));
        });

    var agenda = el('section', 'panel');
    agenda.appendChild(el('h3', null, "Aujourd'hui · " + DAYS[todayIso]));

    if (today.length === 0) {
        agenda.appendChild(el('p', 'muted', week.length ? 'Aucun cours enregistré pour aujourd’hui.' : 'Emploi du temps non enregistré sur cet appareil.'));
    } else {
        var list = el('ul', 'agenda');

        today.forEach(function (entry) {
            var item = el('li');
            item.appendChild(el('span', 'time', hhmm(entry.start_time) + ' – ' + hhmm(entry.end_time)));

            var body = el('span', 'what');
            body.appendChild(el('strong', null, entry.subject || 'Cours'));

            var meta = [entry.who, entry.place].filter(Boolean).join(' · ');
            if (meta) body.appendChild(el('small', null, meta));

            item.appendChild(body);
            list.appendChild(item);
        });

        agenda.appendChild(list);
    }

    root.appendChild(agenda);
})();
