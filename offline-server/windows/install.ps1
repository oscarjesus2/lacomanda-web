[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)][string]$ConfigFile,
    [string]$PackageDir = $PSScriptRoot
)

$ErrorActionPreference = 'Stop'
$PackageDir = (Resolve-Path -LiteralPath $PackageDir).Path
$ConfigFile = (Resolve-Path -LiteralPath $ConfigFile).Path
$raiz = Join-Path $env:LOCALAPPDATA 'LaComanda\Caja'
$versiones = Join-Path $raiz 'versiones'
$configGuardada = Join-Path $raiz 'configuracion.json'
$archivoProceso = Join-Path $raiz 'proceso.txt'
$archivoLog = Join-Path $raiz 'arranque.log'

function Obtener-VersionPaquete {
    # Permite repetir la instalacion del mismo paquete sin duplicar node.exe.
    $partes = foreach ($carpeta in 'runtime', 'src', 'windows') {
        Get-ChildItem -LiteralPath (Join-Path $PackageDir $carpeta) -Recurse -File |
            Sort-Object FullName | ForEach-Object {
                $_.FullName.Substring($PackageDir.Length) + ':' + (Get-FileHash -LiteralPath $_.FullName).Hash
            }
    }
    $sha = [Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [Text.Encoding]::UTF8.GetBytes(($partes -join "`n"))
        return [BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-', '').ToLowerInvariant()
    } finally { $sha.Dispose() }
}

function Obtener-ProcesoInstalado {
    if (!(Test-Path -LiteralPath $archivoProceso -PathType Leaf)) { return }
    $texto = [IO.File]::ReadAllText($archivoProceso)
    $numero = 0
    if (![int]::TryParse($texto, [ref]$numero) -or $numero -le 0) { return }
    $proceso = Get-Process -Id $numero -ErrorAction SilentlyContinue
    if ($proceso -and $proceso.Path -and $proceso.Path.StartsWith($versiones + '\', [StringComparison]::OrdinalIgnoreCase) -and
        $proceso.Path.EndsWith('\runtime\node.exe', [StringComparison]::OrdinalIgnoreCase)) {
        return $proceso
    }
}

function Leer-Estado {
    $puerto = if ($previa.opcionesLocales.LACOMANDA_OFFLINE_PORT) { [int]$previa.opcionesLocales.LACOMANDA_OFFLINE_PORT }
              elseif ($env:LACOMANDA_OFFLINE_PORT) { [int]$env:LACOMANDA_OFFLINE_PORT } else { 17861 }
    $peticion = [Net.HttpWebRequest]::Create("http://127.0.0.1:$puerto/api/estado")
    $peticion.Proxy = $null
    $peticion.AllowAutoRedirect = $false
    $peticion.Timeout = 2000
    $peticion.ReadWriteTimeout = 2000
    $peticion.Headers['Origin'] = $entrada.origen
    $respuesta = $peticion.GetResponse()
    try {
        if ([int]$respuesta.StatusCode -ne 200 -or $respuesta.Headers['Access-Control-Allow-Origin'] -cne $entrada.origen) {
            throw 'La respuesta recibida no corresponde al servidor de esta caja.'
        }
        $lector = New-Object IO.StreamReader($respuesta.GetResponseStream())
        try { $estado = $lector.ReadToEnd() | ConvertFrom-Json } finally { $lector.Dispose() }
        if ($estado.disponible -isnot [bool] -or !$estado.mensaje -or
            $estado.identidad.tenantId -ine $entrada.tenantId -or
            $estado.identidad.identificadorEstacion -cne $entrada.identificadorEstacion) {
            throw 'El servicio no devolvio el estado de la sucursal y estacion que se esta instalando.'
        }
        return $estado
    } finally { $respuesta.Dispose() }
}

function Registrar-InicioDeSesion([string]$version) {
    # Inicio del usuario actual. El acceso directo no requiere una tarea elevada
    # ni una ventana de terminal abierta para mantener el proceso.
    $inicio = [Environment]::GetFolderPath('Startup')
    if (!$inicio) { throw 'Windows no ha facilitado la carpeta Inicio de este usuario.' }
    [IO.Directory]::CreateDirectory($inicio) | Out-Null
    $rutaAcceso = Join-Path $inicio 'La Comanda - Caja.lnk'
    $shell = New-Object -ComObject WScript.Shell
    $acceso = $shell.CreateShortcut($rutaAcceso)
    try {
        $acceso.TargetPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
        $acceso.WorkingDirectory = $version
        $acceso.Arguments = '-NoProfile -NonInteractive -WindowStyle Hidden -Command "Start-Process -FilePath .\runtime\node.exe -ArgumentList ''--use-system-ca windows/iniciar.mjs'' -WorkingDirectory (Get-Location).Path -WindowStyle Hidden"'
        $acceso.Description = 'Inicia el servicio de caja de La Comanda para este usuario de Windows.'
        $acceso.Save()
    } finally {
        [void][Runtime.InteropServices.Marshal]::ReleaseComObject($acceso)
        [void][Runtime.InteropServices.Marshal]::ReleaseComObject($shell)
    }
}

$ejecutable = Join-Path $PackageDir 'runtime\node.exe'
$programa = Join-Path $PackageDir 'windows\iniciar.mjs'
& $ejecutable --use-system-ca $programa --validar $ConfigFile
if ($LASTEXITCODE -ne 0) { throw 'El paquete o la configuracion de caja no es valido para este equipo.' }
$entrada = Get-Content -LiteralPath $ConfigFile -Raw -Encoding UTF8 | ConvertFrom-Json
if (!$PSCmdlet.ShouldProcess($raiz, 'Instalar La Comanda para el usuario actual e iniciar la caja')) { return }
[IO.Directory]::CreateDirectory($versiones) | Out-Null
$bloqueo = [IO.File]::Open((Join-Path $raiz 'instalacion.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
try {
    if (Test-Path -LiteralPath $configGuardada) {
        $previa = Get-Content -LiteralPath $configGuardada -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($previa.tenantId -ine $entrada.tenantId -or $previa.identificadorEstacion -cne $entrada.identificadorEstacion -or
            $previa.apiUrl.TrimEnd('/') -cne $entrada.apiUrl.TrimEnd('/') -or $previa.origen -cne $entrada.origen) {
            throw 'Ya existe una caja de otra sucursal, estacion o entorno en este perfil de Windows. Se conserva su configuracion y su diario.'
        }
    }

    $version = Join-Path $versiones (Obtener-VersionPaquete)
    if (!(Test-Path -LiteralPath $version -PathType Container)) {
        $temporal = Join-Path $versiones ('.instalando-' + [Guid]::NewGuid().ToString('N'))
        [IO.Directory]::CreateDirectory($temporal) | Out-Null
        foreach ($carpeta in 'runtime', 'src', 'windows') {
            Copy-Item -LiteralPath (Join-Path $PackageDir $carpeta) -Destination $temporal -Recurse
        }
        [IO.Directory]::Move($temporal, $version)
    }
    if (!(Test-Path -LiteralPath $configGuardada)) {
        $temporalConfig = Join-Path $raiz ([Guid]::NewGuid().ToString('N') + '.tmp')
        # Datos del navegador y ajustes locales de Windows tienen origenes separados.
        $config = $entrada | Select-Object tenantId, identificadorEstacion, apiUrl, origen
        $locales = @{}
        foreach ($nombre in 'DATA_DIR', 'HOST', 'PORT', 'TLS_CERT', 'TLS_KEY', 'TLS_PORT', 'ORIGINS') {
            $clave = "LACOMANDA_OFFLINE_$nombre"
            $valor = [Environment]::GetEnvironmentVariable($clave)
            if ($valor) { $locales[$clave] = $valor }
        }
        $config | Add-Member -NotePropertyName opcionesLocales -NotePropertyValue $locales
        $config = $config | ConvertTo-Json
        [IO.File]::WriteAllText($temporalConfig, $config, [Text.UTF8Encoding]::new($false))
        [IO.File]::Move($temporalConfig, $configGuardada)
    }

    $proceso = Obtener-ProcesoInstalado
    if (!$proceso) {
        $proceso = Start-Process -FilePath (Join-Path $version 'runtime\node.exe') -WorkingDirectory $version `
            -ArgumentList @('--use-system-ca', 'windows/iniciar.mjs') -WindowStyle Hidden -PassThru
        $limite = [DateTime]::UtcNow.AddSeconds(45)
        while ([DateTime]::UtcNow -lt $limite -and !$proceso.HasExited) {
            if ((Obtener-ProcesoInstalado).Id -eq $proceso.Id) { break }
            Start-Sleep -Milliseconds 250
        }
        if ($proceso.HasExited -or (Obtener-ProcesoInstalado).Id -ne $proceso.Id) {
            $detalle = if (Test-Path -LiteralPath $archivoLog) { Get-Content -LiteralPath $archivoLog -Tail 1 -Encoding UTF8 }
            throw "El servicio de esta estacion no ha confirmado el arranque. $detalle Registro: $archivoLog"
        }
    }
    $estado = Leer-Estado
    Registrar-InicioDeSesion $version
    Write-Host ('Caja instalada para ' + $env:USERNAME + '. ' + $estado.mensaje)
    if ($proceso.Path -ine (Join-Path $version 'runtime\node.exe')) {
        Write-Host 'La version actual sigue atendiendo pedidos. La actualizacion se abrira en el proximo inicio de sesion de Windows.'
    }
} finally { $bloqueo.Dispose() }
