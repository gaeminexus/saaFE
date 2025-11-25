import { TestBed } from '@angular/core/testing';

import { DireccionTrabajoService } from './direccion-trabajo.service';

describe('DireccionTrabajoService', () => {
  let service: DireccionTrabajoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DireccionTrabajoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
