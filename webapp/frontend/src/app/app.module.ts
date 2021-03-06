import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { routing, appRoutingProviders } from './app.routes';

import { NavbarComponent } from './core/navbar/navbar.component';
import { FooterComponent } from './core/footer/footer.component';
import { QueryComponent } from './pages/query/query.component';
import { ForceComponent } from './shared/force/force.component';
import { TwoParameterSelectorComponent } from './controls/two-parameter-selector/two-parameter-selector.component';
import { ByLabelComponent } from './controls/by-label/by-label.component';


@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    NavbarComponent,
    FooterComponent,
    QueryComponent,
	ForceComponent,
	TwoParameterSelectorComponent,
        ByLabelComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    routing
  ],
  providers: [appRoutingProviders],
  bootstrap: [
    AppComponent,
    NavbarComponent,
    FooterComponent
    ]
})
export class AppModule { }
