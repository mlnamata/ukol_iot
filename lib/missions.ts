// Mise 1. hodiny - pribeh "jsi majitel ZOO" polozeny na tabulku prikazu z papiroveho zadani.
// Kazdy krok ma cistou funkci check(root, history), ktera se vola po kazdem prikazu.

import { FsDir, HistoryEntry, getNode, isDir, isFile } from './fs'
import { absOperand, firstAbsOperand, flagsOf, operandsOf, ranOk, ranWithFlags } from './match'

export type Step = {
  id: string
  text: string
  /** Navede na spravny prepinac, neprozradi hotovy prikaz. */
  hint: string
  check: (root: FsDir, history: HistoryEntry[]) => boolean
}

export type Mission = {
  id: string
  title: string
  /** Kousek pribehu, ktery misi uvadi. */
  story: string
  steps: Step[]
}

const ZOO = '/home/student/zoo'
const HOME = '/home/student'

/** Prikaz `name` bezel uspesne nad cestou, ktera se rovna `target` nebo je pod ni. */
function ranOnPath(
  history: HistoryEntry[],
  name: string,
  target: string,
  predicate: (e: HistoryEntry) => boolean = () => true,
): boolean {
  return ranOk(history, name, (e) => {
    if (!predicate(e)) return false
    return operandsOf(e).some((op) => {
      const abs = absOperand(e, op)
      return abs === target || abs.startsWith(target + '/')
    })
  })
}

export const MISSIONS: Mission[] = [
  {
    id: 'm1',
    title: 'Obhlídka areálu',
    story:
      'Je pondělí ráno a ty jsi právě převzal ZOO Plzeň. Evidence zvířat je na serveru, ke kterému se dostaneš jen přes terminál — žádná myš, žádná okna. Než začneš cokoliv stavět, zjisti, kde vlastně stojíš.',
    steps: [
      {
        id: 'm1s1',
        text: 'Zjisti, ve kterém adresáři se právě nacházíš.',
        hint: 'Existuje jeden krátký příkaz, který vypíše absolutní cestu — tři písmena.',
        check: (_r, h) => ranOk(h, 'pwd'),
      },
      {
        id: 'm1s2',
        text: 'Vypiš obsah aktuálního adresáře včetně skrytých souborů a s právy.',
        hint: 'Skryté soubory začínají tečkou → přepínač -a. Práva a velikosti ukáže -l. Jde je spojit.',
        check: (_r, h) => ranWithFlags(h, 'ls', ['l', 'a']),
      },
      {
        id: 'm1s3',
        text: 'Přejdi absolutní cestou do systémové složky /etc.',
        hint: 'Absolutní cesta začíná lomítkem od kořene, ne od místa, kde stojíš.',
        check: (_r, h) => ranOk(h, 'cd', (e) => firstAbsOperand(e) === '/etc'),
      },
      {
        id: 'm1s4',
        text: 'Vrať se jedním příkazem do adresáře, ve kterém jsi byl předtím.',
        hint: 'Kromě cest umí cd i jeden speciální znak, který znamená „předchozí adresář".',
        check: (_r, h) => ranOk(h, 'cd', (e) => operandsOf(e)[0] === '-'),
      },
      {
        id: 'm1s5',
        text: 'Vyskoč o jednu úroveň výš a pak se vrať do domovského adresáře.',
        hint: 'O úroveň výš vede dvojtečka… spíš dvě tečky. Domov má vlastní zkratku ~.',
        check: (_r, h) =>
          ranOk(h, 'cd', (e) => (operandsOf(e)[0] ?? '').includes('..')) &&
          ranOk(h, 'cd', (e) => {
            const op = operandsOf(e)[0]
            return op === undefined || op.startsWith('~')
          }),
      },
    ],
  },
  {
    id: 'm2',
    title: 'Stavba nového výběhu',
    story:
      'Rada města schválila rozšíření. Za měsíc přijedou dva tapíři jihoameričtí a ty pro ně musíš v evidenci založit nový výběh i s karanténou — a hlavně evidenční kartu, bez ní je veterinář nepřevezme.',
    steps: [
      {
        id: 'm2s1',
        text: 'Jedním příkazem vytvoř vnořené adresáře ~/zoo/novy_vybeh/karantena.',
        hint: 'Bez správného přepínače mkdir selže, protože rodič neexistuje. Hledej -p jako „parents".',
        check: (root, h) =>
          isDir(getNode(root, `${ZOO}/novy_vybeh/karantena`)) && ranWithFlags(h, 'mkdir', ['p']),
      },
      {
        id: 'm2s2',
        text: 'Vytvoř prázdnou evidenční kartu ~/zoo/novy_vybeh/tapir.txt.',
        hint: 'Na prázdný soubor je příkaz, který jinak jen aktualizuje čas — „dotkni se" souboru.',
        check: (root, h) =>
          getNode(root, `${ZOO}/novy_vybeh/tapir.txt`) !== null && ranOk(h, 'touch'),
      },
      {
        id: 'm2s3',
        text: 'Zapiš do karty druh a počet kusů: Tapirus terrestris, 2 kusy.',
        hint: 'Výpis echo se dá místo na obrazovku poslat do souboru přesměrováním pomocí >.',
        check: (root) => {
          const f = getNode(root, `${ZOO}/novy_vybeh/tapir.txt`)
          return isFile(f) && f.content.includes('Tapirus')
        },
      },
    ],
  },
  {
    id: 'm3',
    title: 'Stěhování a evidence',
    story:
      'Než tapíři dorazí, chce po tobě kontrola zálohu evidence savců. A ještě jedna věc: zebry se přestěhovaly do výběhu C, ale v kartotéce je to pořád po staru.',
    steps: [
      {
        id: 'm3s1',
        text: 'Zkopíruj celý adresář ~/zoo/savci do ~/zoo/zaloha_savci.',
        hint: 'Adresář se bez jednoho přepínače zkopírovat nedá — cp ti rovnou napíše, který chybí.',
        check: (root) => {
          const z = getNode(root, `${ZOO}/zaloha_savci`)
          return isDir(z) && ['lev.txt', 'slon.txt', 'zebra.txt'].every((n) => isFile(z.children[n]))
        },
      },
      {
        id: 'm3s2',
        text: 'Zkopíruj ~/zoo/README.txt do nového výběhu.',
        hint: 'Obyčejný soubor se kopíruje bez přepínačů: cp zdroj cil.',
        check: (root, h) =>
          isFile(getNode(root, `${ZOO}/novy_vybeh/README.txt`)) &&
          ranOk(h, 'cp', (e) => !flagsOf(e).has('r')),
      },
      {
        id: 'm3s3',
        text: 'V ~/zoo/savci přejmenuj zebra.txt na zebra_vybeh_C.txt.',
        hint: 'Přejmenování je jen přesun na nové jméno — stejný příkaz jako stěhování.',
        check: (root) => {
          const s = getNode(root, `${ZOO}/savci`)
          return (
            isDir(s) &&
            isFile(s.children['zebra_vybeh_C.txt']) &&
            s.children['zebra.txt'] === undefined
          )
        },
      },
    ],
  },
  {
    id: 'm4',
    title: 'Úklid po stavbě',
    story:
      'Veterinář nakonec karanténu zamítl — tapíři přijedou rovnou z prověřené chovné stanice. A ta kopie README ve výběhu taky nemá co dělat. Pozor: koš v terminálu neexistuje, co smažeš, je pryč.',
    steps: [
      {
        id: 'm4s1',
        text: 'Smaž soubor ~/zoo/novy_vybeh/README.txt.',
        hint: 'Na soubor stačí rm bez přepínačů.',
        check: (root, h) =>
          getNode(root, `${ZOO}/novy_vybeh/README.txt`) === null &&
          ranOk(h, 'rm', (e) => !flagsOf(e).has('r')),
      },
      {
        id: 'm4s2',
        text: 'Smaž celý adresář ~/zoo/novy_vybeh/karantena.',
        hint: 'Na adresář rm samo nestačí — chce to stejný přepínač jako u kopírování složky.',
        check: (root, h) =>
          getNode(root, `${ZOO}/novy_vybeh/karantena`) === null && ranWithFlags(h, 'rm', ['r']),
      },
    ],
  },
  {
    id: 'm5',
    title: 'Revize a inventura',
    story:
      'Přišla kontrola z krajského úřadu. Chce vidět, kde má systém uložené konfigurace, jak je areál členěný a kolik místa evidence zabírá.',
    steps: [
      {
        id: 'm5s1',
        text: 'Najdi v /etc všechny konfigurační soubory *.conf.',
        hint: 'find potřebuje nejdřív cestu a pak -name se vzorem v uvozovkách.',
        check: (_r, h) =>
          ranOk(h, 'find', (e) => {
            const args = operandsOf(e)
            const start = args[0]
            if (!start || absOperand(e, start) !== '/etc') return false
            return /-name\s+["']?\*\.conf["']?/.test(e.command)
          }),
      },
      {
        id: 'm5s2',
        text: 'Vypiš v ~/zoo jen adresáře — tedy hledání podle typu, ne podle názvu.',
        hint: 'Kromě -name umí find i -type; adresář je d jako directory.',
        check: (_r, h) =>
          ranOk(h, 'find', (e) => /-type\s+d/.test(e.command) && ranPathInZoo(e)),
      },
      {
        id: 'm5s3',
        text: 'Zjisti celkovou velikost adresáře ~/zoo v čitelném formátu.',
        hint: 'du bez přepínačů vypíše každou podsložku zvlášť. Souhrn dělá -s, čitelné jednotky -h.',
        check: (_r, h) => ranWithFlags(h, 'du', ['s', 'h']),
      },
      {
        id: 'm5s4',
        text: 'Zjisti, kolik volného místa zbývá na disku.',
        hint: 'Na volné místo je jiný příkaz než na velikost složky — taky dvě písmena, taky s -h.',
        check: (_r, h) => ranWithFlags(h, 'df', ['h']),
      },
    ],
  },
  {
    id: 'm6',
    title: 'Mapa systému',
    story:
      'Kontrola má poslední otázku: vyznáš se vůbec v systému, na kterém ti evidence běží? Projdi pět základních adresářů Linuxu a ke každému si do taháku poznamenej jednou větou, co v něm je.',
    steps: [
      {
        id: 'm6s1',
        text: 'Podívej se, co je v /etc.',
        hint: 'Stačí do adresáře vstoupit nebo rovnou vypsat jeho obsah: ls /etc.',
        check: (_r, h) => visited(h, '/etc'),
      },
      {
        id: 'm6s2',
        text: 'Podívej se, co je v /home.',
        hint: 'Najdeš tam domovské adresáře uživatelů — mimo jiné ten svůj.',
        check: (_r, h) => visited(h, '/home'),
      },
      {
        id: 'm6s3',
        text: 'Podívej se, co je v /var.',
        hint: 'Bývají tam data, která se za běhu systému mění — třeba logy.',
        check: (_r, h) => visited(h, '/var'),
      },
      {
        id: 'm6s4',
        text: 'Podívej se, co je v /tmp.',
        hint: 'Dočasné soubory, které systém po čase sám zahodí.',
        check: (_r, h) => visited(h, '/tmp'),
      },
      {
        id: 'm6s5',
        text: 'Podívej se, co je v /usr.',
        hint: 'Nainstalované programy a jejich data.',
        check: (_r, h) => visited(h, '/usr'),
      },
    ],
  },
]

/** Student se do adresare podival - vstoupil do nej (cd) nebo vypsal jeho obsah (ls). */
function visited(history: HistoryEntry[], target: string): boolean {
  const hit = (e: HistoryEntry) =>
    operandsOf(e).some((op) => {
      const abs = absOperand(e, op)
      return abs === target || abs.startsWith(target + '/')
    })
  return ranOk(history, 'cd', hit) || ranOk(history, 'ls', hit) || ranOk(history, 'tree', hit)
}

/** find bezel nad stromem ~/zoo. */
function ranPathInZoo(e: HistoryEntry): boolean {
  const start = operandsOf(e)[0]
  if (!start) return false
  const abs = absOperand(e, start)
  return abs === ZOO || abs.startsWith(ZOO + '/') || abs === HOME
}

/** Zivá ukázka na 5 minut - presne scenar z papiru, v samostatne slozce ~/ukazka. */
export const DEMO_STEPS: Step[] = [
  {
    id: 'd1',
    text: 'Vytvoř adresářovou strukturu ~/ukazka/vybeh/krmivo.',
    hint: 'Celou cestu naráz zvládne mkdir s -p.',
    check: (root) => isDir(getNode(root, `${HOME}/ukazka/vybeh/krmivo`)),
  },
  {
    id: 'd2',
    text: 'Zkopíruj do ~/ukazka/vybeh libovolný soubor z evidence ZOO.',
    hint: 'Nabízí se třeba ~/zoo/README.txt nebo karta některého zvířete.',
    check: (root) => {
      const d = getNode(root, `${HOME}/ukazka/vybeh`)
      return isDir(d) && Object.values(d.children).some((c) => c.type === 'file')
    },
  },
  {
    id: 'd3',
    text: 'Zkopírovaný soubor přejmenuj na evidence.txt.',
    hint: 'Přejmenování i přesun dělá jeden a tentýž příkaz.',
    check: (root) => isFile(getNode(root, `${HOME}/ukazka/vybeh/evidence.txt`)),
  },
  {
    id: 'd4',
    text: 'Najdi evidence.txt příkazem find.',
    hint: 'Zadej cestu, odkud se má hledat, a pak -name "evidence.txt".',
    check: (_r, h) => ranOk(h, 'find', (e) => e.command.includes('evidence.txt')),
  },
  {
    id: 'd5',
    text: 'Ukaž velikost složky ~/ukazka v čitelném formátu.',
    hint: 'Souhrnná velikost jedné složky = du se -s a -h.',
    check: (_r, h) =>
      ranOk(h, 'du', (e) => {
        const f = flagsOf(e)
        if (!f.has('s') || !f.has('h')) return false
        return operandsOf(e).some((op) => absOperand(e, op).startsWith(`${HOME}/ukazka`))
      }),
  },
]

export const ALL_MISSION_STEPS = MISSIONS.flatMap((m) => m.steps)
export const TOTAL_MISSION_STEPS = ALL_MISSION_STEPS.length
