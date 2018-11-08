import { Component, OnInit } from '@angular/core';

import { TourItem } from './tour-item';
import { KmlParser } from './kml-parser';
import { KmlService } from './kml.service';
import { isNullOrUndefined, isUndefined, isObject } from 'util';

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

      if (k.items.length > 0) {
        if  (isNullOrUndefined(this.name)) {
          this.name = k.name;
        }
        k.items.forEach(ni => {
          const oi = this.items.find(i => i.name === ni.name);
          if (!isUndefined(oi)) {
            oi.dur = ni.dur;
            oi.lon = ni.lon;
            oi.lat = ni.lat;
            oi.alt = ni.alt;
            oi.head = ni.head;
            oi.tilt = ni.tilt;
            oi.range = ni.range;
            oi.when = ni.when;
          } else {
            this.items.push(ni);
          }
        });


        // nastavenie casu ak uplne chyba
        let lastTime = this.start;
        this.items.forEach(ti => {
          ti.when = ti.when == null ? new Date(lastTime.getTime()) : ti.when;
          lastTime = ti.when;
        });
        this.recalc();
      }
    } catch (error) {
      console.error('Error occured while parsing clipboard text (probably not xml), detail:', error.message);
    }
  }

  recalc() {
    this.items.sort((a, b) => a.when < b.when ? -1 : 1);
    let lastTime = this.start;
    const speeds = [];
    this.items.forEach(ti => {
      ti.realDur = ((ti.when.getTime() - lastTime.getTime()) / 1000);
      ti.calcDur = ti.realDur / this.speed;
      if (ti.calcDur > 0 && ti.calcDur !== NaN) {
        speeds.push(((ti.when.getTime() - lastTime.getTime()) / 1000) / ti.calcDur);
      }
      lastTime = ti.when;
    });
    if (speeds.length > 0) {
      this.speed = Math.round(Math.round(speeds.reduce((sum, v) => sum + v)) / speeds.length * 10) / 10;
    }
  }

  exportTour() {
    this.kmlService.export(this.items, this.name);
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
      // this.recalc();
    }
  }
}
