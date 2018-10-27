import { Component, OnInit } from '@angular/core';

import * as xmljs from 'xml-js';
import * as xmlbuilder from 'xmlbuilder';
import * as FileSaver from 'file-saver';

import { TourItem } from './model/tour-item';
import { isNullOrUndefined } from 'util';

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
    const obj = xmljs.xml2js(t, {compact: true});
    // console.log('Converted into object:', obj);
    this.name = this.findName(obj);
    const placemark = this.findPlacemark(obj);

    this.stop.setTime(0);
    let lastTs: Date;
    for (const p of placemark) {
      lastTs = this.handlePlacement(p, lastTs);
    }

    // Vyplnenie prazdnych datumov
    this.items.forEach(i => {
      if (isNullOrUndefined(i.when)) {
        i.when = new Date(this.start.getTime());
      }
    });
  }

  private findName(o: any): string {
    return o.kml && o.kml.Document && o.kml.Document.Folder && o.kml.Document.Folder.name && o.kml.Document.Folder.name._text;
  }

  findPlacemark(o: Object): Array<any> {
    let result = new Array();

    for (const prop in o) {
      if (prop === 'Placemark') {
        if (o[prop] instanceof Array) {
          result = result.concat(o[prop]);
        } else {
          result.push(o[prop]);
        }
      } else if (o[prop] instanceof Object) {
        const r2 = this.findPlacemark(o[prop]);
        if (r2.length > 0) {
          result = result.concat(r2);
        }
      }
    }
    return result;
  }

  handlePlacement(p: any, lastTs?: Date): Date {
    console.log('Handling placemark:', p);
    if (p.hasOwnProperty('name') && p.hasOwnProperty('LookAt')) {
      const i = new TourItem(
        p.name._text,
        p.LookAt.longitude._text,
        p.LookAt.latitude._text,
        p.LookAt.altitude._text,
        p.LookAt.heading._text,
        p.LookAt.tilt._text,
        p.LookAt.range._text,
        true
      );

      if (p.LookAt.hasOwnProperty('gx:TimeSpan')) {
        const s = new Date(p.LookAt['gx:TimeSpan'].begin._text);
        if (s.getTime() < this.start.getTime()) {
          console.log('Setting new start', s, 'over old', this.start);
          this.start = s;
        }
        i.when = new Date(p.LookAt['gx:TimeSpan'].end._text);
        if (i.when.getTime() > this.stop.getTime()) {
          console.log('Setting new stop', i.when, 'over old', this.stop);
          this.stop = i.when;
        }
      } else if (p.LookAt.hasOwnProperty('gx:TimeStamp')) {
        i.when = new Date(p.LookAt['gx:TimeStamp'].when._text);
        if (i.when.getTime() > this.stop.getTime()) {
          this.stop = i.when;
        }
      }
      if (!isNullOrUndefined(lastTs) && isNullOrUndefined(i.when)) {
        i.when = new Date(lastTs.getTime());
        i.dur = (i.when.getTime() - lastTs.getTime()) / 1000;
      }

      this.items.push(i);

      return i.when;
    }
    return null;
  }

  clear() {
    this.items.length = 0;
    this.start = new Date();
    this.stop = new Date();
  }

  exportTour() {
    console.log('Exporting tour ...');
    const root = xmlbuilder.create('kml')
    .att('xmlns', 'http://www.opengis.net/kml/2.2')
    .att('xmlns:gx', 'http://www.google.com/kml/ext/2.2')
    .att('xmlns:kml', 'http://www.opengis.net/kml/2.2')
    .att('xmlns:atom', 'http://www.w3.org/2005/Atom')
      .ele('gx:Tour')
        .ele('name', 'Unknown').up()
        .ele('gx:Playlist');

    this.items.forEach(i => this.buildTourItem(root, i));

    root
      .up() // Playlist
      .up(); // Tour

    // https://jsfiddle.net/UselessCode/qm5AG/
    // console.log(root.end({pretty: true}));
    const blob = new Blob([root.end({ pretty: true })], { type: 'text/plain;charset=utf-8' });
    FileSaver.saveAs(blob, 'export.kml');
  }

  buildTourItem(root, i: TourItem) {
    const endTs = new Date();
    endTs.setTime(i.when.getTime());

    root
      .ele('gx:FlyTo')
        .ele('gx:duration', i.dur).up()
        .ele('gx:flyToMode', i.smooth ? 'smooth' : 'bounce').up()
        .ele('LookAt')
          .ele('gx:TimeSpan')
            .ele('begin', this.start.toISOString()).up()
            .ele('end', endTs.toISOString()).up()
          .up()
          .ele('longitude', i.lon).up()
          .ele('latitude', i.lat).up()
          .ele('altitude', i.alt).up()
          .ele('heading', i.head).up()
          .ele('tilt', i.tilt).up()
          .ele('range', i.range).up()
          .ele('gx:altitudeMode', 'relativeToSeaFloor').up()
        .up()
      .up();

    if (i.waitTime > 0) {
      root
      .ele('gx:Wait')
        .ele('gx:duration', i.waitTime).up()
      .up();
    }
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
