import { TestBed } from '@angular/core/testing';

import { AporteAsoprepService } from './aporte-asoprep.service';

describe('AporteAsoprepService', () => {
  let service: AporteAsoprepService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AporteAsoprepService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
