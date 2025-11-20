import { TestBed } from '@angular/core/testing';

import { NivelEstudioService } from './nivel-estudio.service';

describe('NivelEstudioService', () => {
  let service: NivelEstudioService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NivelEstudioService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
