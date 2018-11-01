import { Component, OnInit } from '@angular/core';

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
      this.name = k.name;
      this.items.push(...k.items);
      this.start = k.start;

      this.stop = new Date(0);
      let lastTime = this.start;
      this.items.forEach(ti => {
        if (ti.when == null) {
          ti.when = new Date(lastTime.getTime());
        }
        lastTime = ti.when;

        if (ti.when > this.stop) {
          this.stop.setTime(ti.when.getTime());
        }
      });

      this.recalculate();

    } catch (error) {
      console.error('Error occured while parsing clipboard text (probably not xml), detail:', error.message);
    }
  }

  recalculate() {
    if (this.items.length === 0) {
      return;
    }
    let lastTime = this.items[0].when;
    this.items.forEach(ti => {
      ti.recalculate(lastTime, this.speed);
      lastTime = ti.when;
    });
  }

  exportTour() {
    this.kmlService.export(this.items);
  }

  clear() {
    this.items.length = 0;
    this.start = new Date();
    this.stop = new Date();
    this.name = '';
    this.speed = 1.0;
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

      this.recalculate();
    }
  }

  calcSpeed(newDur: number, item: TourItem) {
    item.dur = newDur;
    // item.speed = item.lastItemDur / item.dur;
  }
}
