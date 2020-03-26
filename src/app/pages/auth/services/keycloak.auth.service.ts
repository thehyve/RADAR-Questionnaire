import {Injectable} from "@angular/core";
import {AuthService} from "./auth.service";
import {StorageService} from "../../../core/services/storage/storage.service";
import {LogService} from "../../../core/services/misc/log.service";
import {HttpClient} from "@angular/common/http";
import {TokenService} from "../../../core/services/token/token.service";
import {ConfigService} from "../../../core/services/config/config.service";
import {AnalyticsService} from "../../../core/services/usage/analytics.service";
import {
  DefaultCallbackURL,
  DefaultClientId,
  DefaultEndPoint,
  DefaultKeycloakURL,
  DefaultProjectName,
  DefaultRealmName,
  DefaultRequestEncodedContentType
} from "../../../../assets/data/defaultConfig";
import {InAppBrowser, InAppBrowserOptions} from "@ionic-native/in-app-browser/ngx";
import {StorageKeys} from "../../../shared/enums/storage";
import {KeycloakConfig} from "../../../shared/models/auth";
import {RemoteConfigService} from "../../../core/services/config/remote-config.service";
import {ConfigKeys} from "../../../shared/enums/config";
import {AuthConfigService} from "../../../core/services/config/auth-config.service";

const uuid = require('uuid/v4')

@Injectable()
export class KeycloakAuthService extends AuthService {

  private keycloakConfig: KeycloakConfig = {
    authServerUrl: DefaultEndPoint + DefaultKeycloakURL,
    realm: DefaultRealmName,
    clientId: DefaultClientId,
    redirectUri: DefaultCallbackURL,
    realmUrl: DefaultEndPoint + DefaultKeycloakURL + 'realms/' + encodeURIComponent(DefaultRealmName)
  };
  inAppBrowserOptions: InAppBrowserOptions = {
    zoom: 'no',
    location: 'no',
    clearsessioncache: 'yes',
    clearcache: 'yes'
  }

  constructor(
    public http: HttpClient,
    token: TokenService,
    config: ConfigService,
    logger: LogService,
    analytics: AnalyticsService,
    private storage: StorageService,
    private inAppBrowser: InAppBrowser,
    private remoteConfig: RemoteConfigService,
    private authConfigService: AuthConfigService
  ) {
    super(http, token, config, logger, analytics)
    this.authConfigService.init().then(() => {
        this.init().then(() => {
          logger.log("Keycloak Config: ", JSON.stringify(this.keycloakConfig))
        })
    });
  }

  init() : Promise<any> {
    return Promise.all([
      this.authConfigService.getKeycloakConfig(),
      this.authConfigService.getAuthBaseUrl()
    ]).then(([keycloakConf, authBaseUrl]) => {
      this.keycloakConfig = keycloakConf
      this.URI_base = authBaseUrl
    })
  }

  // initKeycloakConfig(): Promise<KeycloakConfig> {
  //   return this.remoteConfig.forceFetch()
  //     .then(config => Promise.all([
  //       config.getOrDefault(ConfigKeys.REALM_NAME, DefaultRealmName),
  //       config.getOrDefault(ConfigKeys.APP_CLIENT_ID, DefaultClientId),
  //       config.getOrDefault(ConfigKeys.CALLBACK_URL, DefaultCallbackURL),
  //       this.getRealmUrl()
  //     ]))
  //     .then(([realm, clientId, callback, realmUrl]) => {
  //       const newConfig = {
  //         authServerUrl: this.URI_base,
  //         realm: realm,
  //         clientId: clientId,
  //         redirectUri: callback,
  //         realmUrl: realmUrl
  //       };
  //     this.logger.log("keycloak config: ", JSON.stringify(newConfig))
  //     return newConfig
  //   })
  // }


  updateURI() {
    return this.storage.get(StorageKeys.AUTH_BASE_URI).then(uri => {
      this.URI_base = uri? uri : DefaultEndPoint + DefaultKeycloakURL
    });
  }

  authenticate(authObj) {
    return this.authenticateWithKeycloak(authObj)
    .then(authResponse => {
      return this.registerAuthorizationCode(authResponse)
    })
    .catch((err) => {
      this.logger.error('Auth failed', JSON.stringify(err))
    })
  }

  authenticateWithKeycloak(isRegistration: boolean): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      this.createAuthenticationUrl(isRegistration)
        .then((authUrl) => {
          const browser = this.inAppBrowser.create(authUrl, '_blank', this.inAppBrowserOptions)
          let authRes = null
          const listener = browser.on('loadstart').subscribe((event: any) => {
            const callback = encodeURI(event.url)
            //Check the redirect uri
            if (callback.indexOf(this.keycloakConfig.redirectUri) > -1) {
              listener.unsubscribe();
              browser.close();
              authRes = this.parseAuthorizationResponse(event.url);
              this.logger.log("Returned auth-code is ", JSON.stringify(authRes))
              resolve(authRes)
            }
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
      this.logger.log("Project name is :", projectName)
      this.logger.log("subject info: "+ JSON.stringify(subjectInformation))
      // treating keycloak user-id as the subjectId. This will make sure that subjectId is always unique
      return this.config.setAll({
        projectId: projectName,
        subjectId: subjectInformation.user_id,
        sourceId: uuid(),
        humanReadableId: subjectInformation.preferred_username,
        enrolmentDate: new Date(subjectInformation.createdTimestamp).getTime(),
        baseUrl: baseUrl? baseUrl : DefaultEndPoint,
      })
    })
  }

  getProjectName() {
    return this.remoteConfig
      .read()
      .then(config =>
        config.getOrDefault(
          ConfigKeys.PROJECT_NAME,
          DefaultProjectName
        )
      )
  }

  // getProjectName(): Promise<string> {
  //   return this.storage.get(StorageKeys.PROJECTNAME).then((project) => {
  //     this.logger.log("project from storage" , project)
  //     return project ? project : this.getSubjectInformation().then((subInfo) => {
  //       const projectName = subInfo.projectName
  //       this.logger.log("Project from subject Info" , projectName)
  //       return  projectName ? projectName : this.assignProject()
  //     })
  //   })
  // }

  assignProject() : Promise<string>{
    return this.remoteConfig
        .read()
        .then(config =>
          config.getOrDefault(ConfigKeys.PROJECT_NAME, DefaultProjectName)
        ).then((projectName) => {
          this.logger.log("project from remote ", projectName)
        return projectName
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

  registerAuthorizationCode(authResponse: any) : Promise<any> {
    return (authResponse.code)
      ? this.token.registerAuthCode(authResponse.code, this.keycloakConfig)
      : new Promise(((resolve, reject) => {
        reject('Authorization Failed: No authorization-code found')
      }))
  }

  createAuthenticationUrl(isRegistration: boolean) {
    const state = uuid();
    const nonce = uuid();
    const responseMode = 'query';
    const responseType = 'code';
    const scope = 'openid';
    return this.getUrlBasedOnAuthAction(isRegistration).then((baseUrl) => {
        return baseUrl +
          '?client_id=' + encodeURIComponent(this.keycloakConfig.clientId) +
          '&state=' + encodeURIComponent(state) +
          '&redirect_uri=' + encodeURIComponent(this.keycloakConfig.redirectUri) +
          '&response_mode=' + encodeURIComponent(responseMode) +
          '&response_type=' + encodeURIComponent(responseType) +
          '&scope=' + encodeURIComponent(scope) +
          '&nonce=' + encodeURIComponent(nonce)
      })
  }

  getUrlBasedOnAuthAction(isRegistration: boolean) {
    return this.authConfigService.getRealmUrl().then((realmUrl) => {
      return isRegistration
          ? realmUrl + '/protocol/openid-connect/registrations'
          : realmUrl + '/protocol/openid-connect/auth'
    })
  }

  // getRealmUrl() : Promise<string> {
  //   return  this.storage.get(StorageKeys.REALM_URI).then((realmFromStorage) => {
  //     if (realmFromStorage) {
  //       this.logger.log("RealmUrl from storage: ", realmFromStorage)
  //       return realmFromStorage
  //     } else {
  //       return this.getRealmName().then((realmName) => {
  //         return this.getAuthBaseURI().then(
  //           (keycloakUrl) => {
  //             this.logger.log("keycloakUrl is ", keycloakUrl)
  //             if (typeof keycloakUrl != 'undefined' && keycloakUrl.charAt(keycloakUrl.length - 1) == '/') {
  //               return (keycloakUrl + 'realms/' + encodeURIComponent(realmName));
  //             } else {
  //               return(keycloakUrl + '/realms/' + encodeURIComponent(realmName));
  //             }
  //           }
  //         )
  //       })
  //     }
  //   })
  // }


  parseAuthorizationResponse(url: any) {
    const hashes = url.slice(url.indexOf('?') + 1).split('&');
    return hashes.reduce((params, hash) => {
      const [key, val] = hash.split('=');
      return Object.assign(params, {[key]: decodeURIComponent(val)})
    }, {});
  }
}
