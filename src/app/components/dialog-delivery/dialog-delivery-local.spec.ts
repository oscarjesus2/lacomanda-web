import { FormBuilder } from '@angular/forms';
import { DialogDeliveryComponent } from './dialog-delivery.component';

describe('Diálogo de delivery con la copia local', () => {
  function abrir(precio?: number) {
    const dialogo = { close: jasmine.createSpy() };
    const data = {
      IdTurno: 8, SociosNegocio: [{ IdSocioNegocio: 4, Descripcion: 'Plataforma' }],
      copiaLocal: {
        clientes: [{ IdCliente: 31, Item: 2, NombresDelivery: 'Ana', DireccionDelivery: 'Parque 11', PrecioDelivery: precio }],
        productos: [{ IdProducto: 3, EsCargoDelivery: true, PreciosSocio: [{ IdSocioNegocio: 4, Precio: 5 }] }],
      },
    };
    // Cualquier llamada al API online fallaría en esta prueba.
    const componente = new DialogDeliveryComponent(dialogo as any, data as any, new FormBuilder(), null, null);
    return { dialogo, componente };
  }

  it('busca la dirección sincronizada y conserva su tarifa al abrir el pedido', async () => {
    const { componente, dialogo } = abrir(2.5);
    await componente.seleccionarModalidad('TELEFONO');
    componente.termino = 'parque';
    await componente.buscar();
    await componente.seleccionar(componente.clientes[0]);
    await componente.guardarYContinuar();
    expect(dialogo.close).toHaveBeenCalledWith(jasmine.objectContaining({
      Cliente: jasmine.objectContaining({ IdCliente: 31, Item: 2, PrecioDelivery: 2.5 }),
      ProductoCargoDelivery: jasmine.objectContaining({ IdProducto: 3 }),
    }));
  });

  it('pide actualizar una copia antigua que no guarda la tarifa del destino', async () => {
    const { componente, dialogo } = abrir();
    await componente.seleccionarModalidad('TELEFONO');
    await componente.seleccionar(componente.clientes[0]);
    await componente.guardarYContinuar();
    expect(dialogo.close).not.toHaveBeenCalled();
  });

  it('usa los precios del socio de negocio sin consultar la red', async () => {
    const { componente, dialogo } = abrir();
    await componente.seleccionarModalidad('SOCIO_NEGOCIO');
    componente.usarClienteVarios();
    await componente.continuarPorSocio();
    expect(dialogo.close).toHaveBeenCalledWith(jasmine.objectContaining({
      PreciosSocioNegocio: [{ IdProducto: 3, Precio: 5 }],
    }));
  });
});
