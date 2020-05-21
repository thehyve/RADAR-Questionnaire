import { Injectable } from '@angular/core'

import {
  DefaultCallbackURL,
  DefaultClientId,
  DefaultEndPoint,
  DefaultProjectName,
  DefaultRealmName
} from '../../../../assets/data/defaultConfig'
import { ConfigKeys } from '../../../shared/enums/config'
import { StorageKeys } from '../../../shared/enums/storage'
import { KeycloakConfig } from '../../../shared/models/auth'
import { LogService } from '../misc/log.service'
import { StorageService } from '../storage/storage.service'
import { RemoteConfigService } from './remote-config.service'

@Injectable()
export class AuthConfigService {
  private readonly CONFIG_STORE = {
    BASE_URL: StorageKeys.BASE_URI,
    AUTH_BASE_URI: StorageKeys.AUTH_BASE_URI,
    TOKEN_URI: StorageKeys.TOKEN_URI,
    REALM_URI: StorageKeys.REALM_URI,
    KEYCLOAK_CONFIG: StorageKeys.KEYCLOAK_CONFIG,
    CLIENT_ID: StorageKeys.APP_CLIENT_ID
  }

  constructor(
    public storage: StorageService,
    private remoteConfig: RemoteConfigService,
    private logger: LogService
  ) {
    this.init()
  }

  init(): Promise<any> {
    return this.remoteConfig
      .read()
      .then(cfg =>
        Promise.all([
          cfg.getOrDefault(ConfigKeys.BASE_ENDPOINT_URL, DefaultEndPoint),
          cfg.getOrDefault(ConfigKeys.REALM_NAME, DefaultRealmName),
          cfg.getOrDefault(ConfigKeys.CALLBACK_URL, DefaultCallbackURL),
          cfg.getOrDefault(ConfigKeys.APP_CLIENT_ID, DefaultClientId)
        ])
      )
      .catch(e => [
        DefaultEndPoint,
        DefaultRealmName,
        DefaultCallbackURL,
        DefaultClientId
      ])
      .then(([baseUrl, realmName, callbackUrl, clientId]) => {
        if (!baseUrl) {
          throw new Error('Cannot find baseUrl')
        }
        const authBaseUrl = baseUrl + '/auth/'
        if (!realmName) {
          throw new Error('Cannot find realmName')
        }
        const realmBaseUrl =
          authBaseUrl + 'realms/' + encodeURIComponent(realmName)

        const tokenUrl = realmBaseUrl + '/protocol/openid-connect/token'

        const keycloakConfig: KeycloakConfig = {
          authServerUrl: authBaseUrl,
          realm: realmName,
          clientId: clientId,
          redirectUri: callbackUrl,
          realmUrl: realmBaseUrl
        }
        this.logger.log(
          'Setting keycloakConfig to be ',
          JSON.stringify(keycloakConfig)
        )
        return Promise.all([
          this.storage.set(this.CONFIG_STORE.BASE_URL, baseUrl),
          this.storage.set(this.CONFIG_STORE.AUTH_BASE_URI, authBaseUrl),
          this.storage.set(this.CONFIG_STORE.REALM_URI, realmBaseUrl),
          this.storage.set(this.CONFIG_STORE.TOKEN_URI, tokenUrl),
          this.storage.set(this.CONFIG_STORE.KEYCLOAK_CONFIG, keycloakConfig),
          this.storage.set(this.CONFIG_STORE.CLIENT_ID, clientId)
        ])
      })
  }

  getAuthBaseUrl() {
    return this.storage.get(this.CONFIG_STORE.AUTH_BASE_URI)
    // .then((url) => {
    //   return url ? url : this.initAuthConfig().then(() => {
    //     return this.getAuthBaseUrl()
    //   })
    // })
  }

  getRealmUrl() {
    return this.storage.get(this.CONFIG_STORE.REALM_URI)
    // .then((url) => {
    //   return url ? url : this.initAuthConfig().then(() => {
    //     return this.getRealmUrl()
    //   })
    // })
  }

  getTokenUrl() {
    return this.storage.get(this.CONFIG_STORE.TOKEN_URI)
    // .then((url) => {
    //   return url ? url : this.initAuthConfig().then(() => {
    //     return this.getTokenUrl()
    //   })
    // })
  }

  getKeycloakConfig(): Promise<KeycloakConfig> {
    return this.storage.get(this.CONFIG_STORE.KEYCLOAK_CONFIG)
    // .then((url) => {
    //   return url ? url : this.initAuthConfig().then(() => {
    //     return this.getKeycloakConfig()
    //   })
    // })
  }

  getClientId() {
    return this.storage.get(this.CONFIG_STORE.CLIENT_ID)
  }

  getClientSecret() {
    return this.remoteConfig.read().then(config => {
      return config.getOrDefault(
        ConfigKeys.OAUTH_CLIENT_SECRET,
        '' //(keycloakConfig.credentials || {}).secret
      )
    })
  }

  getBaseUrl() {
    return this.storage.get(this.CONFIG_STORE.BASE_URL).then(url => {
      return url
        ? url
        : this.init().then(() => {
            return this.getKeycloakConfig()
          })
    })
  }
  // getProjectName() {
  //   return this.storage.get(StorageKeys.PROJECTNAME).then((projectName) => {
  //     this.logger.log("Project is already assigned to participant", projectName)
  //     return projectName ? projectName : this.remoteConfig.read().then(config =>
  //       config.getOrDefault(
  //         ConfigKeys.PROJECT_NAME,
  //         DefaultProjectName
  //       )
  //     )
  //   })
  // }
}
