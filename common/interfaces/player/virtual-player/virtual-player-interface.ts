import { Position } from "../../match/match-interface";

export interface BfsState {
    currentLevel: number | null;
    candidate: Position | null;
    candidateLevel: number | null;
}
