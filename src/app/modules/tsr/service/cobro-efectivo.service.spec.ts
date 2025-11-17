import { TestBed } from '@angular/core/testing';

import { CobroEfectivoService } from './cobro-efectivo.service';

describe('CobroEfectivoService', () => {
  let service: CobroEfectivoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CobroEfectivoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
