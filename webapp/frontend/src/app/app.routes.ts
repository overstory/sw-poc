import { ModuleWithProviders }         from '@angular/core';
import { Routes, RouterModule }        from '@angular/router';
import { HomeComponent }               from './home/home.component';
import { QueryComponent }              from './pages/query/query.component';

const appRoutes: Routes = [
{ path: '', component: HomeComponent },
{ path: 'query', component: QueryComponent },
  { path: '**', redirectTo: '' }
];

export const appRoutingProviders: any[] = [
];

export const routing: ModuleWithProviders = RouterModule.forRoot(appRoutes);
