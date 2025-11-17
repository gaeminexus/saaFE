import { TestBed } from '@angular/core/testing';

import { DetallePlantillaService } from './detalle-plantilla.service';

describe('DetallePlantillaService', () => {
  let service: DetallePlantillaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DetallePlantillaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
