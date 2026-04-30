export const GAME_OVER_REDIRECT_DELAY = 5000;
export const MOVE_ERROR_DISPLAY_MS = 2500;
export const WATER_TILE_COST = 2;
export const TRANSITION_COUNTDOWN_START = 2;
export const GAME_START_COUNTDOWN_START = 5;
export const TRANSITION_COUNTDOWN_INTERVAL_MS = 1000;
export const COMBAT_COUNTDOWN_START = 3;
export const TIMER_INITIAL_MS = 30000;
export const MS_PER_SECOND = 1000;
export const SECONDS_PER_MINUTE = 60;
export const TIMER_DISPLAY_PAD_LENGTH = 2;
export const PLAYER_ABANDONED_FLAG = -1;
export const END_OF_TURN_WARNING_SECONDS = 3;
export const TIMER_LOW_THRESHOLD_SECONDS = 5;
export const DEFAULT_MAP_ID = 1;
export const ABANDON_NOTIFICATION_DISPLAY_MS = 5000;
export const TURN_PASSED_DISPLAY_MS = 3000;
export const ABANDON_TEAMMATE_ALONE = (name: string) =>
    `Oh non... ${name} a abandonné le combat ! Tu es maintenant seul dans ton équipe. Montre leur ce dont tu es capable ! 🔥`;
export const ABANDON_TEAMMATE_MULTIPLE = (name: string, count: number) =>
    `Oh non... ${name} a abandonné ! Vous n'êtes plus que ${count} dans l'équipe. Serrez les rangs, lâchez pas ! 💪`;
export const ABANDON_ENEMY_CTF = (name: string) =>
    `${name} de l'équipe adverse a déserté le champ de bataille ! Un de moins à affronter... 😈`;
export const ABANDON_CLASSIC = (name: string) =>
    `${name} a jeté l'éponge ! Un rival de moins sur ton chemin vers la gloire... 🏃💨`;

export const SANCTUARY_ACTIVE_MOVE_ERROR = 'Déplacement impossible : le sanctuaire est infranchissable. Utilisez « Exécuter action » pour l\'activer.';
export const SANCTUARY_INACTIVE_MOVE_ERROR = 'Ce sanctuaire est temporairement inactif. Il redeviendra accessible dans les prochains tours.';
export const SANCTUARY_INACTIVE_ACTION_ERROR = 'Ce sanctuaire est temporairement inactif. Il redeviendra accessible dans les prochains tours.';

export const FLAG_TRANSFER_NOT_POSSIBLE_ERROR = 'Aucun transfert possible : ni vous ni votre coéquipier ne possède le drapeau.';
export const FLAG_TRANSFER_CANCELLED_REQUESTER_MESSAGE =
    "Ton coéquipier n'a pas pu répondre à temps... ton tour s'est terminé avant qu'il accepte ! 😬";
export const FLAG_TRANSFER_CANCELLED_TARGET_MESSAGE =
    'Trop tard ! La demande de transfert a expiré avec le tour de ton coéquipier... essaie encore ! ⏰';
export const FLAG_TRANSFER_DECLINED_MESSAGE =
    'Ton coéquipier a refusé de te passer le drapeau.';
