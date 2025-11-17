import { TestBed } from '@angular/core/testing';

import { EstadoParticipeService } from './estado-participe.service';

describe('EstadoParticipeService', () => {
  let service: EstadoParticipeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EstadoParticipeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
