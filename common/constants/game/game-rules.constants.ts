export interface GameRule {
    icon: string;
    title: string;
    description: string;
}

export const CLASSIC_RULES: GameRule[] = [
    {
        icon: '🏆',
        title: 'Objectif',
        description: 'Être le dernier joueur en vie.',
    },
    {
        icon: '🏃',
        title: 'Déplacement',
        description: 'ZQSD ou clic sur une case accessible. Coût : glace = 0 pt, normal = 1 pt, eau = 2 pts.',
    },
    {
        icon: '⚔️',
        title: 'Combat',
        description: 'Choisissez votre posture (attaque ou défense), puis les dés sont lancés simultanément. Si attaque + dé attaquant > défense + dé défenseur, la cible perd 1 PV.',
    },
    {
        icon: '⛩️',
        title: 'Sanctuaire Soin',
        description: 'Utiliser l\'action adjacente pour récupérer 2 PV (jusqu\'au maximum).',
    },
    {
        icon: '🛡️',
        title: 'Sanctuaire Combat',
        description: 'Utiliser l\'action adjacente pour gagner +1 ATK et +1 DEF jusqu\'à la fin du prochain tour.',
    },
    {
        icon: '🚪',
        title: 'Portes',
        description: 'Utiliser l\'action adjacente pour ouvrir ou fermer une porte.',
    },
];

export const CTF_RULES: GameRule[] = [
    {
        icon: '🏆',
        title: 'Objectif',
        description: 'Ramener le drapeau ennemi (🚩) à votre case de départ.',
    },
    {
        icon: '👥',
        title: 'Équipes',
        description: 'Deux équipes égales s\'affrontent. Les coéquipiers ne peuvent pas se combattre.',
    },
    {
        icon: '🚩',
        title: 'Drapeau',
        description: 'Marchez sur le drapeau ennemi pour le ramasser. Il apparaît sur votre personnage.',
    },
    {
        icon: '🤝',
        title: 'Transfert',
        description: 'Passez le drapeau à un coéquipier adjacent via l\'action. Il doit accepter.',
    },
    {
        icon: '💀',
        title: 'Élimination',
        description: 'Si le porteur du drapeau est éliminé, le drapeau tombe à sa position actuelle.',
    },
    {
        icon: '🏃',
        title: 'Déplacement',
        description: 'ZQSD ou clic sur une case accessible. Coût : glace = 0 pt, normal = 1 pt, eau = 2 pts.',
    },
    {
        icon: '⚔️',
        title: 'Combat',
        description: 'Choisissez votre posture (attaque ou défense), puis les dés sont lancés simultanément. Si attaque + dé attaquant > défense + dé défenseur, la cible perd 1 PV.',
    },
];
