import { HttpClient, HttpStatusCode } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { CloudinaryImage } from '@cloudinary/url-gen';
import { format, quality } from '@cloudinary/url-gen/actions/delivery';
import { thumbnail } from '@cloudinary/url-gen/actions/resize';
import { auto } from '@cloudinary/url-gen/qualifiers/format';
import { auto as qualityAuto } from '@cloudinary/url-gen/qualifiers/quality';
import { THUMBNAIL_SIZE } from '@common/constants/administration/administration.constants';
import { GameInterface } from '@common/interfaces/game-frontend/game-interface';
import { Subscription } from 'rxjs';
import { environment } from 'src/environments/environment';
import { GameSocketService } from '@app/services/socket/game/game-socket.service';


@Injectable({
    providedIn: 'root',
})
export class AdministrationService {
    private readonly baseUrl: string = environment.serverUrl;
    private subscriptions: Subscription[] = [];
    games = signal<GameInterface[]>([]);

    constructor(
        private readonly http: HttpClient,
        private readonly socketService: GameSocketService,
    ) {}

    async connect() {
        await this.socketService.connect();
        this.listenToSocketEvents();
    }

    disconnect() {
        this.subscriptions.forEach((s) => s.unsubscribe());
        this.subscriptions = [];
        this.socketService.disconnect();
    }

    private listenToSocketEvents(): void {
        this.subscriptions.push(
            this.socketService.onGameCreated()?.subscribe((newGame) => {
                this.games.update((currentList) => [...currentList, newGame]);
            }) ?? Subscription.EMPTY,

            this.socketService.onGameUpdated()?.subscribe((updatedGame) => {
                this.updateLocalGame(updatedGame);
            }) ?? Subscription.EMPTY,

            this.socketService.onGameVisibilityToggled()?.subscribe((updatedGameId) => {
                this.changeToggleStatus(updatedGameId);
            }) ?? Subscription.EMPTY,

            this.socketService.onGameDeleted()?.subscribe((deletedGameId) => {
                this.games.update((currentList) =>
                    currentList.filter((game) => game?._id !== deletedGameId),
                );
            }) ?? Subscription.EMPTY,
        );
    }

    private updateLocalGame(updatedGame: GameInterface): void {
        this.games.update((currentList) =>
            currentList.map((game) =>
                game._id === updatedGame._id ? updatedGame : game,
            ),
        );
    }

    private changeToggleStatus(gameId: string) {
        this.games.update((currentList) => currentList.map((game) => {
            if (game._id === gameId) {
                return { ...game, isVisible: !game.isVisible };
            }
            return game;
        }));
    }

    getGames(): void {
        this.http.get<GameInterface[]>(`${this.baseUrl}/game`).subscribe((data) =>
            this.games.set(data));
    }


    deleteGame(gameId: string): void {
        this.http.delete(`${this.baseUrl}/game/${gameId}`, { observe: 'response', responseType: 'text' }).subscribe((response) => {
            if (response.status === HttpStatusCode.Ok) {
                this.games.update((currentGames) => currentGames.filter((gameData) => gameData?._id !== gameId));
                this.socketService.sendDeletedGame(gameId);
            }
        });
    }

    getGameInTheList(gameId: string): GameInterface | undefined {
        return this.games().find((game) => game?._id === gameId);
    }

    searchGame(gameName: string): GameInterface[] {
        const copyGames = this.games();
        if (!copyGames) return [];
        return copyGames.filter((game) => game.name.toLowerCase().includes(gameName.toLowerCase()));
    }

    updateGameVisibility(gameId: string, isVisible: boolean): void {
        this.http.patch(`${this.baseUrl}/game/${gameId}/visibility`, {}, { observe: 'response', responseType: 'text' }).subscribe((response) => {
            if (response.status === HttpStatusCode.Ok) {
                this.games.update((currentGames) =>
                    currentGames.map((gameData) =>
                        gameData?._id === gameId ? { ...gameData, isVisible } : gameData,
                    ),
                );
                this.socketService.sendVisibilityToggled(gameId);
            }
        });
    }

    createQualityImage(publicId: string): string {
        return new CloudinaryImage(publicId, { cloudName: 'dsfcrlupx' })
            .delivery(format(auto()))
            .delivery(quality(qualityAuto()))
            .resize(thumbnail().width(THUMBNAIL_SIZE).height(THUMBNAIL_SIZE)).toURL();
    }

    getGame(gameId: string) {
        return this.http.get<GameInterface>(`${this.baseUrl}/game/${gameId}`);
    }


}
