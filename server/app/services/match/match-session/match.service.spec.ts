/* eslint-disable max-lines-per-function, -- On désactive cette règles parce que ce fichier de test contient des scénarios longs
 * STRATÉGIE DE TEST — MatchService
 *
 * Objectif : Valider la logique de délégation des opérations de match côté serveur.
 *
 * Approche :
 * - Tests unitaires purs, sans base de données réelle
 * - PlayerService et BroadcastService mockés avec jest.fn()
 * - getGameForSocket mocké pour simuler la présence ou l'absence d'un match
 * - Chaque test repart d'un état propre via beforeEach (nouvelle instance + jest.clearAllMocks)
 * - Couverture des cas normaux ET cas limites pour chaque méthode publique impliquée dans le combat
 *
 * Cas limites couverts :
 * - Match inexistant → toutes les demandes d'opérations sur Match sont ignorées sans crash
 * - endTurn sans match → ne lève pas d'exception
 * - requestAttack sans match → ne lève pas d'exception
 * - choosePosture sans match → ne lève pas d'exception
 */

import { BroadcastService } from '@app/gateways/match/broadcast/broadcast.gateway';
import { PlayerService } from '@app/services/match/player/player.service';
import { LogVirtualPlayerService } from '@app/services/virtual-log/virtual-log.service';
import { Posture } from '@common/enum/match/match.enum';
import { RequestAttackPayload } from '@common/interfaces/game-play/game-play-payloads-interfaces';
import { Test, TestingModule } from '@nestjs/testing';
import { MatchService } from './match.service';

describe('MatchService', () => {
    let service: MatchService;

    const mockPlayerService = {
        getPlayerSnapShot: jest.fn(),
        getPlayerById: jest.fn(),
    };

    const mockBroadcastService = {
        emitToRoom: jest.fn(),
        emitToSocket: jest.fn(),
        emitPlayerMoved: jest.fn(),
        emitReachableCells: jest.fn(),
        emitCombatResult: jest.fn(),
        joinCombatRoom: jest.fn(),
        leaveCombatRoom: jest.fn(),
        emitToCombatRoom: jest.fn(),
    };

    const mockLogVirtualPlayerService = {};

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MatchService,
                { provide: PlayerService, useValue: mockPlayerService },
                { provide: BroadcastService, useValue: mockBroadcastService },
                { provide: LogVirtualPlayerService, useValue: mockLogVirtualPlayerService },
            ],
        }).compile();

        service = module.get<MatchService>(MatchService);
        jest.clearAllMocks();
    });

    it('Devrait exister', () => {
        expect(service).toBeDefined();
    });

    it('Devrait appeler requestCombat pour un combat existant', () => {
        const mockMatch = { requestCombat: jest.fn() };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.spyOn(service, 'getGameForSocket').mockReturnValue(mockMatch as any);
        const payload: RequestAttackPayload = { targetPlayerId: 'player2' };
        service.requestAttack('player1', payload);
        expect(mockMatch.requestCombat).toHaveBeenCalledWith('player1', payload);

    });

    it('Ne devrait pas appeler requestCombat si le match n\'existe pas', () => {
        jest.spyOn(service, 'getGameForSocket').mockReturnValue(undefined);
        expect(() => service.requestAttack('player1', { targetPlayerId: 'player2' })).not.toThrow();
    });

    it('Devrait appeler choosePosture si le match existe', () => {
        const mockMatch = { choosePosture: jest.fn() };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.spyOn(service, 'getGameForSocket').mockReturnValue(mockMatch as any);
        service.choosePosture('player1', Posture.Offensive);
        expect(mockMatch.choosePosture).toHaveBeenCalledWith('player1', Posture.Offensive);
    });

    it('Ne devrait pas appeler choosePosture si le match n\'existe pas', () => {
        jest.spyOn(service, 'getGameForSocket').mockReturnValue(undefined);
        expect(() => service.choosePosture('player1', Posture.Offensive)).not.toThrow();
    });

    it('Devrait appeler endTurn si le match existe', () => {
        const mockMatch = { endTurn: jest.fn() };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.spyOn(service, 'getGameForSocket').mockReturnValue(mockMatch as any);
        service.endTurn('player1');
        expect(mockMatch.endTurn).toHaveBeenCalledWith('player1');
    });

    it('Ne devrait pas appeler endTurn si le match n\'existe pas', () => {
        jest.spyOn(service, 'getGameForSocket').mockReturnValue(undefined);
        expect(() => service.endTurn('player1')).not.toThrow();
    });
});