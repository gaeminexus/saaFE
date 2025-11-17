import { TestBed } from '@angular/core/testing';

import { DireccionPersonaService } from './direccion-persona.service';

describe('DireccionPersonaService', () => {
  let service: DireccionPersonaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DireccionPersonaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
