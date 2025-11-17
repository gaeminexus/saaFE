import { TestBed } from '@angular/core/testing';

import { TipoViviendaService } from './tipo-vivienda.service';

describe('TipoViviendaService', () => {
  let service: TipoViviendaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TipoViviendaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
