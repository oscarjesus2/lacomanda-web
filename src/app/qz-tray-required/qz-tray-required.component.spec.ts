import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QzTrayRequiredComponent } from './qz-tray-required.component';

describe('QzTrayRequiredComponent', () => {
  let component: QzTrayRequiredComponent;
  let fixture: ComponentFixture<QzTrayRequiredComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [QzTrayRequiredComponent]
    });
    fixture = TestBed.createComponent(QzTrayRequiredComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
