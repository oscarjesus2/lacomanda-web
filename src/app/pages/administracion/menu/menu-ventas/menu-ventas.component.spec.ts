import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MenuVentasComponent } from './menu-ventas.component';

describe('MenuVentasComponent', () => {
  let component: MenuVentasComponent;
  let fixture: ComponentFixture<MenuVentasComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MenuVentasComponent]
    });
    fixture = TestBed.createComponent(MenuVentasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
