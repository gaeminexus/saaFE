import { TestBed } from '@angular/core/testing';

import { MotivoCobroService } from './motivo-cobro.service';

describe('MotivoCobroService', () => {
  let service: MotivoCobroService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MotivoCobroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
