import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HorasPicoComponent } from './horas-pico.component';

describe('HorasPicoComponent', () => {
  let component: HorasPicoComponent;
  let fixture: ComponentFixture<HorasPicoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [HorasPicoComponent]
    });
    fixture = TestBed.createComponent(HorasPicoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
