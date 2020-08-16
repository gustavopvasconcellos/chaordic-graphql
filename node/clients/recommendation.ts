import {
  ExternalClient,
  InstanceOptions,
  IOContext,
  RequestConfig,
} from '@vtex/api'
import { stringify } from 'qs'

export interface RecommendationParams {
  chaordicBrowserId?: string
  deviceId?: string
  name: string
  salesChannel?: string
  userId?: string
  pathName?: string
  category?: string[]
  productId: string
  productFormat?: string
  source: string
}

export interface ProductRecommendationParams {
  chaordicBrowserId?: string
  deviceId?: string
  salesChannel?: string
  productId: string
  size: number
  type: string
}

export interface ImpressionParams {
  impressionUrl: string
}

export const formatSalesChannel = (segmentToken?: any): string => {
  if (!segmentToken) {
    return ''
  }

  const segment = JSON.parse(atob(segmentToken))

  function atob(b64Encoded: string) {
    return Buffer.from(b64Encoded, 'base64').toString()
  }

  const franchise = segment.regionId ? `${atob(segment.regionId).replace('SW#', '')}-` : ''
  return `${franchise}${segment.channel}`
}

const treatedStatusCodes = [404, 302]
const treatedErrors = (e: any) => {
  if (
    e.response &&
    e.response.status &&
    treatedStatusCodes.includes(e.response.status)
  ) {
    return e.response.data
  }
  throw e
}

export default class Recommendation extends ExternalClient {
  public apiKey?: string
  public secretKey?: string

  constructor(context: IOContext, options?: InstanceOptions) {
    super('http://recs.chaordicsystems.com/v0', context, {
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-vtex-use-https': 'true',
      },
    })
  }

  // This is initialized by the withSecretKeys directive
  public init(secretKeys: SecretKeys) {
    this.apiKey = secretKeys?.apiKey
    this.secretKey = decodeURIComponent(secretKeys?.secretKey)
  }

  public recommendations(params: RecommendationParams): Promise<any> {
    return this.get(this.routes.recommendations, {
      metric: 'chaordic-recommendations',
      params,
    })
  }

  public productRecommendations(
    params: ProductRecommendationParams
  ): Promise<any> {
    return this.get(this.routes.recommendations, {
      metric: 'chaordic-recommendations-product',
      params,
    })
  }

  public impression(impressionUrl: string): Promise<any> {
    return this.get(impressionUrl, {
      metric: 'chaordic-recommendations-impression',
    })
  }

  private get routes() {
    return {
      recommendations: '/pages/recommendations/',
    }
  }

  private get(url: string, config?: RequestConfig) {
    const params = {
      ...config?.params,
      ...(config?.params?.salesChannel === '2' || this.context.account === 'carrefourbrfood' ? {
        apiKey: 'carrefour-mercado',
        salesChannel: formatSalesChannel(this.context.segmentToken),
        secretKey: 'QzxeJ51fyYU4kyNwAt27og==',
      } : {
        apiKey: 'carrefour-shopping',
        secretKey: 'K6a47aIuaXGhe5d4NNSsEA==',
      }),
      ...(!this.context.production && {
        dummy: true,
        homologation: true,
      }),
    }

    console.log(params)

    return this.http
      .get(url, {
        ...config,
        params,
        paramsSerializer: oldParams =>
          stringify(oldParams, { arrayFormat: 'repeat' }),
      })
      .catch(treatedErrors)
  }
}
