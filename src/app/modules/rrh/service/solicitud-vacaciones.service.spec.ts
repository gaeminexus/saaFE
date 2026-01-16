import { TestBed } from '@angular/core/testing';

import { SolicitudVacacionesService } from './solicitud-vacaciones.service';

describe('SolicitudVacacionesService', () => {
  let service: SolicitudVacacionesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SolicitudVacacionesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
