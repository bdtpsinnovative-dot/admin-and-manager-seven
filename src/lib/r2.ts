import { createHash, createHmac } from 'node:crypto'

type R2Method = 'GET' | 'HEAD' | 'PUT' | 'DELETE'

function requiredEnv(name: 'R2_ACCOUNT_ID' | 'R2_ACCESS_KEY_ID' | 'R2_SECRET_ACCESS_KEY' | 'R2_BUCKET_NAME') {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`ยังไม่ได้ตั้งค่า ${name}`)
  return value
}

function sha256(value: string | Buffer) {
  return createHash('sha256').update(value).digest('hex')
}

function hmac(key: string | Buffer, value: string) {
  return createHmac('sha256', key).update(value).digest()
}

function encodePath(value: string) {
  return value.split('/').map(encodeURIComponent).join('/')
}

export async function requestR2Object(
  method: R2Method,
  key: string,
  options: { body?: Buffer; contentType?: string } = {},
) {
  const accountId = requiredEnv('R2_ACCOUNT_ID')
  const accessKeyId = requiredEnv('R2_ACCESS_KEY_ID')
  const secretAccessKey = requiredEnv('R2_SECRET_ACCESS_KEY')
  const bucket = requiredEnv('R2_BUCKET_NAME')

  const host = `${accountId}.r2.cloudflarestorage.com`
  const canonicalUri = `/${encodeURIComponent(bucket)}/${encodePath(key)}`
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)
  const payloadHash = sha256(options.body ?? '')
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date'
  const canonicalRequest = [
    method,
    canonicalUri,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')

  const credentialScope = `${dateStamp}/auto/s3/aws4_request`
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join('\n')
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp)
  const regionKey = hmac(dateKey, 'auto')
  const serviceKey = hmac(regionKey, 's3')
  const signingKey = hmac(serviceKey, 'aws4_request')
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex')
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  return fetch(`https://${host}${canonicalUri}`, {
    method,
    headers: {
      Authorization: authorization,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      ...(options.contentType ? { 'content-type': options.contentType } : {}),
    },
    body: options.body ? new Uint8Array(options.body).buffer : undefined,
    cache: 'no-store',
  })
}

export function paymentSlipKey(orderId: number) {
  return `payment-slips/orders/${orderId}.jpg`
}
