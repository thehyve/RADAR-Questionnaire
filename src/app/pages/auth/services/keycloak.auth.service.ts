import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import {
  InAppBrowser,
  InAppBrowserOptions
} from '@ionic-native/in-app-browser/ngx'

import {
  DefaultCallbackURL,
  DefaultClientId,
  DefaultEndPoint,
  DefaultKeycloakURL, DefaultLanguage,
  DefaultProjectName,
  DefaultRealmName,
  DefaultRequestEncodedContentType
} from '../../../../assets/data/defaultConfig'
import { AuthConfigService } from '../../../core/services/config/auth-config.service'
import { ConfigService } from '../../../core/services/config/config.service'
import { RemoteConfigService } from '../../../core/services/config/remote-config.service'
import { LogService } from '../../../core/services/misc/log.service'
import { StorageService } from '../../../core/services/storage/storage.service'
import { TokenService } from '../../../core/services/token/token.service'
import { AnalyticsService } from '../../../core/services/usage/analytics.service'
import { ConfigKeys } from '../../../shared/enums/config'
import { StorageKeys } from '../../../shared/enums/storage'
import { KeycloakConfig } from '../../../shared/models/auth'
import { AuthService } from './auth.service'
import {LocalizationService} from "../../../core/services/misc/localization.service";
import {LanguageSetting} from "../../../shared/models/settings";
import {LocKeys} from "../../../shared/enums/localisations";

const uuid = require('uuid/v4')

@Injectable()
export class KeycloakAuthService extends AuthService {
  private keycloakConfig: KeycloakConfig = {
    authServerUrl: DefaultEndPoint + DefaultKeycloakURL,
    realm: DefaultRealmName,
    clientId: DefaultClientId,
    redirectUri: DefaultCallbackURL,
    realmUrl:
      DefaultEndPoint +
      DefaultKeycloakURL +
      'realms/' +
      encodeURIComponent(DefaultRealmName)
  }

  language?: LanguageSetting = DefaultLanguage


  constructor(
    public http: HttpClient,
    token: TokenService,
    config: ConfigService,
    logger: LogService,
    analytics: AnalyticsService,
    private storage: StorageService,
    private inAppBrowser: InAppBrowser,
    private remoteConfig: RemoteConfigService,
    private authConfigService: AuthConfigService,
    private localization: LocalizationService,
  ) {
    super(http, token, config, logger, analytics)
    this.init().then(() => {
      logger.log('Keycloak Config: ', JSON.stringify(this.keycloakConfig))
    })
  }

  init(): Promise<any> {
    return Promise.all([
      this.authConfigService.getKeycloakConfig(),
      this.authConfigService.getAuthBaseUrl()
    ]).then(([keycloakConf, authBaseUrl]) => {
      this.keycloakConfig = keycloakConf
      this.URI_base = authBaseUrl
    })
  }

  updateURI() {
    return this.storage.get(StorageKeys.AUTH_BASE_URI).then(uri => {
      this.URI_base = uri ? uri : DefaultEndPoint + DefaultKeycloakURL
    })
  }

  authenticate(authObj) {
    return this.authenticateWithKeycloak(authObj)
      .then(authResponse => {
        return this.registerAuthorizationCode(authResponse)
      })
  }

  authenticateWithKeycloak(isRegistration: boolean): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      this.createAuthenticationUrl(isRegistration).then(authUrl => {
        const inAppBrowserOptions: InAppBrowserOptions = {
          zoom: 'no',
          location: 'no',
          clearsessioncache: 'yes',
          clearcache: 'yes',
          closebuttoncaption: this.localization.translateKey(LocKeys.KEYCLOAK_BACK),
          toolbarcolor: '#ceeeff',
          hidenavigationbuttons: 'yes'
        }
        const browser = this.inAppBrowser.create(
          authUrl,
          '_blank', inAppBrowserOptions
        )
        let authRes = null
        const listener = browser.on('loadstart').subscribe((event: any) => {
          const callback = encodeURI(event.url)
          //Check the redirect uri
          if (callback.indexOf(this.keycloakConfig.redirectUri) > -1) {
            listener.unsubscribe()
            browser.close()
            authRes = this.parseAuthorizationResponse(event.url)
            this.logger.log('Returned auth-code is ', JSON.stringify(authRes))
            resolve(authRes)
          }
        })
        browser.on('exit').subscribe(() => {
          //Check the redirect uri
          this.logger.log("BROWSER EXITED")
          reject('Could not complete login or registration')
        })
      })
    })
  }

  initSubjectInformation() {
    return Promise.all([
      this.authConfigService.getBaseUrl(),
      this.getSubjectInformation(),
      this.getProjectName()
    ]).then(([baseUrl, subjectInformation, projectName]) => {
      this.logger.log('Project name is :', projectName)
      this.logger.log('subject info: ' + JSON.stringify(subjectInformation))
      // treating keycloak user-id as the subjectId. This will make sure that subjectId is always unique
      return this.config.setAll({
        projectId: projectName,
        subjectId: subjectInformation.user_id,
        sourceId: uuid(),
        humanReadableId: subjectInformation.preferred_username,
        enrolmentDate: new Date(subjectInformation.createdTimestamp).getTime(),
        baseUrl: baseUrl ? baseUrl : DefaultEndPoint
      })
    })
  }

  getProjectName() {
    return this.storage.get(StorageKeys.PROJECTNAME).then((project: any) => {
      this.logger.log('project from storage', project)
      return project
        ? project
        : this.remoteConfig
            .read()
            .then(config =>
              config.getOrDefault(ConfigKeys.PROJECT_NAME, DefaultProjectName)
            )
    })
  }

  getSubjectInformation(): Promise<any> {
    return Promise.all([
      this.token.getAccessHeaders(DefaultRequestEncodedContentType),
      this.authConfigService.getRealmUrl()
    ]).then(([headers, realmUrl]) =>
      this.http.get(this.getSubjectURI(realmUrl), { headers }).toPromise()
    )
  }

  getSubjectURI(realmUrl) {
    return realmUrl + '/protocol/openid-connect/userinfo'
  }

  registerAuthorizationCode(authResponse: any): Promise<any> {
    return authResponse.code
      ? this.token.registerAuthCode(authResponse.code, this.keycloakConfig)
      : new Promise((resolve, reject) => {
          reject('Authorization Failed: No authorization-code found')
        })
  }

  createAuthenticationUrl(isRegistration: boolean) {
    const state = uuid()
    const nonce = uuid()
    const responseMode = 'query'
    const responseType = 'code'
    const scope = 'openid'
    this.language = this.localization.getLanguage()
    return this.getUrlBasedOnAuthAction(isRegistration).then(baseUrl => {
      return (
        baseUrl +
        '?client_id=' +
        encodeURIComponent(this.keycloakConfig.clientId) +
        '&state=' +
        encodeURIComponent(state) +
        '&redirect_uri=' +
        encodeURIComponent(this.keycloakConfig.redirectUri) +
        '&response_mode=' +
        encodeURIComponent(responseMode) +
        '&response_type=' +
        encodeURIComponent(responseType) +
        '&scope=' +
        encodeURIComponent(scope) +
        '&nonce=' +
        encodeURIComponent(nonce) +
        '&kc_locale=' +
        encodeURIComponent(this.language.value)
      )
    })
  }

  getUrlBasedOnAuthAction(isRegistration: boolean) {
    return this.authConfigService.getRealmUrl().then(realmUrl => {
      return isRegistration
        ? realmUrl + '/protocol/openid-connect/registrations'
        : realmUrl + '/protocol/openid-connect/auth'
    })
  }

  parseAuthorizationResponse(url: any) {
    const hashes = url.slice(url.indexOf('?') + 1).split('&')
    return hashes.reduce((params, hash) => {
      const [key, val] = hash.split('=')
      return Object.assign(params, { [key]: decodeURIComponent(val) })
    }, {})
  }
}
