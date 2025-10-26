import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';

@Injectable({
    providedIn: 'root'
})
export class TenantService {

    private basePath = environment.apiUrl + '/Tenant';

    constructor(private http: HttpClient) { }

    getTenant(): Observable<ApiResponse<Tenant[]>> {
        const domain = window.location.hostname;
    return this.http.get<ApiResponse<Tenant[]>>(`${this.basePath}?domain=${domain}`)
    }
}

export interface Tenant {
    TenantId: string;
    Sucursal: string;
}