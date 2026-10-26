import { EstacionTipoEnum, NivelUsuarioEnum } from '../../enums/enum';
import { HeaderComponent } from './header.component';

describe('HeaderComponent - opción Preparación', () => {
  function crear(tipo: EstacionTipoEnum, habilitada = true): HeaderComponent {
    const componente = Object.create(HeaderComponent.prototype) as HeaderComponent;
    Object.assign(componente, {
      storageService: { getCurrentUser: () => ({ IdNivel: NivelUsuarioEnum.Administrador, TipoCompu: tipo }) },
      operacionPreparacionHabilitada: habilitada,
      router: { navigateByUrl: jasmine.createSpy('navigateByUrl') },
      textCatalog: { get: () => 'Preparación' },
    });
    (componente as any).calcMenuVisibility();
    return componente;
  }

  it('muestra Preparación para su estación y permite volver desde Administración', () => {
    const componente = crear(EstacionTipoEnum.COCINA);
    expect(componente.showPreparacion).toBeTrue();
    componente.Preparacion();
    expect((componente as any).router.navigateByUrl).toHaveBeenCalledWith('/preparacion');
  });

  it('respeta el tipo de estación y la licencia', () => {
    expect(crear(EstacionTipoEnum.CAJA).showPreparacion).toBeFalse();
    expect(crear(EstacionTipoEnum.MOZO).showPreparacion).toBeFalse();
    expect(crear(EstacionTipoEnum.COCINA, false).showPreparacion).toBeFalse();
  });
});
