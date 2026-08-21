import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'
import { rm } from 'fs/promises'
import { bitcoinConfFile } from '../fileModels/bitcoin.conf'
import { storeJson } from '../fileModels/store.json'
/**
 * Reset all mempool settings to undefined so the new flavor's upstream
 * defaults take effect. This is the primary reason users switch between
 * Core and Knots.
 */
const mempoolReset = {
  // Shared mempool settings
  persistmempool: undefined,
  maxmempool: undefined,
  mempoolexpiry: undefined,
  mempoolfullrbf: undefined,
  permitbaremultisig: undefined,
  datacarrier: undefined,
  datacarriersize: undefined,
  // Knots-specific mempool settings
  permitbaredatacarrier: undefined,
  rejectparasites: undefined,
  rejecttokens: undefined,
  mempoolreplacement: undefined,
  mempooltruc: undefined,
  permitbareanchor: undefined,
  permitephemeral: undefined,
  minrelaytxfee: undefined,
  bytespersigop: undefined,
  bytespersigopstrict: undefined,
  maxtxlegacysigops: undefined,
  limitancestorcount: undefined,
  limitancestorsize: undefined,
  limitdescendantcount: undefined,
  limitdescendantsize: undefined,
  permitbarepubkey: undefined,
  maxscriptsize: undefined,
  datacarriercost: undefined,
  acceptnonstddatacarrier: undefined,
  dustrelayfee: undefined,
  acceptunknownwitness: undefined,
  minrelaycoinblocks: undefined,
  minrelaymaturity: undefined,
}

/**
 * Chain-split recovery flag (see startos/forkRecovery.ts), set on every
 * sidegrade out of this enforcing flavor and consumed by the destination
 * flavor's chain-recovery oneshot at next start (a clean no-op when there is
 * nothing to fix). The shared datadir carries this flavor's persisted
 * per-block verdicts across the switch, so RDTS-driven invalid verdicts must
 * be reconsidered or they pin Core / pre-RDTS Knots to a stale chain across a
 * split. The destination's own rdtsEnforcedLastRun marker detects the same
 * transition independently; setting the flag here makes the switch case
 * deterministic even if a prior run never recorded a marker.
 *
 * The inverse direction needs nothing: the Knots release this flavor pins
 * re-validates the RDTS-applicable range itself when it starts on a datadir
 * that advanced without enforcement.
 */
const leavingRdtsFlavor = { reconsiderInvalidTips: true }

/**
 * `consensusrules=rdts` acknowledges the upgrade to the binary and nothing
 * else: the RUNTIME_WARN build enforces RDTS with or without it, and only
 * warns when it is missing. The package sets it on arrival and clears it on
 * departure — no other flavor understands the key — but never enforces it, so
 * a user who would rather see the warning can delete it and it stays deleted.
 */
const setConsensusRules = { raw: { consensusrules: 'rdts' as const } }
const clearConsensusRules = { raw: { consensusrules: undefined } }

export const current = VersionInfo.of({
  version: '#knots:29.4:5',
  releaseNotes: {
    en_US: `Fixes to the connection limit and config parsing.

- Maximum Connections now has a minimum of 40. Bitcoin reserves 11 connection slots for the peers it dials out to, and what is left over is shared between peers on the internet and services on your own server that fetch blocks, such as Electrs. Setting the limit to 11 or fewer left nothing for either, and those services would fail to start, retry, and fail again, with nothing in their own logs pointing back at this setting. A little above 11 was no better: Bitcoin will not drop an internet peer to make room until it is already holding a good number of them, so a tight limit left your own services shut out. The field now stops at 40, and its description says what the setting really controls and points at Max Upload Target and Blocks Only, which are the settings that actually reduce bandwidth. A node already set below 40 is raised to it the next time the package writes the file, which every install, update and restore does.
- A non-numeric value hand-edited into one of the numeric settings in bitcoin.conf is now ignored in favour of that setting default. It used to be written back into the file as NaN, which Bitcoin reads as 0 — for Maximum Connections, a node that neither makes nor accepts any peer connection at all.`,
    es_ES: `Correcciones en el límite de conexiones y en la lectura de la configuración.

- Conexiones máximas ahora tiene un mínimo de 40. Bitcoin reserva 11 ranuras de conexión para los pares a los que llama él mismo, y lo que sobra se reparte entre los pares de internet y los servicios de tu propio servidor que obtienen bloques, como Electrs. Fijar el límite en 11 o menos no dejaba nada para ninguno de los dos, y esos servicios no arrancaban, lo reintentaban y volvían a fallar, sin nada en sus propios registros que señalara este ajuste. Un poco por encima de 11 no era mejor: Bitcoin no descarta un par de internet para hacer sitio hasta que ya tiene una buena cantidad de ellos, así que un límite ajustado dejaba fuera a tus propios servicios. El campo ahora no baja de 40, y su descripción dice lo que el ajuste controla en realidad y remite a Objetivo máximo de subida y Solo bloques, que son los ajustes que de verdad reducen el ancho de banda. Un nodo ya fijado por debajo de 40 se sube a ese valor la próxima vez que el paquete escriba el archivo, cosa que hace en cada instalación, actualización y restauración.
- Un valor no numérico editado a mano en uno de los ajustes numéricos de bitcoin.conf ahora se ignora en favor del valor por defecto de ese ajuste. Antes se volvía a escribir en el archivo como NaN, que Bitcoin interpreta como 0: en el caso de Conexiones máximas, un nodo que ni establece ni acepta ninguna conexión con pares.`,
    de_DE: `Korrekturen am Verbindungslimit und am Einlesen der Konfiguration.

- Maximale Verbindungen hat jetzt einen Mindestwert von 40. Bitcoin reserviert 11 Verbindungsplätze für die Peers, die es selbst anwählt; was übrig bleibt, teilen sich Peers aus dem Internet und Dienste auf Ihrem eigenen Server, die Blöcke abrufen, etwa Electrs. Ein Wert von 11 oder weniger ließ für beide nichts übrig, und solche Dienste starteten nicht, versuchten es erneut und scheiterten wieder, ohne dass ihre eigenen Protokolle auf diese Einstellung hinwiesen. Etwas über 11 war nicht besser: Bitcoin trennt keinen Internet-Peer, um Platz zu schaffen, solange es nicht ohnehin schon eine ganze Reihe davon hält — ein knappes Limit sperrte die eigenen Dienste also aus. Das Feld beginnt jetzt bei 40, und seine Beschreibung sagt, was die Einstellung wirklich steuert, und verweist auf Maximales Upload-Ziel und Nur Blöcke, die Einstellungen, die tatsächlich Bandbreite sparen. Ein Knoten, der bereits unter 40 steht, wird beim nächsten Schreiben der Datei durch das Paket angehoben — bei jeder Installation, jedem Update und jeder Wiederherstellung.
- Ein von Hand in eine der numerischen Einstellungen der bitcoin.conf eingetragener nicht-numerischer Wert wird jetzt zugunsten des Standardwerts dieser Einstellung ignoriert. Zuvor wurde er als NaN in die Datei zurückgeschrieben, was Bitcoin als 0 liest — bei Maximale Verbindungen ein Knoten, der überhaupt keine Peer-Verbindung aufbaut oder annimmt.`,
    pl_PL: `Poprawki limitu połączeń i wczytywania konfiguracji.

- Maksymalna liczba połączeń ma teraz minimum 40. Bitcoin rezerwuje 11 miejsc na połączenia z peerami, do których dzwoni sam, a to, co zostaje, dzielą między siebie peerzy z internetu i usługi na Twoim własnym serwerze, które pobierają bloki, takie jak Electrs. Ustawienie 11 lub mniej nie zostawiało nic dla żadnej ze stron, a takie usługi nie startowały, ponawiały próbę i znów zawodziły, przy czym w ich własnych logach nic nie wskazywało na to ustawienie. Niewiele powyżej 11 nie było lepsze: Bitcoin nie rozłączy peera z internetu, by zrobić miejsce, dopóki nie trzyma ich już sporo, więc ciasny limit zamykał drogę Twoim własnym usługom. Pole zaczyna się teraz od 40, a jego opis mówi, czym to ustawienie naprawdę steruje, i kieruje do ustawień Maksymalny limit wysyłania oraz Tylko bloki, które faktycznie zmniejszają zużycie łącza. Węzeł ustawiony już poniżej 40 zostaje podniesiony do tej wartości przy najbliższym zapisie pliku przez pakiet, co dzieje się przy każdej instalacji, aktualizacji i przywracaniu.
- Nieliczbowa wartość wpisana ręcznie w jedno z liczbowych ustawień bitcoin.conf jest teraz pomijana na rzecz wartości domyślnej tego ustawienia. Wcześniej wracała do pliku jako NaN, co Bitcoin odczytuje jako 0 — w przypadku Maksymalnej liczby połączeń oznaczało to węzeł, który ani nie nawiązuje, ani nie przyjmuje żadnych połączeń z peerami.`,
    fr_FR: `Corrections de la limite de connexions et de la lecture de la configuration.

- Connexions maximales a désormais un minimum de 40. Bitcoin réserve 11 emplacements de connexion pour les pairs qu'il appelle lui-même, et ce qui reste est partagé entre les pairs d'internet et les services de votre propre serveur qui récupèrent les blocs, comme Electrs. Une valeur de 11 ou moins ne laissait rien ni aux uns ni aux autres, et ces services ne démarraient pas, réessayaient et échouaient de nouveau, sans que leurs propres journaux ne renvoient à ce réglage. Un peu au-dessus de 11 n'était pas mieux : Bitcoin ne coupe pas un pair d'internet pour faire de la place tant qu'il n'en tient pas déjà un bon nombre, de sorte qu'une limite serrée laissait vos propres services dehors. Le champ commence maintenant à 40, et sa description dit ce que le réglage contrôle réellement et renvoie à Objectif maximal d'envoi et Blocs uniquement, les réglages qui réduisent réellement la bande passante. Un nœud déjà réglé en dessous de 40 est remonté à cette valeur à la prochaine écriture du fichier par le paquet, ce que font chaque installation, mise à jour et restauration.
- Une valeur non numérique saisie à la main dans l'un des réglages numériques de bitcoin.conf est désormais ignorée au profit de la valeur par défaut de ce réglage. Elle était auparavant réécrite dans le fichier sous la forme NaN, que Bitcoin lit comme 0 — pour Connexions maximales, un nœud qui n'établit ni n'accepte aucune connexion avec des pairs.`,
  },
  migrations: {
    up: async ({ effects }) => {
      await bitcoinConfFile.merge(effects, setConsensusRules)
    },
    down: IMPOSSIBLE,
    // Keyed by Core major series as caret ranges — one entry per Core
    // major, not per Core `:N`. Range-keyed `migrations.other` requires
    // StartOS ≥ 0.4.0-beta.9 (Start9Labs/start-os#3214).
    //
    // Intentional asymmetry: there is no `^#knotsprerdts` key for the
    // pre-RDTS Knots sibling (B). The B↔C migration belt lives on B's own
    // `^#knots` entry (its `up` edge, C→B, sets reconsiderInvalidTips),
    // which fires because this flavor satisfies B's `canMigrateTo`; the
    // runtime rdtsEnforcedLastRun marker double-covers it. Not a gap — no
    // mirror key.
    other: {
      ['^28']: {
        // Core → Knots
        up: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, {
            ...mempoolReset,
            ...setConsensusRules,
          })
        },
        // Knots → Core
        down: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, {
            ...mempoolReset,
            ...clearConsensusRules,
          })
          await storeJson.merge(effects, leavingRdtsFlavor)
        },
      },
      ['^29']: {
        // Core → Knots
        up: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, {
            ...mempoolReset,
            ...setConsensusRules,
          })
        },
        // Knots → Core
        down: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, {
            ...mempoolReset,
            ...clearConsensusRules,
          })
          await storeJson.merge(effects, leavingRdtsFlavor)
        },
      },
      ['^30']: {
        // Core → Knots: drop coinstatsindex written by Core 30+ at the new
        // path; Knots 29 only reads the old indexes/coinstats/ path, which
        // Core 30 deliberately preserved for downgrade.
        up: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, {
            ...mempoolReset,
            ...setConsensusRules,
          })
          await rm('/media/startos/volumes/main/indexes/coinstatsindex', {
            recursive: true,
            force: true,
          }).catch(console.error)
        },
        // Knots → Core
        down: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, {
            ...mempoolReset,
            ...clearConsensusRules,
          })
          await storeJson.merge(effects, leavingRdtsFlavor)
        },
      },
      ['^31']: {
        // Core → Knots: drop fee_estimates.dat (v31 bumped
        // CURRENT_FEES_FILE_VERSION 149900 → 309900; ≤30 hard-fails) and
        // coinstatsindex (same reason as 30.x).
        up: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, {
            ...mempoolReset,
            ...setConsensusRules,
          })
          await rm('/media/startos/volumes/main/fee_estimates.dat', {
            force: true,
          }).catch(console.error)
          await rm('/media/startos/volumes/main/indexes/coinstatsindex', {
            recursive: true,
            force: true,
          }).catch(console.error)
        },
        // Knots → Core
        down: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, {
            ...mempoolReset,
            ...clearConsensusRules,
          })
          await storeJson.merge(effects, leavingRdtsFlavor)
        },
      },
      // `#knotsrdts` (the "Bitcoin Knots plus BIP-110" build) is being
      // retired. Users on it can move here; nothing carries over. The
      // acceptance that build recorded predates the split, so arrival
      // re-prompts under the current terms — as it does from every other
      // flavor. No `down` — `#knotsrdts` is being de-listed, so the inverse
      // path can't be selected by a user.
      ['^#knotsrdts:29.3']: {
        up: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, setConsensusRules)
        },
      },
    },
  },
})
  .satisfies('29.4:10')
  .satisfies('28.4:23')
