import { TestBed } from '@angular/core/testing';

import { DetalleTurnoService } from './detalle-turno.service';

describe('DetalleTurnoService', () => {
  let service: DetalleTurnoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DetalleTurnoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
