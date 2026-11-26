import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { CajaOfflineSesionService } from './caja-offline-sesion.service';
import { CajaOfflineSincronizacionService } from './caja-offline-sincronizacion.service';

@Component({
  standalone: true,
  selector: 'app-caja-offline',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './caja-offline.component.html',
})
export class CajaOfflineComponent implements OnInit, OnDestroy {
  private seguimientoInstalacion?: Subscription;
  private destruido = false;

  constructor(readonly sesion: CajaOfflineSesionService, private readonly router: Router,
    private readonly sincronizacion: CajaOfflineSincronizacionService, private readonly ruta: ActivatedRoute) {}

  async ngOnInit(): Promise<void> {
    this.seguimientoInstalacion = this.sincronizacion.instalacionPreparada$.subscribe(() => {
      if (this.sesion.esEquipoCaja && !this.sesion.usuario) void this.sesion.conectar();
    });
    if (this.sesion.usuario) await this.sesion.refrescar();
    else await this.sesion.conectar();
    if (this.destruido) return;
    if (this.ruta.snapshot.queryParamMap.get('regularizar') === '1') {
      await this.abrirVentasOnline(true);
      return;
    }
    if (this.sesion.usuario) return;
    if (!this.destruido && this.ruta.snapshot.queryParamMap.get('usarSesion') === '1'
        && this.sesion.estado?.disponible && this.sesion.nube === false) await this.entrar(true);
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.seguimientoInstalacion?.unsubscribe();
  }

  async entrar(usarSesionActual = false): Promise<void> {
    await this.sesion.entrar(usarSesionActual);
    if (!this.destruido && this.sesion.activa) await this.router.navigateByUrl(this.sesion.rutaVenta);
  }

  async abrirVentasOnline(trasLogin = false): Promise<void> {
    let destino: Awaited<ReturnType<CajaOfflineSesionService['prepararRegresoOnline']>>;
    try {
      destino = await this.sesion.prepararRegresoOnline(trasLogin);
    } catch {
      // El estado y el motivo siguen visibles en gestión para revisar o reintentar.
      return;
    }
    if (this.destruido) return;
    this.sesion.salir();
    if (destino.requiereLogin) await this.router.navigate(['/iniciar-sesion'], { queryParams: { returnUrl: destino.returnUrl } });
    else await this.router.navigateByUrl(destino.ruta);
  }

  cambiarUsuario(): void {
    this.sesion.salir();
    void this.sesion.conectar();
  }
}
