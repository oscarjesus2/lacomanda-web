import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogVentasgeneralesComponent } from './dialog-ventasgenerales.component';

describe('DialogVentasgeneralesComponent', () => {
  let component: DialogVentasgeneralesComponent;
  let fixture: ComponentFixture<DialogVentasgeneralesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DialogVentasgeneralesComponent]
    });
    fixture = TestBed.createComponent(DialogVentasgeneralesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
