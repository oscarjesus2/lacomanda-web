import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogReportecontableComponent } from './dialog-reportecontable.component';

describe('DialogReportecontableComponent', () => {
  let component: DialogReportecontableComponent;
  let fixture: ComponentFixture<DialogReportecontableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DialogReportecontableComponent]
    });
    fixture = TestBed.createComponent(DialogReportecontableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
