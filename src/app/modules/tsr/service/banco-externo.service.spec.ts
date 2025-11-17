import { TestBed } from '@angular/core/testing';

import { BancoExternoService } from './banco-externo.service';

describe('BancoExternoService', () => {
  let service: BancoExternoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BancoExternoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
