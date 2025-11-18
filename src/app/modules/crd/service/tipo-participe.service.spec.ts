import { TestBed } from '@angular/core/testing';

import { TipoParticipeService } from './tipo-participe.service';

describe('TipoParticipeService', () => {
  let service: TipoParticipeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TipoParticipeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
