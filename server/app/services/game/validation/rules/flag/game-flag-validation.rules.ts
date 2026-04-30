import { FLAG_ALLOWED_TILES, FLAG_TYPE, GameValidationError } from '@app/constants/game-validation.constants';
import { CellDto } from '@app/model/dto/game/cell.dto';
import { flattenGrid } from '@app/services/game/validation/rules/grid/grid-utils';
import { GameMode } from '@common/enum/game/mode/game-mode.enum';

/**
 * Fonction principale de validation du drapeau lors de la création d’un game.
 * 
 * Rôle dans le processus :
 * - Applique la règle métier : « Le drapeau, si applicable, a été placé ».
 * - La validation est conditionnelle au mode de game.
 * - En mode Classique : aucune validation (le drapeau n’est pas applicable).
 * - En mode CTF :
 *    1. Vérifie qu’il y a exactement un drapeau sur la carte.
 *    2. Vérifie que ce drapeau est correctement placé.
 * 
 * Lance une erreur si une règle est violée.
 */


export function validateFlag(grid: CellDto[][], mode: GameMode): GameValidationError {
  const flags = getFlagCells(flattenGrid(grid));

  if (mode === GameMode.CTF) {

    if (flags.length > 1) {
      return GameValidationError.TooMuchFlags;
    } else if (flags.length === 0)
      return GameValidationError.MissingFlag;

    if (!isValidFlagCell(flags[0])) {
      return GameValidationError.InvalidFlagPlacement;
    }

  } else {
    if (flags.length > 0) return GameValidationError.NonApplicableFlag;


  }


}


/**
 * Vérifie la validité du positionnement d’un drapeau sur une cellule donnée.
 * 
 * Rôle dans le processus :
 * - S’assure que le drapeau respecte les contraintes physiques :
 *    - Il occupe une seule cellule (nbCells === 1).
 *    - Il est placé sur un type de terrain autorisé.
 * - Cette fonction ne vérifie PAS l’unicité du drapeau,
 *   seulement la validité de sa cellule.
 * 
 * Retourne true si la cellule est valide, false sinon.
 */
function isValidFlagCell(cell: CellDto): boolean {
  return (
    cell.objects?.objectType === FLAG_TYPE &&
    FLAG_ALLOWED_TILES.includes(cell.tile.tileType)
  );
}


/**
 * Extrait toutes les cellules contenant un drapeau.
 * 
 * Rôle dans le processus :
 * - Filtre les cellules de la carte pour ne conserver
 *   que celles qui contiennent un objet de type DRAPEAU.
 * - Permet ensuite de vérifier :
 *    - l’unicité du drapeau
 *    - sa position
 * 
 * Retourne une liste de cellules contenant un drapeau.
 */
function getFlagCells(cells: CellDto[]): CellDto[] {
  return cells.filter(
    c => c.objects?.objectType === FLAG_TYPE);
}


/**
 * Aplatie la grille 2D de la carte en une liste de cellules.
 * 
 * Rôle dans le processus :
 * - Simplifie les validations en permettant
 *   de parcourir toutes les cellules sans gérer
 *   les indices de lignes et de colonnes.
 * - Utilisée par toutes les validations globales de la carte
 *   (drapeau, points de départ, objets, etc.).
 * 
 * Retourne un tableau 1D de CellDto.
 */

