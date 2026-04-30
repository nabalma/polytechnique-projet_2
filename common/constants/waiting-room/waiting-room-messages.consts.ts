export const DEFAULT_MAX_PLAYERS = 2;
export const MIN_PLAYERS = 2;

export const WAITING_ROOM_MESSAGES = {
    YOU_WERE_KICKED: "Vous avez été expulsé de la salle d'attente par l'organisateur.",
    ORGANIZER_LEFT: "L'organisateur a quitté la partie. La salle d'attente a été fermée.",
    GAME_ALREADY_HAS_ROOM: 'Une salle existe déjà pour ce jeu.',
    ALONE_IN_GAME: "Tous les autres joueurs ont quitté la partie. Vous avez été redirigé vers la page d'accueil.",
    CTF_ODD_PLAYERS: (count: number) => `Mode CTF : un nombre pair de joueurs est requis (${count} actuellement)`,
} as const;

export type WaitingRoomMessage = Extract<(typeof WAITING_ROOM_MESSAGES)[keyof typeof WAITING_ROOM_MESSAGES], string>;
