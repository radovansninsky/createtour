import { Injectable } from '@angular/core';

import * as xmlbuilder from 'xmlbuilder';
import * as FileSaver from 'file-saver';

import { TourItem } from './model/tour-item';

@Injectable({
  providedIn: 'root'
})
export class KmlService {

  constructor() { }

  import() {
  }

  export(items: TourItem[]) {
    console.log('Exporting tour ...');
    const root = xmlbuilder.create('kml')
    .att('xmlns', 'http://www.opengis.net/kml/2.2')
    .att('xmlns:gx', 'http://www.google.com/kml/ext/2.2')
    .att('xmlns:kml', 'http://www.opengis.net/kml/2.2')
    .att('xmlns:atom', 'http://www.w3.org/2005/Atom')
      .ele('gx:Tour')
        .ele('name', 'Unknown').up()
        .ele('gx:Playlist');

    const start = items[0] && items[0].when;
    items.forEach(i => this.buildTourItem(root, start, i));

    root
      .up() // Playlist
      .up(); // Tour

    const blob = new Blob([root.end({ pretty: true })], { type: 'text/plain;charset=utf-8' });
    FileSaver.saveAs(blob, 'export.kml');
  }

  private buildTourItem(root, start: Date, i: TourItem) {
    const endTs = new Date();
    endTs.setTime(i.when.getTime());

    root
      .ele('gx:FlyTo')
        .ele('gx:duration', i.dur).up()
        .ele('gx:flyToMode', i.smooth ? 'smooth' : 'bounce').up()
        .ele('LookAt')
          .ele('gx:TimeSpan')
            .ele('begin', start.toISOString()).up()
            .ele('end', endTs.toISOString()).up()
          .up() // TimeSpan
          .ele('longitude', i.lon).up()
          .ele('latitude', i.lat).up()
          .ele('altitude', i.alt).up()
          .ele('heading', i.head).up()
          .ele('tilt', i.tilt).up()
          .ele('range', i.range).up()
          .ele('gx:altitudeMode', 'relativeToSeaFloor').up()
        .up() // LookAt
      .up(); // FlyTo

    if (i.waitTime > 0) {
      root
      .ele('gx:Wait')
        .ele('gx:duration', i.waitTime).up()
      .up(); // Wait
    }
  }
}
