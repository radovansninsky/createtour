
export class TourItem {

    constructor(
        public name: string,
        public dur: number = 0.0,
        public realDur: number = 0.0,
        public calcDur: number = 0.0,
        public lon: string = '',
        public lat: string = '',
        public alt: string = '',
        public head: string = '',
        public tilt: string = '',
        public range: string = '',
        public smooth: boolean = false,
        public when: Date = null,
        public waitTime: number = 0
    ) { }
}
