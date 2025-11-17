import { TestBed } from '@angular/core/testing';

import { TipoHidrocarburificaService } from './tipo-hidrocarburifica.service';

describe('TipoHidrocarburificaService', () => {
  let service: TipoHidrocarburificaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TipoHidrocarburificaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
