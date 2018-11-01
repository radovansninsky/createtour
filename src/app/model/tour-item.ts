
export class TourItem {

    private _speed: number;
    private _dur: number;

    constructor(
        public name: string,
        dur: number = 0.0,
        public lon: string = '',
        public lat: string = '',
        public alt: string = '',
        public head: string = '',
        public tilt: string = '',
        public range: string = '',
        public smooth: boolean = false,
        public when: Date = null,
        public waitTime: number = 0
    ) {
        this._dur = dur;
    }

    get whenAsString(): string {
        return this.when && this.when.toISOString();
    }

    set whenAsString(val: string) {
        if (this.when == null) {
            this.when = new Date();
        }
        this.when.setTime(Date.parse(val));
    }

    get speed(): number {
        return this._speed;
    }

    set speed(val: number) {
        this._dur = this._speed * this._dur / val;
        this._speed = val;
    }

    get dur(): number {
        return this._dur;
    }

    set dur(val: number) {
        this._speed = this._dur * this._speed / val;
        this._dur = val;
    }

    recalculate(prevWhen: Date, speed: number) {
        const dur = (this.when.getTime() - prevWhen.getTime()) / 1000;
        this._dur = dur / speed;
    }
}
