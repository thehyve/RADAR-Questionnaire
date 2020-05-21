import {Injectable} from "@angular/core";
import {TokenService} from "./token.service";
import {HttpClient, HttpHeaders, HttpParams} from "@angular/common/http";
import {StorageService} from "../storage/storage.service";
import {JwtHelperService} from "@auth0/angular-jwt";
import {RemoteConfigService} from "../config/remote-config.service";
import {LogService} from "../misc/log.service";
import {StorageKeys} from "../../../shared/enums/storage";
import {
  DefaultRequestEncodedContentType
} from "../../../../assets/data/defaultConfig";
import {getSeconds} from "../../../shared/utilities/time";
import {AuthConfigService} from "../config/auth-config.service";


@Injectable()
export class KeycloakTokenService extends TokenService {

  constructor(
    public http: HttpClient,
    public storage: StorageService,
    protected jwtHelper: JwtHelperService,
    protected remoteConfig: RemoteConfigService,
    protected logger: LogService,
    private authConfigService: AuthConfigService
  ) {
    super(http, storage, jwtHelper, remoteConfig, logger)
  }

  registerAuthCode(authorizationCode: any) {
    this.logger.log("authorizing code", authorizationCode)

    return this.authConfigService.getKeycloakConfig().then(keycloakConfig => {
      // get access token and setToken
      return Promise.all([
        this.authConfigService.getTokenUrl(),
        this.getTokenHeaders(DefaultRequestEncodedContentType),
        this.getTokenParams(authorizationCode, keycloakConfig.clientId, keycloakConfig.redirectUri)
      ])
        .then(([uri, headers, body]) => {
          this.logger.log(
            `"Requesting access token with code: ${authorizationCode},URI: ${uri} and headers`,
            headers)
          return this.http
            .post(uri, body, { headers: headers })
            .toPromise()
        })
        .then((res: any) => {
          res.iat = getSeconds({
            milliseconds: new Date().getTime()
          }) - 10; // reduce 10 sec to for delay
          this.logger.log("Token is ", JSON.stringify(res))
          return this.setTokens(res)
        })
    })
  }

  getTokenParams(code , clientId, redirectUrl) {
    return new Promise(resolve => {
      resolve(
        new HttpParams()
          .set('grant_type', 'authorization_code')
          .set('code', code)
          .set('client_id', encodeURIComponent(clientId))
          .set('redirect_uri', redirectUrl)
      )
    })
  }

  refresh(): Promise<any> {
    return Promise.all([
      this.getTokens(),
      this.authConfigService.getKeycloakConfig()
    ]).then(([tokens, keycloakConfig]) => {
      if (!tokens) {
        throw new Error('No tokens are available to refresh')
      }
      if (!keycloakConfig) {
        throw new Error('Keycloak config is not found')
      }
      const limit = getSeconds({
        milliseconds: new Date().getTime() + this.tokenRefreshMillis
      })
      if (tokens.iat + tokens.expires_in < limit) {
        return this.refreshToken(tokens.refresh_token)
      } else {
        return tokens
      }
    })
  }

  refreshToken(refreshToken) {
    this.logger.log("Refresh token", refreshToken)
    // get access token and setToken
    return Promise.all([
      this.authConfigService.getRealmUrl(),
      this.getTokenHeaders(DefaultRequestEncodedContentType),
      this.getRefreshParams(refreshToken)
    ])
      .then(([uri, headers, body]) => {
        this.logger.log(`"Requesting access token with refresh-token: ${refreshToken}, URI: ${uri} and headers`,
          headers)
        return this.http
          .post(uri, body, { headers: headers })
          .toPromise()
      })
      .then((res: any) => {
        res.iat = getSeconds({
            milliseconds: new Date().getTime()
          }) - 10
        this.logger.log("Refreshed Token is ", JSON.stringify(res))
        return this.setTokens(res)
      })
  }

  getTokenHeaders(contentType): Promise<HttpHeaders> {
    return Promise.all([
      this.authConfigService.getClientId(),
      this.authConfigService.getClientSecret()
    ])
    .then(([clientId, clientSecret]) => {
      const creds = TokenService.basicCredentials(
        clientId,
        clientSecret
      )
      return new HttpHeaders()
        .set('Authorization', creds)
        .set('Content-Type', contentType)
    })
  }

  setTokenURI(uri: string): Promise<string> {
    let lastSlashIndex = uri.length
    while (lastSlashIndex > 0 && uri[lastSlashIndex - 1] == '/') {
      lastSlashIndex--
    }
    return this.storage.set(
      StorageKeys.TOKEN_URI,
      uri.substring(0, lastSlashIndex) + '/protocol/openid-connect/token'
    )
  }


  isValid(): Promise<boolean> {
    return this.storage.get(StorageKeys.OAUTH_TOKENS).then(tokens => {
      return !this.jwtHelper.isTokenExpired(tokens.refresh_token)
    })
  }

}
