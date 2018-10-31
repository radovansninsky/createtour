import { Component, OnInit } from '@angular/core';

import * as xmljs from 'xml-js';

import { TourItem } from './model/tour-item';
import { KmlParser } from './kml-parser';
import { KmlService } from './kml.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  name: string;
  start: Date = new Date();
  stop: Date = new Date();
  speed = 1.0;
  items: TourItem[] = [];

  constructor(private kmlService: KmlService) {}

  get duration(): string {
    const d = new Date(this.stop.getTime() - this.start.getTime());
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}:` +
      `${String(d.getUTCSeconds()).padStart(2, '0')}`;
  }

  set duration(val: string) {
    const d = Date.parse(`${val}Z`);
    this.stop.setTime(this.start.getTime() + d);
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
      this.name = k.name;
      this.items.push(...k.items);
      this.start = k.start;
      this.stop = k.stop;
    } catch (error) {
      console.error('Error occured while parsing clipboard text (probably not xml), detail:', error.message);
    }
  }

  exportTour() {
    this.kmlService.export(this.items);
  }

  clear() {
    this.items.length = 0;
    this.start = new Date();
    this.stop = new Date();
  }

  setTimestamp(newTs: string, item: TourItem) {
    const d = Date.parse(this.start.toISOString().slice(0, 11) + newTs);
    const i = this.items.indexOf(item);
    const prevWhen = i > 0 ? this.items[i - 1].when : this.start;

    if (d !== NaN) {
      if (i === 0) {
        item.when.setTime(d);
        if (d < this.start.getTime()) {
          this.start = new Date(d);
        }
      } else if (d > prevWhen.getTime()) {
        item.when.setTime(d);
      } else {
        item.when.setTime(prevWhen.getTime());
      }

      item.recalculate(prevWhen);
    }
  }

  calcDuration(newSpeed: number, item: TourItem) {
    item.speed = newSpeed;
    // item.dur = item.lastItemDur / item.speed;
  }

  calcSpeed(newDur: number, item: TourItem) {
    item.dur = newDur;
    // item.speed = item.lastItemDur / item.dur;
  }
}
