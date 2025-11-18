import { TestBed } from '@angular/core/testing';

import { ParticipeService } from './participe.service';

describe('ParticipeService', () => {
  let service: ParticipeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ParticipeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
