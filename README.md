# ZOO Terminál — simulátor Linuxu pro projektovou výuku

Webový simulátor Linuxového terminálu k projektu **Základy operačního systému Linux —
souborový systém a navigace** (projektová výuka, 4. ročník, 3 vyučovací hodiny).

Student se po přihlášení stane majitelem ZOO Plzeň a dostane příběhový úkol: připravit
nový výběh pro tapíry. Celá evidence běží „na serveru", ke kterému se dostane jen přes
terminál. Úkol je rozdělený na mise a ty na dílčí kroky — **další krok se odemkne až po
splnění předchozího**, takže se postupuje popořadě a nedá se nic přeskočit.

Vše běží **výhradně v prohlížeči** — žádný backend, žádná databáze, žádné proměnné
prostředí. Po `npm run build` a `npm start` funguje i offline.

## Spuštění

```bash
npm install
npm run dev
```

Produkční build:

```bash
npm run build
npm start
```

## Jak aplikace pokrývá zadání

| Část zadání | Kde v aplikaci |
| --- | --- |
| Hlavička (třída, datum, skupina) | přihlašovací obrazovka |
| Role ve skupině | výběr role při přihlášení, evidence členů v Hodnocení |
| Časový plán (3 hodiny) | přepínač hodin v hlavičce, záložky se podle hodiny zvýrazní |
| Co prostudovat a vyzkoušet | 6 misí, 22 dílčích kroků — pokrývají celou tabulku příkazů |
| Živá ukázka na 5 minut | záložka **Živá ukázka** — přesný scénář ze zadání |
| Úloha pro jinou skupinu | záložka **Úloha** — sestavení i řešení, předání kódem |
| Hodnocení 0–100 a známka | záložka **Hodnocení** |

### Mise a příkazy, které procvičí

| Mise | Příkazy |
| --- | --- |
| 1 — Obhlídka areálu | `pwd`, `ls -la`, `cd /etc`, `cd -`, `cd ..`, `cd ~` |
| 2 — Stavba nového výběhu | `mkdir -p`, `touch`, `echo >` |
| 3 — Stěhování a evidence | `cp -r`, `cp`, `mv` |
| 4 — Úklid po stavbě | `rm`, `rm -r` |
| 5 — Revize a inventura | `find -name`, `find -type`, `du -sh`, `df -h` |
| 6 — Mapa systému | průchod `/etc`, `/home`, `/var`, `/tmp`, `/usr` |

### Tahák

Tahák na A4 je v tomto projektu **deliverable jiného člena skupiny** a aplikace ho
neřeší. V tabulce hodnocení kritérium zůstává (30 bodů podle zadání) a body se do něj
zapisují ručně.

### Úloha pro jinou skupinu

Zadání vyžaduje „tři kroky, jasné zadání a způsob, jak ověřit správný výsledek".
Aplikace proto u každého kroku vynutí **strojově ověřitelnou** podmínku:

- existuje adresář / existuje soubor
- soubor obsahuje text
- cesta už neexistuje
- byl použit příkaz (volitelně s konkrétními přepínači)

Hotová úloha se zabalí do kódu `ZOO1-…`, druhá skupina ho vloží v záložce **Úloha →
Řešit cizí úlohu** a řeší ji ve stejném terminálu. Kroky se opět odemykají postupně.

### Hodnocení

| Kritérium | Max. | Jak se počítá |
| --- | --- | --- |
| Tahák | 30 | ručně (zpracovává jiný člen skupiny) |
| Živá ukázka | 25 | podíl splněných kroků ukázky |
| Kvalita připravené úlohy | 15 | podíl kroků s ověřitelnou podmínkou |
| Vyřešení úlohy od jiné skupiny | 15 | podíl vyřešených kroků |
| Spolupráce | 15 | průměr vzájemného hodnocení členů (0–3 b) |

Výsledná známka se počítá podle stupnice ze zadání: 90–100 = 1, 75–89 = 2, 60–74 = 3,
45–59 = 4, méně = 5.

## Struktura projektu

| Vrstva | Soubor | Popis |
| --- | --- | --- |
| Souborový systém | `lib/fs.ts` | typy `FsNode`, výchozí strom, `resolvePath`, `mkdir`/`cp`/`mv`/`rm`/`find`/`du` |
| Příkazy | `lib/commands.ts` | parser (uvozovky, přepínače, `>` a `>>`) + jeden handler na příkaz |
| Rozpoznání příkazů | `lib/match.ts` | pomocné funkce pro kontroly („byl použit `ls` s `-l` i `-a`") |
| Mise a ukázka | `lib/missions.ts` | 6 misí, 22 kroků + 5 kroků živé ukázky |
| Úloha pro jinou skupinu | `lib/peerTask.ts` | ověřovací podmínky, kódování/dekódování |
| Hodnocení | `lib/grading.ts` | 5 kritérií, 100 bodů, známka |
| Rámec výuky | `lib/course.ts` | role, časový plán, profil studenta |
| Formátování | `lib/format.ts` | `ls -l`, `du -h`, `tree`, `df -h` |

`lib/*.ts` jsou **čisté funkce bez Reactu** — jdou testovat samostatně bez DOM.
Stav UI drží `useReducer` v `app/page.tsx`, žádný globální state manager.

### Uložení postupu

Stav se průběžně ukládá do `localStorage` pod klíčem `zoo-terminal-state`. Po refreshi
student pokračuje tam, kde skončil. Tlačítko **Reset** vrátí souborový systém i postup do
výchozího stavu (přihlášení a složení skupiny zůstane). Pokud `localStorage` není
k dispozici, aplikace funguje dál — jen bez ukládání.

## Podporované příkazy

`pwd`, `ls` (`-l`, `-a`, `-la`), `cd` (`..`, `~`, `-`, absolutní i relativní cesty),
`mkdir` (`-p`), `touch`, `cat`, `echo` s `>` a `>>`, `cp` (`-r`), `mv`, `rm` (`-r`, `-f`),
`find <cesta> -name "<vzor>"` (`*`, `?`) a `-type f|d`, `du` (`-s`, `-h`), `df -h`,
`tree`, `clear`, `help`, `reset`.

Chybové hlášky kopírují reálný bash:

```
mkdir: cannot create directory 'x/y': No such file or directory
cp: -r not specified; omitting directory 'savci'
rm: cannot remove 'savci': Is a directory
bash: neco: command not found
```

## Klávesové zkratky v terminálu

| Zkratka | Akce |
| --- | --- |
| `↑` / `↓` | procházení historie příkazů |
| `Tab` | doplnění názvu souboru nebo adresáře |
| `Ctrl+L` | vyčištění obrazovky |
| `Ctrl+C` | zrušení rozepsaného řádku |

## Jak přidat vlastní misi nebo krok

Mise jsou obyčejné pole v `lib/missions.ts`. Nový krok = nový objekt v poli `steps`;
nová mise = nový objekt v `MISSIONS`. Pořadí v poli určuje pořadí odemykání a body
v hodnocení se přepočítají samy.

```ts
// lib/missions.ts
{
  id: 'm7',
  title: 'Krmivo na zimu',
  story: 'Blíží se zima a sklad je prázdný…',
  steps: [
    {
      id: 'm7s1',
      text: 'Vytvoř adresář ~/zoo/krmivo a zkopíruj do něj smlouvu.',
      // Nápověda navede na správný přepínač, neprozradí hotový příkaz.
      hint: 'Adresář vytvoříš přes mkdir, kopírování souboru zvládne cp bez přepínačů.',
      check: (root) => {
        const k = getNode(root, '/home/student/zoo/krmivo')
        return isDir(k) && isFile(k.children['smlouva.conf'])
      },
    },
  ],
}
```

### Dvě cesty, jak krok ověřit

`check(root, history)` dostane kořen souborového systému **a** historii příkazů:

- **Podle stavu souborového systému** — zajímá tě výsledek. Použij `getNode`, `isDir`,
  `isFile` z `lib/fs.ts`.
- **Podle historie příkazů** — zajímá tě, že student příkaz skutečně *použil*, i když po
  něm nezůstane stopa (`find`, `du`, `df`, `ls`). K tomu slouží `ranOk`, `ranWithFlags`,
  `operandsOf` a `absOperand` z `lib/match.ts`; započítávají se jen příkazy bez chyby.

Funkce musí být **čistá a rychlá** — volá se po každém stisku Enter. Jakmile jednou vrátí
`true`, krok zůstane splněný natrvalo.

## Přizpůsobení souborového systému

Výchozí obsah je v `initialRoot()` v `lib/fs.ts`, složený z `dir(jmeno, deti)` a
`file(jmeno, obsah)`. Velikost souboru se dopočítá sama z délky obsahu.

> Pozn.: Texty uvnitř simulovaného terminálu (obsah souborů, výpis `help`, chybové hlášky)
> jsou schválně **bez diakritiky** — chovají se jako reálný Linux. UI okolo terminálu
> je česky s diakritikou.
