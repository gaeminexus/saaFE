import { TestBed } from '@angular/core/testing';

import { TelefonoDireccionService } from './telefono-direccion.service';

describe('TelefonoDireccionService', () => {
  let service: TelefonoDireccionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TelefonoDireccionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
