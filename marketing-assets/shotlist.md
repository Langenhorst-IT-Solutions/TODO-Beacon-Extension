# Aufnahme-Briefing: Hero-Screenshot + Klick→Sprung-GIF

## Setup (einmalig)

1. Kopiere den Ordner `marketing-assets/sample-repo/` an einen Ort außerhalb dieses Repos, z. B. `C:/temp/recipe-box/`.
2. Öffne diesen Ordner als eigenes Workspace in VS Code (`Datei → Ordner öffnen…`).
3. Aktiviere ein Dark Theme (empfohlen: `Default Dark Modern`, bereits in VS Code enthalten).
4. Stelle sicher, dass TODO Beacon installiert/aktiv ist und die Activity-Bar-Icon-Leiste sichtbar ist.
5. Fenstergröße: ca. 1280×800 (VS Code Fenster nicht maximiert, sondern auf diese Größe gezogen — `Strg+Shift+P` → „Developer: Toggle Zen Mode“ NICHT verwenden, wir wollen die Activity Bar sehen).
6. Schließe alle anderen Tabs/Panels (Terminal, Debug-Panel zu) — nur Editor + Sidebar sichtbar.

## 1. Hero-Screenshot

**Ziel:** Ein Bild zeigt das gesamte Alleinstellungsmerkmal auf einen Blick.

- Öffne in der Activity Bar das TODO Beacon-Icon.
- Sorge dafür, dass **beide Views gleichzeitig sichtbar** sind: „Code TODOs“ oben (aufgeklappt, mindestens die Gruppen `BUG`, `FIXME`, `WARNING`, `TODO` sichtbar), „Task List“ darunter (aufgeklappt, „Backend“ und „Frontend“ sichtbar mit Checkboxen).
- Öffne zusätzlich `src/cart.js` im Editor daneben, damit man im Editor selbst eingefärbte Tag-Kommentare sieht (z. B. die `WARNING:`/`DEPRECATED:`/`XXX:`-Zeilen).
- Mauszeiger: nicht im Bild, oder dezent über einem Tree-Item (kein Tooltip offen).
- Aufnahme: `Windows + Shift + S` (Ausschnitt) oder ein Screenshot-Tool deiner Wahl.
- Export: PNG, **1280×800** (oder proportional größer, z. B. 1600×1000), Dateiname `hero-screenshot.png`, Ablage in `resources/` oder `marketing-assets/`.

## 2. Klick→Sprung-GIF (beide Features)

**Ziel:** In einem kurzen Loop zeigen, dass ein Klick im Tree direkt zur Code-Zeile bzw. Task-Zeile springt — das ist der eigentliche Produktbeweis.

**Tool-Empfehlung:** [ScreenToGif](https://www.screentogif.com/) (kostenlos, Windows, exportiert direkt als optimiertes GIF).

**Einstellungen in ScreenToGif:**
- Aufnahmebereich: exakt das VS Code Fenster (kein Desktop-Rand).
- FPS: 15 (reicht für UI-Klicks, hält Dateigröße klein).
- Nach Aufnahme: Editor → „Datei speichern als“ → GIF, Optionen: Optimierung „hoch“, Farbreduktion erlaubt.
- Ziel-Dateigröße: **unter 3 MB** (Marketplace/README laden sonst langsam). Falls größer: FPS auf 10 senken oder Aufnahmebereich verkleinern.

**Ablaufskript (Dauer: ca. 8–10 Sekunden, dann Loop):**

1. *(0:00)* Start: Beide Views sichtbar (Code TODOs + Task List), nichts ausgewählt.
2. *(0:01)* Klick auf den `FIXME`-Eintrag in „Code TODOs“ (aus `src/api.js`, Zeile zu `fetchRecipeById`).
3. *(0:02)* VS Code springt automatisch zur Zeile in `api.js` — kurz halten (1 Sek.), damit der Sprung sichtbar ist.
4. *(0:04)* Zurück zur Sidebar, Klick auf einen offenen Task in „Task List“, z. B. „Add pagination to recipe search (#12)“.
5. *(0:06)* VS Code springt zur entsprechenden Zeile in `TASKS.md` — kurz halten (1 Sek.).
6. *(0:08)* Ende der Aufnahme, Loop beginnt von vorn.

- Export-Dateiname: `click-to-jump.gif`, Ablage in `resources/` oder `marketing-assets/`.

## 3. Vergleichs-Screenshots: TaskPaper vs. Markdown

**Ziel:** Zeigen, dass dieselbe Aufgabenliste in beiden unterstützten Formaten identisch als Tree erscheint — Beweis, dass TaskPaper kein Nischen-Feature ist, sondern gleichwertig zu Markdown funktioniert.

Im `sample-repo`-Ordner liegen jetzt **beide** Varianten mit identischem Inhalt: `tasks.todo` (TaskPaper) und `TASKS.md` (Markdown). Da TODO Beacon pro Workspace nur eine Task-Datei lädt (Auto-Detect-Reihenfolge: `tasks.todo` → `TODO.md` → `todo.md` → `TASKS.md` → `tasks.md`), für jeden Screenshot **eine der beiden Dateien vorübergehend umbenennen/verschieben** (oder `todo-beacon.taskFile` in den Workspace-Settings explizit auf die gewünschte Datei setzen) und „Refresh TODOs“ auslösen.

1. **Screenshot A (TaskPaper):** nur `tasks.todo` aktiv (oder per Setting erzwungen) → „Task List“-View aufgeklappt zeigen (Backend/Frontend/Release-Gruppen sichtbar), plus `tasks.todo` selbst im Editor offen.
2. **Screenshot B (Markdown):** nur `TASKS.md` aktiv → identischer Tree-Zustand (gleiche Gruppen aufgeklappt), plus `TASKS.md` im Editor offen.
3. Beide Bilder im selben Seitenverhältnis/Zoomstufe aufnehmen, damit sie sich später nebeneinander im README gut vergleichen lassen.
4. Export: PNG, gleiche Auflösung wie der Hero-Screenshot (z. B. 1280×800), Dateinamen `compare-taskpaper.png` und `compare-markdown.png`.

## Einbindung im README

Direkt nach der Badge-Zeile/H1-Block einfügen (Platzhalterpfade anpassen, sobald die Dateien existieren):

```markdown
![TODO Beacon: Code TODOs und Task List in einer Ansicht](resources/hero-screenshot.png)

![Klick auf einen TODO oder Task springt direkt zur passenden Zeile](resources/click-to-jump.gif)
```

Die Vergleichs-Screenshots passen am besten direkt in den „✅ Task List“-Feature-Abschnitt, als Beleg für die Aussage „Supports both TaskPaper and Markdown checkbox formats":

```markdown
| TaskPaper | Markdown |
| --- | --- |
| ![TaskPaper task list](resources/compare-taskpaper.png) | ![Markdown task list](resources/compare-markdown.png) |
```
