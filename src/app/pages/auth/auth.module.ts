import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { IonicModule } from 'ionic-angular'

import { PipesModule } from '../../shared/pipes/pipes.module'
import { ConsentPageItemComponent } from "./components/consent-page-item/consent-page-item.component";
import { ConsentPageComponent } from "./components/consent-page/consent-page.component";
import { EligibilityPageComponent } from "./components/eligibility-page/eligibility-page.component";
import { QRFormComponent } from './components/qr-form/qr-form.component'
import { TokenFormComponent } from './components/token-form/token-form.component'
import { WelcomePageComponent } from "./components/welcome-page/welcome-page.component";
import { YesOrNoOptionComponent } from "./components/yes-or-no-option/yes-or-no-option.component";
import { AuthService } from './services/auth.service'
import { KeycloakAuthService } from "./services/keycloak.auth.service";

@NgModule({
  imports: [
    CommonModule,
    IonicModule.forRoot(WelcomePageComponent),
    PipesModule,
  ],
	entryComponents: [
		EligibilityPageComponent,
		ConsentPageComponent
	],
	declarations: [
		ConsentPageComponent,
		ConsentPageItemComponent,
		WelcomePageComponent,
		EligibilityPageComponent,
		TokenFormComponent,
		QRFormComponent,
		YesOrNoOptionComponent,
	],
  exports: [
    ConsentPageItemComponent,
  ],
	providers: [
		{provide: AuthService, useClass: KeycloakAuthService},
    {provide: Window, useValue: window }
	]
})
export class AuthModule {}
