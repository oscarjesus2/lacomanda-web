import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogMCantComponent } from './dialog-mcant.component';

describe('DialogMCantComponent', () => {
  let component: DialogMCantComponent;
  let fixture: ComponentFixture<DialogMCantComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DialogMCantComponent]
    });
    fixture = TestBed.createComponent(DialogMCantComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
