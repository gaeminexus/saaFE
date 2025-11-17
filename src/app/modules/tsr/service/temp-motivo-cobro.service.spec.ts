import { TestBed } from '@angular/core/testing';

import { TempMotivoCobroService } from './temp-motivo-cobro.service';

describe('TempMotivoCobroService', () => {
  let service: TempMotivoCobroService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TempMotivoCobroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
