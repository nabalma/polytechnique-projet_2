import { Position } from './match-interface';

export interface ReachabilityContext {
    reachable: Position[];
    visited: Map<string, number>;
    queue: { position: Position; cost: number }[];
}
