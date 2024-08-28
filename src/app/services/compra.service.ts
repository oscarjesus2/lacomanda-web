import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { environment } from 'src/environments/environment';
import { InformeContableCompraInterface} from '../interfaces/compras.interface';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class CompraService {

    private basePath = environment.apiUrl + '/compra/';

    constructor(private http: HttpClient) { }
  
    getInformeContable(fechaInicial: string, fechaFinal: string, idTipoDocumento: string): Observable<InformeContableCompraInterface[]> {
        return this.http.get<InformeContableCompraInterface[]>(this.basePath+ 'InformeContableCompra/' + fechaInicial + '/' + fechaFinal+ '/'  + idTipoDocumento);
    }

<<<<<<< HEAD
}
=======
}
>>>>>>> baf55da921f303e4c253134a43c0638b74959374
