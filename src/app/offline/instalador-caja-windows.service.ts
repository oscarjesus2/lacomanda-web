import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from 'src/environments/environment';
import { EstacionTipoEnum } from '../enums/enum';
import { DispositivoTipoEnum } from '../models/device.models';
import { isJwtActive } from '../services/auth/token.utils';
import { DeviceCapabilitiesService } from '../services/device-capabilities.service';
import { DeviceIdentifierService } from '../services/device-identifier.service';
import { EstacionService } from '../services/estacion.service';
import { StorageService } from '../services/storage.service';

interface IdentidadInstalador {
  tenantId: string;
  identificadorEstacion: string;
}

interface ConfiguracionInstalador extends IdentidadInstalador {
  apiUrl: string;
  origen: string;
}

const carpetaPaquete = '/assets/caja-windows';
export const nombreInstalador = 'Instalar-La-Comanda-Caja.cmd';

/** El CMD contiene exclusivamente la configuración de esta estación y el hash del paquete publicado. */
export function generarInstaladorCaja(configuracion: ConfiguracionInstalador, sha256: string): string {
  if (typeof sha256 !== 'string' || !/^[a-f\d]{64}$/i.test(sha256)) {
    throw new Error('El paquete de instalación de caja no tiene una huella válida.');
  }
  const bytes = new TextEncoder().encode(JSON.stringify({
    tenantId: configuracion.tenantId, identificadorEstacion: configuracion.identificadorEstacion,
    apiUrl: configuracion.apiUrl, origen: configuracion.origen,
  }));
  const datos = btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''));
  const codigo = [
    "$ErrorActionPreference='Stop'",
    "$temporal=(Resolve-Path -LiteralPath ([IO.Path]::GetTempPath())).ProviderPath",
    "$nombre='LaComanda-Caja-'+[guid]::NewGuid().ToString('N')",
    "$carpeta=Join-Path $temporal $nombre",
    "$creada=$false",
    "try { $null=New-Item -ItemType Directory -Path $carpeta; $creada=$true",
    "$config=Join-Path $carpeta 'caja.json'",
    "[IO.File]::WriteAllBytes($config,[Convert]::FromBase64String($env:LACOMANDA_CONFIG_INSTALACION))",
    "$origen=(Get-Content -LiteralPath $config -Raw -Encoding UTF8 | ConvertFrom-Json).origen",
    "$zip=Join-Path $carpeta 'caja.zip'",
    "Write-Host 'Descargando La Comanda Caja...'",
    `Invoke-WebRequest -UseBasicParsing -MaximumRedirection 0 -Uri ($origen+'${carpetaPaquete}/caja-windows-x64.zip') -OutFile $zip`,
    `if ((Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash -ne '${sha256}') { throw 'El paquete ha cambiado. Descarga un instalador nuevo desde La Comanda.' }`,
    "$extraido=Join-Path $carpeta 'paquete'",
    "Expand-Archive -LiteralPath $zip -DestinationPath $extraido",
    "& (Join-Path $extraido 'install.ps1') -PackageDir $extraido -ConfigFile $config",
    "} catch { Write-Host $_.Exception.Message -ForegroundColor Red; exit 1 } finally { if ($creada) { " +
      "$elemento=Get-Item -LiteralPath $carpeta; " +
      "if ($elemento.FullName -eq [IO.Path]::GetFullPath($carpeta) -and $elemento.Parent.FullName.TrimEnd([IO.Path]::DirectorySeparatorChar) -eq $temporal.TrimEnd([IO.Path]::DirectorySeparatorChar) " +
      "-and $elemento.Name -eq $nombre -and -not ($elemento.Attributes -band [IO.FileAttributes]::ReparsePoint)) { " +
      "Remove-Item -LiteralPath $elemento.FullName -Recurse -Force } } }",
  ].join('; ');
  return [
    '@echo off', 'setlocal DisableDelayedExpansion', 'title Instalar La Comanda Caja',
    'set "LACOMANDA_CONFIG_INSTALACION=' + datos + '"',
    '"%SystemRoot%\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy RemoteSigned -Command "' + codigo + '"',
    'if errorlevel 1 goto fallo', 'echo Caja instalada. Vuelve a La Comanda y comprueba la conexion.',
    'pause', 'exit /b 0', ':fallo', 'echo No se pudo instalar la caja. Revisa el mensaje anterior.',
    'pause', 'exit /b 1', '',
  ].join('\r\n');
}

@Injectable({ providedIn: 'root' })
export class InstaladorCajaWindowsService {
  private readonly archivos: HttpClient;

  constructor(backend: HttpBackend, private readonly storage: StorageService,
    private readonly dispositivo: DeviceIdentifierService, private readonly capacidades: DeviceCapabilitiesService,
    private readonly estaciones: EstacionService) {
    // El interceptor añade el token de caja. El manifiesto es un recurso estático público.
    this.archivos = new HttpClient(backend);
  }

  get esWindows(): boolean { return this.capacidades.getDeviceType() === DispositivoTipoEnum.PC_WINDOWS; }

  get identidad(): IdentidadInstalador | undefined {
    const sesion = this.storage.getCurrentSession();
    const identificador = this.dispositivo.getIdentifier();
    if (!this.esWindows || !isJwtActive(sesion?.Token) || !sesion.TenantID?.trim()
        || sesion.User?.TipoCompu !== EstacionTipoEnum.CAJA || !identificador || sesion.Ip !== identificador) return;
    return { tenantId: sesion.TenantID.trim(), identificadorEstacion: identificador };
  }

  async descargar(): Promise<IdentidadInstalador> {
    const origen = window.location.origin;
    const identidad = this.identidad;
    if (!identidad) throw new Error('Inicia sesión online en la estación de caja vinculada.');
    const respuesta = await firstValueFrom(this.estaciones.getAll().pipe(timeout(10000))).catch(() => {
      throw new Error('No se pudo comprobar la vinculación de esta estación con la nube. Revisa tu sesión y la conexión.');
    });
    if (!respuesta.Success || !respuesta.Data?.some(e => e.Tipo === EstacionTipoEnum.CAJA && e.IdCaja > 0
        && e.IdentificadorUnico === identidad.identificadorEstacion)) {
      throw new Error('Este equipo ya no está vinculado como caja en esta sucursal.');
    }
    let manifiesto: { sha256: string };
    try {
      manifiesto = await firstValueFrom(this.archivos.get<{ sha256: string }>(carpetaPaquete + '/manifiesto.json',
        { params: { 'ngsw-bypass': 'true' } }).pipe(timeout(15000)));
    } catch {
      throw new Error('No se pudo obtener el paquete de instalación. Comprueba la conexión y vuelve a intentarlo.');
    }
    const actual = this.identidad;
    if (actual?.tenantId !== identidad.tenantId || actual.identificadorEstacion !== identidad.identificadorEstacion) {
      throw new Error('La sesión o la estación ha cambiado. Vuelve a descargar el instalador.');
    }
    const contenido = generarInstaladorCaja({ ...identidad, apiUrl: environment.apiUrl, origen }, manifiesto?.sha256);
    const url = URL.createObjectURL(new Blob([contenido], { type: 'application/octet-stream' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreInstalador;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return identidad;
  }
}
