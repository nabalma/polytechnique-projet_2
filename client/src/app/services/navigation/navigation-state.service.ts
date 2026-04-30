import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class NavigationStateService {
    private previousUrl: string | null = null;
    private currentUrl: string = '/home';

    constructor(private readonly router: Router) {
        this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => {
            this.previousUrl = this.currentUrl;
            this.currentUrl = (event as NavigationEnd).urlAfterRedirects;
        });
    }

    getPreviousUrl(): string | null {
        return this.previousUrl;
    }

    getState<T>(): T {
        return window.history.state as T;
    }

    getFromLocalStorage<T>(key: string): T | null {
        const stored = localStorage.getItem(key);
        return stored ? (JSON.parse(stored) as T) : null;
    }
}
