import { isNullOrUndefined } from 'util';

import * as xmljs from 'xml-js';
import { Type, plainToClass } from 'class-transformer';

import { TourItem } from './tour-item';

class XmlEl {
    type: string;
    name: string;
    text: string;
    comment: string;
    @Type(() => XmlEl)
    elements: Array<XmlEl> = [];

    find(name: string): XmlEl {
        return this.elements.find(el => el.type === 'element' && el.name === name) || new XmlEl();
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
        return (this.elements[0] || new XmlEl()).text;
    }

    hasText() {
        return !isNullOrUndefined(this.text);
    }
}

export class KmlParser {

    name: string;
    items: TourItem[] = [];

    _start = new Date();

    get start() {
        return this._start;
    }

    set start(val: Date) {
        if (val < this._start) {
            this._start = val;
        }
    }

    parse(text: string) {
        const obj = plainToClass(XmlEl, xmljs.xml2js(text, { compact: false }));
        // console.log('Parsed object:', obj);

        const kmlnode = obj.find('kml');
        if (kmlnode.is('kml')) {
            if (!kmlnode.has('gx:Tour') && kmlnode.has('Document')) {
                this.name = kmlnode.find('Document').find('Folder').find('name').getListText();

                // try to find placemarks
                this.listAllPlacemarks(kmlnode).forEach(pm => this.handlePlacemark(pm));
            } else {
                this.name = kmlnode.find('gx:Tour').find('name').getListText();
                let idx = 0;
                let last: TourItem;
                let lastComment = '';
                kmlnode.find('gx:Tour').find('gx:Playlist').elements.forEach(el => {
                    console.log('Processing', el);
                    if (el.type === 'comment' && el.comment.trim().startsWith('name:')) {
                        lastComment = el.comment.replace(/name:/, '').trim();
                    } else if (el.is('gx:Wait') && last != null) {
                        last.waitTime = parseFloat(el.find('gx:duration').getListText());
                    } else if (el.is('gx:FlyTo')) {
                        const n = el.elements[0].type === 'comment' && el.elements[0].comment.trim().startsWith('name:') ?
                            el.elements[0].comment.replace(/name:/, '').trim() : lastComment !== '' ? lastComment : `Fly point ${idx}`;
                        const l = el.find('LookAt');
                        last = new TourItem(
                            n,
                            parseFloat(el.find('gx:duration').getListText()),
                            l.find('longitude').getListText(),
                            l.find('latitude').getListText(),
                            l.find('altitude').getListText(),
                            l.find('heading').getListText(),
                            l.find('tilt').getListText(),
                            l.find('range').getListText(),
                            el.has('gx:flyToMode') ? el.find('gx:flyToMode').getListText() === 'smooth' : true,
                            new Date()
                        );
                        if (l.has('gx:TimeSpan')) {
                            this.start = new Date(l.find('gx:TimeSpan').find('begin').getListText());
                            last.when = new Date(l.find('gx:TimeSpan').find('end').getListText());
                        } else if (l.has('TimeSpan')) {
                            this.start = new Date(l.find('TimeSpan').find('begin').getListText());
                            last.when = new Date(l.find('TimeSpan').find('end').getListText());
                        } else if (l.has('gx:TimeStamp')) {
                            last.when = new Date(l.find('gx:TimeStamp').find('when').getListText());
                        }
                        this.items.push(last);
                        lastComment = '';
                        idx++;
                    }
                });

            }
            if (this.items[0] && this.items[0].when == null) {
                this.items[0].when = this.start;
            }
        }
    }

    private listAllPlacemarks(el: XmlEl): Array<XmlEl> {
        let result = new Array<XmlEl>();

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

    private handlePlacemark(p: XmlEl) {
        // console.log('Handling placemark:', p);
        const l = p.find('LookAt');
        if (p.has('name') && p.has('LookAt')) {
            const i = new TourItem(
                p.find('name').getListText(),
                0,
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
                this.start = new Date(l.find('gx:TimeSpan').find('begin').getListText());
                i.when = new Date(l.find('gx:TimeSpan').find('end').getListText());
            } else if (l.has('gx:TimeStamp')) {
                i.when = new Date(l.find('gx:TimeStamp').find('when').getListText());
            }

            this.items.push(i);
        }
    }
}
