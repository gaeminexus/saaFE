import { TestBed } from '@angular/core/testing';

import { DetalleCierreService } from './detalle-cierre.service';

describe('DetalleCierreService', () => {
  let service: DetalleCierreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DetalleCierreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
