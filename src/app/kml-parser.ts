import { isNullOrUndefined } from 'util';

import * as xmljs from 'xml-js';
import { Type, plainToClass } from 'class-transformer';

import { TourItem } from './model/tour-item';

class El {
    type: string;
    name: string;
    text: string;
    @Type(() => El)
    elements: Array<El> = [];

    find(name: string): El {
        return this.elements.find(el => el.type === 'element' && el.name === name) || new El();
    }

    has(name: string): boolean {
        return this.elements.find(el => el.type === 'element' && el.name === name) !== undefined;
    }

    is(name: string): boolean {
        return this.name === name;
    }

    isNode(): boolean {
        return this.elements.length > 0;
    }

    isList(): boolean {
        return !this.isNode();
    }

    getListText() {
        return (this.elements[0] || new El()).text;
    }

    hasText() {
        return !isNullOrUndefined(this.text);
    }
}

export class KmlParser {

    name: string;
    start: Date = new Date();
    stop: Date = new Date(0);
    items: TourItem[] = [];

    parse(text: string) {
        const obj = plainToClass(El, xmljs.xml2js(text, { compact: false }));
        console.log('Parsed object:', obj);

        if (obj.find('kml').is('kml')) {
            // const kmlnode = obj.elements[0].elements[0];

            this.name = obj.find('kml').find('Document').find('Folder').find('name').getListText();

            // try to find placemarks
            this.listAllPlacemarks(obj.find('kml')).forEach(pm => this.handlePlacemark(pm));

            // try to find tour
            // todo parsovat tour
        }
    }

    private listAllPlacemarks(el: El): Array<El> {
        let result = new Array<El>();

        // console.log('Processing', el);
        if (el.is('Placemark')) {
            result.push(el);
        } else if (el.isNode()) {
            el.elements.forEach(el1 => {
                const r2 = this.listAllPlacemarks(el1);
                if (r2.length > 0) {
                    result = result.concat(r2);
                }
            });
        }
        return result;
    }

    private handlePlacemark(p: El): Date {
        console.log('Handling placemark:', p);
        const l = p.find('LookAt');
        if (p.has('name') && p.has('LookAt')) {
            const i = new TourItem(
                p.find('name').getListText(),
                l.find('longitude').getListText(),
                l.find('latitude').getListText(),
                l.find('altitude').getListText(),
                l.find('heading').getListText(),
                l.find('tilt').getListText(),
                l.find('range').getListText(),
                true
            );
            // console.log('Tour item:', i);

            if (l.has('gx:TimeSpan')) {
                const s = new Date(l.find('gx:TimeSpan').find('begin').getListText());
                if (s.getTime() < this.start.getTime()) {
                    // console.log('Setting new start', s, 'over old', this.start);
                    this.start = s;
                }
                i.when = new Date(l.find('gx:TimeSpan').find('end').getListText());
                if (i.when.getTime() > this.stop.getTime()) {
                    // console.log('Setting new stop', i.when, 'over old', this.stop);
                    this.stop = i.when;
                }
            } else if (l.has('gx:TimeStamp')) {
                i.when = new Date(l.find('gx:TimeStamp').find('when').getListText());
                if (i.when.getTime() > this.stop.getTime()) {
                    this.stop = i.when;
                }
            }

            this.items.push(i);

            return i.when;
        }
        return null;
    }
}
