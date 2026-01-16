import { TestBed } from '@angular/core/testing';

import { ParticipeAsoprepService } from './participe-asoprep.service';

describe('ParticipeAsoprepService', () => {
  let service: ParticipeAsoprepService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ParticipeAsoprepService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
