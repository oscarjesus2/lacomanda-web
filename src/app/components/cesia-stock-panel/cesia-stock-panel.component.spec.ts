import { CommonModule } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { BehaviorSubject } from 'rxjs';
import { CesiaStockService, EstadoCesiaStock } from 'src/app/services/cesia-stock.service';
import { CesiaStockPanelComponent } from './cesia-stock-panel.component';

@Pipe({ name: 'tenantText' })
class TextoPruebaPipe implements PipeTransform {
  transform(key: string): string { return key; }
}

describe('CesiaStockPanelComponent', () => {
  let estado: BehaviorSubject<EstadoCesiaStock>;
  let fixture: ComponentFixture<CesiaStockPanelComponent>;
  const dialog = { open: jasmine.createSpy('open') };
  const consulta = () => ({
    GeneradoUtc: '2026-10-15T18:00:00Z', HorasProyeccion: 4, HorasObservacion: 2,
    ArticulosEvaluados: 4, ConsumosSinConfiguracion: 0,
    Alertas: Array.from({ length: 4 }, (_, i) => ({
      Clave: `${i}:1`, Tipo: 'STOCK_BAJO' as const, IdArticulo: i, Articulo: `Arroz ${i}`,
      Unidad: 'kg', StockRegistrado: 10, ConsumoPendiente: 6, StockEstimado: 4,
      StockMinimo: 5, ConsumoPorHora: null, HorasHastaAgotamiento: null,
    })),
  });

  beforeEach(async () => {
    estado = new BehaviorSubject<EstadoCesiaStock>({ habilitado: true, error: false, consulta: consulta() });
    await TestBed.configureTestingModule({
      imports: [CommonModule, MatIconModule],
      declarations: [CesiaStockPanelComponent, TextoPruebaPipe],
      providers: [
        { provide: CesiaStockService, useValue: { estado$: estado.asObservable() } },
        { provide: MatDialog, useValue: dialog },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CesiaStockPanelComponent);
    fixture.detectChanges();
  });

  it('muestra evidencias y permite consultar todas las alertas', () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('article').length).toBe(3);
    expect(element.textContent).toContain('cesiaStockCommitted');
    expect(element.textContent).toContain('cesiaStockNoForecast');
    element.querySelector<HTMLButtonElement>('.cesia-stock__more')!.click();
    fixture.detectChanges();
    expect(element.querySelectorAll('article').length).toBe(4);
  });

  it('no muestra una afirmación de ausencia de alertas cuando falla la consulta', () => {
    estado.next({ habilitado: true, error: true, consulta: { ...consulta(), Alertas: [] } });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('cesiaStockUnavailable');
    expect(fixture.nativeElement.textContent).not.toContain('cesiaStockNoAlerts');
  });

  it('retira la tarjeta y sus datos cuando se pierde el acceso', () => {
    estado.next({ habilitado: false, error: false, consulta: null });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('section')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Arroz');
  });

  it('abre la consulta de existencias desde Revisar almacén', () => {
    fixture.nativeElement.querySelector('.cesia-stock__action').click();
    expect(dialog.open).toHaveBeenCalled();
  });
});
