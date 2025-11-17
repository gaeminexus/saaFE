import { TestBed } from '@angular/core/testing';
import { MayorizacionCCService } from './mayorizacion-cc.service';


describe('MayorAnaliticoServicio', () => {
  let service: MayorizacionCCService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MayorizacionCCService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
