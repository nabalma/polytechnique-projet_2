import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TimerService {
  private readonly _remainingTime = signal<number>(0);

  readonly remainingTimeSignal = this._remainingTime.asReadonly();

  set remainingTime(value: number) {
    if (!Number.isFinite(value) || value < 0) return;
    this._remainingTime.set(value);
  }

  get remainingTime(): number {
    return this._remainingTime();
  }
}
