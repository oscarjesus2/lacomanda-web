import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogDescuentoComponent } from './dialog-descuento.component';

describe('DialogDescuentoComponent', () => {
  let component: DialogDescuentoComponent;
  let fixture: ComponentFixture<DialogDescuentoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DialogDescuentoComponent]
    });
    fixture = TestBed.createComponent(DialogDescuentoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
