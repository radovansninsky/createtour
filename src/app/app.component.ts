import { Component, OnInit } from '@angular/core';

import { TourItem } from './tour-item';
import { KmlParser } from './kml-parser';
import { KmlService } from './kml.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  name: string;
  speed = 1.0;
  items: TourItem[] = [];

  constructor(private kmlService: KmlService) {}

  get start(): Date {
    return this.items.length > 0 ? this.items[0].when  : new Date();
  }

  get stop(): Date {
    return this.items.length > 0 ? this.items[this.items.length - 1].when  : new Date();
  }

  get duration(): string {
    const d = new Date(this.stop.getTime() - this.start.getTime());
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}:` +
      `${String(d.getUTCSeconds()).padStart(2, '0')}`;
  }

  set duration(val: string) {
    const d = Date.parse(`${val}Z`);
    this.stop.setTime(this.start.getTime() + d);
  }

  get flyDuration(): string {
    const d = new Date((this.stop.getTime() - this.start.getTime()) / this.speed);
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}:` +
      `${String(d.getUTCSeconds()).padStart(2, '0')}`;
  }

  ngOnInit() {
  }

  processClipboard(t: string): void {
    // console.log('New clipboard text:', t);
    try {
      const k = new KmlParser();
      k.parse(t);
      console.log(k.items);

      // todo zistit ci pridat alebo replacovat
      this.clear();
      if (k.items.length > 0) {
        this.name = k.name;
        this.items.push(...k.items);

        let lastTime = this.items[0].when;
        const speeds = [];
        this.items.forEach(ti => {
          ti.when = ti.when == null ? new Date(lastTime.getTime()) : ti.when;
          ti.dur = ti.dur === 0 ? ((ti.when.getTime() - lastTime.getTime()) / 1000) / this.speed : ti.dur;
          if (ti.dur > 0 && ti.dur !== NaN) {
            speeds.push(((ti.when.getTime() - lastTime.getTime()) / 1000) / ti.dur);
          }
          lastTime = ti.when;
        });
        if (speeds.length > 0) {
          this.speed = Math.round(Math.round(speeds.reduce((sum, v) => sum + v)) / speeds.length * 10) / 10;
        }
      }
    } catch (error) {
      console.error('Error occured while parsing clipboard text (probably not xml), detail:', error.message);
    }
  }

  recalculate() {
    let lastTime = this.start;
    const speeds = [];
    this.items.forEach(ti => {
      ti.dur = ((ti.when.getTime() - lastTime.getTime()) / 1000) / this.speed;
      if (ti.dur > 0 && ti.dur !== NaN) {
        speeds.push(((ti.when.getTime() - lastTime.getTime()) / 1000) / ti.dur);
      }
      lastTime = ti.when;
    });
    if (speeds.length > 0) {
      this.speed = Math.round(Math.round(speeds.reduce((sum, v) => sum + v)) / speeds.length * 10) / 10;
    }
  }

  exportTour() {
    this.kmlService.export(this.items);
  }

  clear() {
    this.items.length = 0;
    this.name = '';
    this.speed = 1.0;
  }

  setTimestamp(newTs: string, item: TourItem) {
    const s = this.start.toISOString().slice(0, 11) + newTs;
    const i = this.items.indexOf(item);
    const d = Date.parse(s);

    if (!isNaN(d)) {
      if (i > 0) {
        if (d > this.items[i - 1].when.getTime()) {
          item.when = new Date(d);
        }
      } else {
        item.when = new Date(d);
      }
      // todo call recalculate
    }
  }

  calcSpeed(newDur: number, item: TourItem) {
    item.dur = newDur;
    // item.speed = item.lastItemDur / item.dur;
  }
}
