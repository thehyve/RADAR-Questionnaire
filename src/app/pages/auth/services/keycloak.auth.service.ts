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
  DefaultProjectName, DefaultRealmName,
  DefaultRequestEncodedContentType
} from "../../../../assets/data/defaultConfig";
import {InAppBrowser, InAppBrowserOptions} from "@ionic-native/in-app-browser/ngx";
import {StorageKeys} from "../../../shared/enums/storage";
import {KeycloakConfig} from "../../../shared/models/auth";
import {RemoteConfigService} from "../../../core/services/config/remote-config.service";
import {ConfigKeys} from "../../../shared/enums/config";

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
  ) {
    super(http, token, config, logger, analytics)
    this.updateURI().then((authBaseUrl) => {
      this.logger.log("Auth Base Url is:", authBaseUrl)
      this.initKeycloakConfig().then( (conf) => {
        this.keycloakConfig = conf
        this.logger.log("Initialized keycloak config: ", JSON.stringify(this.keycloakConfig))
        return this.storage.set(StorageKeys.KEYCLOAK_CONFIG, this.keycloakConfig)
      }).then( () => {
          return this.token.setTokenURI(this.keycloakConfig.realmUrl)
        })
      })
  }

  initKeycloakConfig(): Promise<KeycloakConfig> {
    return this.remoteConfig.forceFetch()
      .then(config => Promise.all([
        config.getOrDefault(ConfigKeys.REALM_NAME, DefaultRealmName),
        config.getOrDefault(ConfigKeys.APP_CLIENT_ID, DefaultClientId),
        config.getOrDefault(ConfigKeys.CALLBACK_URL, DefaultCallbackURL),
        this.getRealmUrl()
      ]))
      .then(([realm, clientId, callback, realmUrl]) => {
        const newConfig = {
          authServerUrl: this.URI_base,
          realm: realm,
          clientId: clientId,
          redirectUri: callback,
          realmUrl: realmUrl
        };
      this.logger.log("keycloak config: ", JSON.stringify(newConfig))
      return newConfig
    })
  }


  updateURI() {
    return this.storage.get(StorageKeys.BASE_URI).then(uri => {
      return uri? uri : Promise.all([this.getBaseEndpoint()])
        .then(([baseUrl]) => {
        return this.storage.set(StorageKeys.BASE_URI, baseUrl)
      }).then((baseUrl) => {
          const baseEndpoint = baseUrl ? baseUrl : DefaultEndPoint;
          this.URI_base = baseEndpoint + DefaultKeycloakURL;
          return this.storage.set(StorageKeys.AUTH_BASE_URI, this.URI_base)
      })
    });
  }

  getBaseEndpoint() : Promise<string> {
    return this.remoteConfig.forceFetch().then((config) => {
      return config.getOrDefault(ConfigKeys.BASE_ENDPOINT_URL, DefaultEndPoint)
    })
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
      this.storage.get(StorageKeys.BASE_URI),
      this.getSubjectInformation(),
      this.getProjectName()
    ]).then(([baseUrl, subjectInformation, projectName]) => {
      this.logger.log("Project name is :", projectName)
      this.logger.log("subject info: "+ JSON.stringify(subjectInformation))
      return this.config.setAll({
        projectId: projectName,
        subjectId: subjectInformation.sub,
        sourceId: uuid(),
        humanReadableId: subjectInformation.preferred_username,
        enrolmentDate: new Date(subjectInformation.createdTimestamp).getTime(),
        baseUrl: baseUrl? baseUrl : DefaultEndPoint
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

  getSubjectInformation(): Promise<any> {
    return Promise.all([
      this.token.getAccessHeaders(DefaultRequestEncodedContentType),
      this.getRealmUrl()
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
    return this.getRealmUrl().then((realmUrl) => {
      return isRegistration
          ? realmUrl + '/protocol/openid-connect/registrations'
          : realmUrl + '/protocol/openid-connect/auth'
    })
  }

  getRealmUrl() : Promise<string> {
    return  this.storage.get(StorageKeys.REALM_URI).then((realmFromStorage) => {
      if (realmFromStorage) {
        this.logger.log("RealmUrl from storage: ", realmFromStorage)
        return realmFromStorage
      } else {
        return this.remoteConfig.forceFetch().then((config) => {
          return config.getOrDefault(ConfigKeys.REALM_NAME, DefaultRealmName)
        }).then((realmName) => {
          return this.storage.get(StorageKeys.AUTH_BASE_URI).then(
            (keycloakUrl) => {
              if (keycloakUrl.charAt(keycloakUrl.length - 1) == '/') {
                return (keycloakUrl + 'realms/' + encodeURIComponent(realmName));
              } else {
                return(keycloakUrl + '/realms/' + encodeURIComponent(realmName));
              }
            }
          )
        })
      }
    })
  }

  parseAuthorizationResponse(url: any) {
    const hashes = url.slice(url.indexOf('?') + 1).split('&');
    return hashes.reduce((params, hash) => {
      const [key, val] = hash.split('=');
      return Object.assign(params, {[key]: decodeURIComponent(val)})
    }, {});
  }
}
