import { TestBed } from '@angular/core/testing';

import { PlanCuentaService } from './plan-cuenta.service';

describe('PlanCuentaService', () => {
  let service: PlanCuentaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PlanCuentaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
