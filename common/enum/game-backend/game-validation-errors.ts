export enum GameValidationError {
    EmptyName = 'Le nom du game ne peut pas être vide.',
    EmptyDescription = 'La description du game ne peut pas être vide.',
    NonUniqueName = 'Le nom du game est déjà utilisé.',

    InvalidDoorPlacement = 'Chaque porte doit être encadrée par deux murs sur un même axe.',
    InaccessibleTile = 'Certaines tuiles ne sont pas accessibles.',
    InsufficientTerrainRatio = 'Plus de 50 % de la carte doit être composée de tuiles de terrain.',

    InvalidStartingPointsCount = 'Tous les points de départ doivent être placés.',

    MissingFlag = 'Le drapeau doit être placé.',
    InvalidFlagPlacement = 'Le drapeau est mal positionné.',
    TooMuchFlags = "Il ne peut y avoir qu'un seul drapeau sur la carte.",
    NonApplicableFlag = "Le drapeau n'est pas applicable en mode Classique.",

    InvalidStartingPointsPlacement = 'Les points de départ doivent être placés sur des tuiles de terrain.',
    DuplicateStartingPoint = 'Deux points de départ ne peuvent pas se trouver sur la même cellule.',
    StartingPointValidationError = 'Erreur de validation des points de départ.',
    InaccessibleTileForStartingPoint = 'Certains points de départ ne sont pas accessibles.',

    ImageUrlInvalid = "L'URL de l'image est invalide.",
    ImageUrlInvalidProtocol = "L'URL de l'image doit commencer par http:// ou https://.",

    ImageUrlPublicId = "Le public Id ne respecte pas la structure",
    ImageUrlPublicIdError = "Erreur de public id pour l'image",

    ImageUrlEmpty = "L'URL de l'image ne peut pas être vide.",
    ModeInvalid = 'Le mode du game est invalide.',
}
