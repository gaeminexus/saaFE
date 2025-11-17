import { TestBed } from '@angular/core/testing';

import { MatchCuentaService } from './match-cuenta.service';

describe('MatchCuentaService', () => {
  let service: MatchCuentaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MatchCuentaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
