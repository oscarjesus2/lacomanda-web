import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { environment } from 'src/environments/environment';
import { InformeContableCompra} from '../interfaces/compras.interface';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class CompraService {

    private basePath = environment.apiUrl + '/compra/';

    constructor(private http: HttpClient) { }
  
    getInformeContable(fechaInicial: string, fechaFinal: string, idTipoDocumento: string): Observable<InformeContableCompra[]> {
        return this.http.get<InformeContableCompra[]>(this.basePath+ 'InformeContableCompra/' + fechaInicial + '/' + fechaFinal+ '/'  + idTipoDocumento);
    }
}