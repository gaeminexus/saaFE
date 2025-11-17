import { TestBed } from '@angular/core/testing';

import { MayorAnaliticoServicio } from './mayor-analitico.service';

describe('MayorAnaliticoServicio', () => {
  let service: MayorAnaliticoServicio;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MayorAnaliticoServicio);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
