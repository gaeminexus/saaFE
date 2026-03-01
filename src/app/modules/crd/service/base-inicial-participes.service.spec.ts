import { TestBed } from '@angular/core/testing';

import { BaseInicialParticipesService } from './base-inicial-participes.service';

describe('BaseInicialParticipesService', () => {
  let service: BaseInicialParticipesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BaseInicialParticipesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
