import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if ('serviceWorker' in navigator && (environment.production)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/ngsw-worker.js').then(
      registration => {
        console.log('Service Worker registrado con éxito:', registration);
      },
      err => {
        console.error('Error al registrar el Service Worker:', err);
      }
    );
  });
}

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch(err => console.error(err));
