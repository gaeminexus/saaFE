import { TestBed } from '@angular/core/testing';

import { AporteService } from './aporte.service';

describe('AporteService', () => {
  let service: AporteService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AporteService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
