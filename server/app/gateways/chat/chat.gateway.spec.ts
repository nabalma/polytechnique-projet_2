/* eslint-disable max-lines-per-function -- On désactive cette règle parce que ce fichier de test regroupe plusieurs scénarios dans un même bloc principal. */
import { DELAY_BEFORE_EMITTING_TIME } from '@app/constants/chat.constants';
import { ChatGateway } from '@app/gateways/chat/chat.gateway';
import { MESSAGE_TOO_LONG_LENGTH } from '@common/constants/chat/chat.constants';
import { ChatMessage } from '@common/interfaces/chat/chat-message-interface';
import { ChatEvents } from '@common/socket_event/chat/chat.gateway.events';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SinonStubbedInstance, createStubInstance, match } from 'sinon';
import { BroadcastOperator, Server, Socket } from 'socket.io';

describe('ChatGateway', () => {
    let gateway: ChatGateway;
    let logger: SinonStubbedInstance<Logger>;
    let socket: SinonStubbedInstance<Socket>;
    let server: SinonStubbedInstance<Server>;

    beforeEach(async () => {
        logger = createStubInstance(Logger);
        socket = createStubInstance<Socket>(Socket);
        server = createStubInstance<Server>(Server);
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ChatGateway,
                {
                    provide: Logger,
                    useValue: logger,
                },
            ],
        }).compile();

        gateway = module.get<ChatGateway>(ChatGateway);
        gateway['server'] = server;
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });

    it('joinRoom() should join the socket room with the given gameId', () => {
        gateway.joinRoom(socket, 'game-123');
        expect(socket.join.calledWith('game-123')).toBeTruthy();
    });

    it('sendMessage() should emit NewMessage to the game room', () => {
        const message: ChatMessage = { author: 'Alice', content: 'Bonjour', gameId: 'game-123', timestamp: '2026-01-10' };
        server.to.returns({
            emit: (event: string) => {
                expect(event).toEqual(ChatEvents.NewMessage);
            },
        } as BroadcastOperator<unknown, unknown>);

        gateway.sendMessage(socket, message);
        expect(server.to.calledWith('game-123')).toBeTruthy();
    });

    it('sendMessage() should not send if message exceeds 200 characters', () => {
        const message: ChatMessage = { author: 'Alice', content: 'X'.repeat(MESSAGE_TOO_LONG_LENGTH), gameId: 'game-123', timestamp: '20:30:01' };
        gateway.sendMessage(socket, message);
        expect(server.to.called).toBeFalsy();
    });

    it('sendMessage() should not send if content is empty', () => {
        const message: ChatMessage = { author: 'Alice', content: '', gameId: 'game-123', timestamp: '20:30:01' };
        gateway.sendMessage(socket, message);
        expect(server.to.called).toBeFalsy();
    });

    it('sendMessage() should not send if player has abandoned the game', () => {
        gateway.leaveRoom(socket);
        const message: ChatMessage = { author: 'Alice', content: 'Bonjour', gameId: 'game-123', timestamp: '20:30:01' };
        gateway.sendMessage(socket, message);
        expect(server.to.called).toBeFalsy();
    });

    it('sendMessage() should include a timestamp in HH:MM:SS format', () => {
        const message: ChatMessage = { author: 'Alice', content: 'Bonjour', gameId: 'game-123', timestamp: '20:30:01' };
        let capturedMessage: ChatMessage | undefined;
        server.to.returns({
            emit: (_: string, data: ChatMessage) => {
                capturedMessage = data;
            },
        } as BroadcastOperator<unknown, unknown>);

        gateway.sendMessage(socket, message);
        expect(capturedMessage?.timestamp).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    it('leaveRoom() should prevent the player from sending messages', () => {
        gateway.leaveRoom(socket);
        expect(gateway['leftPlayers'].has(socket.id)).toBeTruthy();
    });

    it('afterInit() should emit time after 1s', () => {
        jest.useFakeTimers();
        gateway.afterInit();
        jest.advanceTimersByTime(DELAY_BEFORE_EMITTING_TIME);
        expect(server.emit.calledWith(ChatEvents.Clock, match.any)).toBeTruthy();
    });

    it('hello message should be sent on connection', () => {
        gateway.handleConnection(socket);
        expect(socket.emit.calledWith(ChatEvents.Hello, match.any)).toBeTruthy();
    });

    it('socket disconnection should be logged', () => {
        gateway.handleDisconnect(socket);
        expect(logger.log.calledOnce).toBeTruthy();
    });

    it('handleDisconnect() should remove the player from leftPlayers', () => {
        gateway.leaveRoom(socket);
        gateway.handleDisconnect(socket);
        expect(gateway['leftPlayers'].has(socket.id)).toBeFalsy();
    });
});
