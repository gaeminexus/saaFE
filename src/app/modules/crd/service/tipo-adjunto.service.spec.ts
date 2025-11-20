import { TestBed } from '@angular/core/testing';

import { TipoAdjuntoService } from './tipo-adjunto.service';

describe('TipoAdjuntoService', () => {
  let service: TipoAdjuntoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TipoAdjuntoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
