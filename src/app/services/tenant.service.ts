import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class TenantService {

    private basePath = environment.apiUrl + '/Tenant/';

    constructor(private http: HttpClient) { }

    getTenant(): Observable<any[]> {
        const domain = window.location.hostname;
        return this.http.get<[any]>(this.basePath + domain);
    }

}

export interface Tenant {
    TenantId: string;
    Sucursal: string;
  }