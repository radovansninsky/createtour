import { TestBed } from '@angular/core/testing';

import { KmlService } from './kml.service';

describe('KmlService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: KmlService = TestBed.get(KmlService);
    expect(service).toBeTruthy();
  });
});
