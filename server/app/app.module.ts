import { ChatGateway } from '@app/gateways/chat/chat.gateway';
import { GameGateway } from '@app/gateways/game/game.gateway';
import { CTFMatchGateway } from '@app/gateways/match/ctf/ctf-match.gateway';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';
import { GameController } from './controllers/game/game.controller';
import { LogGateWay } from './gateways/match-logs/logs.gateway';
import { BroadcastService } from './gateways/match/broadcast/broadcast.gateway';
import { MatchGateway } from './gateways/match/match.gateway';
import { PlayerGateway } from './gateways/player/player.gateway';
import { WaitingRoomGateway } from './gateways/waiting-room/waiting-room.gateway';
import { Game, gameSchema } from './model/schema/game/game';
import { CharacterCreationService } from './services/character-creation/character-creation.service';
import { GameService } from './services/game/game.service';
import { GameValidatorService } from './services/game/validation/game-validator.service';
import { JoinRoomService } from './services/join-waiting-room/join-game.service';
import { MatchCTFService } from './services/match/ctf/match-ctf.service';
import { MatchService } from './services/match/match-session/match.service';
import { PlayerService } from './services/match/player/player.service';
import { LogVirtualPlayerService } from './services/virtual-log/virtual-log.service';
import { VirtualPlayerService } from './services/waiting-room/virtual-player.service';
import { WaitingRoomService } from './services/waiting-room/waiting-room.service';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (config: ConfigService) => ({
                uri: config.get<string>('DATABASE_CONNECTION_STRING'),
            }),
        }),
        MongooseModule.forFeature([{ name: Game.name, schema: gameSchema }]),
        EventEmitterModule.forRoot({
            wildcard: true,
            delimiter: '.',
        }),
    ],

    controllers: [GameController],
    providers: [
        WaitingRoomGateway,
        MatchService,
        MatchCTFService,
        ChatGateway,
        GameGateway,
        LogGateWay,
        Logger,
        GameService,
        WaitingRoomService,
        VirtualPlayerService,
        GameValidatorService,
        PlayerGateway,
        PlayerService,
        MatchGateway,
        CTFMatchGateway,
        BroadcastService,
        JoinRoomService,
        CharacterCreationService,
        LogVirtualPlayerService,
    ],
})
export class AppModule {}
