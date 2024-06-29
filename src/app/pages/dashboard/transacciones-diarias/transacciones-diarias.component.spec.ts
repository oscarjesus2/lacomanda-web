import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransaccionesDiariasComponent } from './transacciones-diarias.component';

describe('TransaccionesDiariasComponent', () => {
  let component: TransaccionesDiariasComponent;
  let fixture: ComponentFixture<TransaccionesDiariasComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TransaccionesDiariasComponent]
    });
    fixture = TestBed.createComponent(TransaccionesDiariasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
