import { TestBed } from '@angular/core/testing';

import { DetalleLiquidacionService } from './detalle-liquidacion.service';

describe('DetalleLiquidacionService', () => {
  let service: DetalleLiquidacionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DetalleLiquidacionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
