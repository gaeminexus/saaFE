import { TestBed } from '@angular/core/testing';

import { TipoGeneroService } from './tipo-genero.service';

describe('TipoGeneroService', () => {
  let service: TipoGeneroService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TipoGeneroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
