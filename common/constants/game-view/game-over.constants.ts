export const GAME_OVER_REDIRECT_DELAY_SECONDS = 5;
export const GAME_CANCELLED_NOTIFICATION = 'La partie a été annulée : une équipe n\'a plus de joueurs actifs suite à des abandons.';
export const GAME_ABANDONED_NOTIFICATION = 'Vous avez abandonné la partie.';

export const TEAM_LABELS: Record<string, string> = {
    RED: 'Rouge',
    BLUE: 'Bleue',
};

export const GAME_OVER_TITLES = {
    cancelled: 'Partie annulée',
    victory: 'Victoire !',
    defeat: 'Défaite',
};

export const GAME_OVER_ICONS = {
    cancelled: '⚠️',
    victory: '🏆',
    defeat: '💀',
};

export const GAME_OVER_MESSAGES_CTF = {
    victory: 'Votre équipe triomphe ! Vous avez ramené le drapeau à votre point de départ !',
    defeat: (winnerName: string, team: string) =>
        `L'Équipe ${team} a ramené le drapeau grâce à ${winnerName}... On se revanche la prochaine fois !`,
};

export const GAME_OVER_MESSAGES_CLASSIC = {
    victory: 'Vous remportez la partie ! Bien joué !',
    defeat: (winnerName: string) =>
        `${winnerName} a gagné cette fois. La prochaine, c'est vous !`,
};
