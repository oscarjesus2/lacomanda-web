# Servicio local de contingencia

El proceso Node de la computadora de caja conserva los maestros, pedidos, cobros pendientes y comandas de la sucursal en su disco local. Los dispositivos del personal acceden por la API de caja. Una segunda instancia no puede abrir el mismo directorio.

## Instalar desde La Comanda en una caja Windows

Con internet, abre La Comanda en el PC Windows de 64 bits vinculado como estación de caja e inicia sesión en la sucursal. En **Caja sin conexión**, pulsa **Descargar instalador de caja** y abre el archivo descargado desde Windows. Hazlo con el usuario de Windows que atenderá la caja.

La descarga incorpora la sucursal y el identificador del equipo. Al ejecutarse, obtiene el paquete de la misma aplicación, verifica su integridad e instala el servicio con su propia copia de Node. Arranca en ese momento y en los siguientes inicios de sesión del usuario. Mantén la PWA abierta y la sesión online activa durante la primera copia. La pantalla de caja indica cuándo está preparada para operar.

El programa y su configuración quedan en `%LOCALAPPDATA%\LaComanda\Caja`. La reinstalación en la misma estación conserva el diario de operaciones. Si vas a habilitar móviles en la red del restaurante, consulta la configuración HTTPS de la LAN más abajo.

## Ejecutar desde el código fuente

### Preparar el paquete descargable

Los comandos `npm start`, `npm run build` y `npm run watch` de `lacomanda-web` preparan el instalador. Con Angular ya iniciado, `npm run caja:paquete` regenera el ZIP y su manifiesto después de editar el servicio. La compilación descarga Node.js para Windows x64 desde el archivo oficial de Node.js y verifica su SHA-256. En un equipo de desarrollo sin acceso a ese archivo, `LACOMANDA_NODE_WINDOWS` puede apuntar a una copia de la misma versión y firma reconocida por el empaquetador. En Linux y macOS se utiliza Python 3 para crear el ZIP. La imagen Docker de compilación ya lo incluye.

### Desarrollo con Angular en localhost:4200

En el ordenador de caja, abre una terminal en `lacomanda-web` y ejecuta `npm run caja:local`. Introduce la sucursal (tenant) y el identificador de la estación registrada. Mantén abierta esa terminal mientras haces la prueba. También puedes pasar ambos valores como argumentos: `npm run caja:local -- "mi-tenant" "mi-estacion"`.

Este comando apunta a la API de desarrollo de `https://localhost:7285/api` y permite el navegador de desarrollo en el puerto 4200. Guarda los datos de cada caja en un directorio de desarrollo propio. Angular puede estar ejecutándose en Docker. Cuando aparezca «Servicio de caja iniciado», abre `http://127.0.0.1:17861/api/estado` desde el ordenador de caja. Una caja nueva indica que necesita sincronizarse. Con sesión online en esa estación, pulsa **Actualizar copia desde la nube**.

### Configuración manual del servidor

Se necesita Node.js 22 o superior. Desde la carpeta `offline-server`, configura los valores propios de la sucursal y ejecuta el servicio. Este ejemplo utiliza dominios de muestra.

```powershell
$env:LACOMANDA_OFFLINE_DATA_DIR = 'C:\LaComanda\Caja01'
$env:LACOMANDA_OFFLINE_TENANT = 'mi-sucursal'
$env:LACOMANDA_OFFLINE_ESTACION = 'identificador-unico-de-caja'
$env:LACOMANDA_OFFLINE_API_URL = 'https://api.example.org/api'
$env:LACOMANDA_OFFLINE_ORIGINS = 'https://mi-restaurante.example.org'
$env:LACOMANDA_OFFLINE_ENABLED = 'true'
npm start
```

El identificador de estación es el de la caja registrada en La Comanda. La carpeta debe ser absoluta, local y exclusiva de esa caja. El proceso comprueba la unidad y sus enlaces antes de abrir los archivos. Guarda la identidad de la sucursal y de la estación para impedir la reutilización accidental del directorio bajo otra configuración. Una carpeta antigua con datos debe contener una instantánea que permita verificar esa identidad.

`LACOMANDA_OFFLINE_API_URL` corresponde a la raíz HTTPS de la API, incluido el prefijo `/api`. `LACOMANDA_OFFLINE_ORIGINS` admite orígenes exactos de la aplicación separados por comas. La operación está desactivada de forma predeterminada. Puede prepararse la copia antes de activar `LACOMANDA_OFFLINE_ENABLED`.

## Acceso desde la red del restaurante

La aplicación de la computadora de caja utiliza `http://127.0.0.1:17861`. Para atender dispositivos de la LAN, configura un segundo puerto HTTPS y un certificado cuyo nombre coincida con la dirección de la caja y que los dispositivos reconozcan.

```powershell
$env:LACOMANDA_OFFLINE_HOST = '192.168.1.20'
$env:LACOMANDA_OFFLINE_TLS_CERT = 'C:\LaComanda\certificados\caja-cert.pem'
$env:LACOMANDA_OFFLINE_TLS_KEY = 'C:\LaComanda\certificados\caja-key.pem'
$env:LACOMANDA_OFFLINE_TLS_PORT = '17862'
npm start
```

Por ejemplo, si el certificado cubre `caja.restaurante.example.org` y ese nombre resuelve a la dirección local del ejemplo, los móviles usan `https://caja.restaurante.example.org:17862`. Restringe el puerto al segmento de red del personal. La selección de usuario identifica al operador sin contraseña, por lo que el control de acceso de los equipos depende de esa red. Las peticiones del navegador requieren un origen de la lista configurada.

## Operación

1. Con internet, abre la aplicación en cada equipo del personal antes del primer corte y deja que la PWA prepare su copia para ese navegador. En la estación de caja, con sesión abierta, entra en **Turno → Caja sin conexión** y pulsa **Actualizar copia desde la nube**. El servicio comprueba la sucursal y la estación antes de publicar la copia.
2. Si se corta internet, puedes entrar de inmediato desde el menú **Turno** o desde el inicio de sesión. Tras cinco minutos de caída, la pantalla de ventas también ofrece el acceso en un aviso. Elige un usuario sincronizado y pulsa **Entrar en caja**. La disponibilidad depende de la caja, el turno abierto, los usuarios, el catálogo y las impresoras guardadas.
3. Mantén abierta la pantalla de contingencia de caja con QZ Tray para procesar las comandas de todos los dispositivos. Si un envío quedó en curso, revisa la impresora antes de decidir si corresponde reimprimirlo. Si cerraste el navegador y ya volvió Internet, abre **Caja sin conexión**, selecciona tu usuario y pulsa **Revisar operaciones pendientes** para recuperar la cola. Las anulaciones y descuentos que requieren aprobación se confirman en caja con el usuario autorizado.
4. Con la aplicación abierta en la caja preparada y una sesión online válida de esa estación, el navegador intenta regularizar al recuperar la red y cada cinco minutos. También puedes hacerlo desde la pantalla de caja. Si se pierde la respuesta, el reintento conserva el identificador y el contenido del lote. El cursor avanza cuando llega el acuse completo. Después se actualiza la copia de maestros.

La entrega de correos de comprobantes pendientes se reintenta con semántica de al menos una vez. Un fallo después de que el proveedor acepte el mensaje y antes de guardar la confirmación puede producir un correo duplicado.

Cada lote nuevo envía las operaciones originales y las referencias a los registros afectados. Las copias completas de mesas, cuentas y planes de impresión se conservan en el diario de caja para su recuperación. Un lote pendiente de una versión anterior conserva su cuerpo original en cada reintento, incluso después de actualizar o reiniciar el servicio.

| Petición local | Resultado |
| --- | --- |
| `GET /api/estado` | Disponibilidad, versión, contexto de caja y capacidades. |
| `POST /api/sincronizar` | Obtiene y publica una instantánea completa. |
| `POST /api/regularizar` | Reintenta el lote activo o envía las operaciones pendientes. |
| `GET /api/usuarios` y `GET /api/usuarios/{id}` | Selección entre usuarios activos de la copia. |
| `GET /api/maestros/{nombre}` | Datos del maestro y versión. |
| `GET /api/pedidos` y `GET /api/pedidos/{referencia}` | Consulta de cuentas y versiones para detectar ediciones concurrentes. |
| `GET /api/operaciones/{uuid}?idUsuario={id}` | Comprueba si el diario registró el envío de ese operador. Devuelve tipo y referencia. Una ausencia permite volver a comprobar o reintentar con el mismo UUID. |
| `POST /api/pedidos`, `POST /api/pedidos/modificar` y `POST /api/cobros` | Operaciones que se registran en el diario. |

Las peticiones a `sincronizar` y `regularizar` se realizan por la interfaz de loopback de caja, con JSON `{}`, origen permitido y `Authorization: Bearer <token de sesión>`. La credencial solo se usa durante la petición. Node la envía a la API HTTPS especificada en su configuración. Los eventos y las marcas de confirmación se guardan en UTC.

Ejecuta la suite local con `npm test`.
