import { Posture } from '@common/enum/match/match.enum';
import { VirtualPlayerActionType } from '@common/enum/match/virtual-player.enum';
import { Position } from '@common/interfaces/match/match-interface';


export type VirtualPlayerAction =
    | { type: VirtualPlayerActionType.Move; target: Position }
    | { type: VirtualPlayerActionType.Attack; target: string }
    | { type: VirtualPlayerActionType.ToggleDoor; target: Position }
    | { type: VirtualPlayerActionType.Sanctuary; target: Position }
    | { type: VirtualPlayerActionType.EndTurn }
    | { type: VirtualPlayerActionType.Posture; posture: Posture }
    | { type: VirtualPlayerActionType.PickupFlag; target: Position }
    | { type: VirtualPlayerActionType.ReturnFlag; target: Position }
    | { type: VirtualPlayerActionType.ChaseFlagHolder; target: Position }
    | { type: VirtualPlayerActionType.BlockStart; target: Position }
    | { type: VirtualPlayerActionType.AcceptTransfer; target: Position };                      
