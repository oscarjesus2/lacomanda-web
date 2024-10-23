
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TipoPedidoService {
    private basePath = environment.apiUrl + '/TipoPedido/';

  constructor(private http: HttpClient) {}

  getTipoPedidos(): Observable<any> {
    return this.http.get<[any]>(this.basePath);
  }
}
