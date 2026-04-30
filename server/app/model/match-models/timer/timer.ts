export class Timer {
    private startTime: number;
    private duration: number;
    private idInterval: NodeJS.Timeout;
    private readonly tickInterval = 250;
    private readonly tickDelay = 1000;
    private timeOut: () => void;
    private remainingAtPause: number | null = null;

    constructor(private sendTick: (seconds: number) => void) {}

    start(seconds: number, callback: () => void) {
        clearInterval(this.idInterval);
        this.timeOut = callback;
        this.duration = seconds;
        this.startTime = Date.now();
        this.idInterval = setInterval(() => this.tick(), this.tickInterval);
        this.idInterval.unref();
    }


    pause(): void {
        if (this.remainingAtPause !== null) return;
        const elapsed = Math.floor((Date.now() - this.startTime) / this.tickDelay);
        this.remainingAtPause = this.duration - elapsed;
        clearInterval(this.idInterval);
    }

    resume(): void {
        if (this.remainingAtPause === null) return;
        this.duration = this.remainingAtPause;
        this.startTime = Date.now();
        this.remainingAtPause = null;
        this.idInterval = setInterval(() => this.tick(), this.tickInterval);
    }

    private tick() {
        const elapsed = Math.floor((Date.now() - this.startTime) / this.tickDelay);
        const remaining = this.duration - elapsed;
        if (remaining <= 0) {
            this.sendTick(0);
            this.stop();
            this.timeOut();
            return;
        }

        this.sendTick(remaining);
    }

    stop() {
        clearInterval(this.idInterval);
        this.remainingAtPause = null;
    }
}