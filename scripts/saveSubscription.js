"use strict";

// Lambda function to save notification subscriptions.

// Set this value from the region in ~/.aws/config.
const region = 'us-west-2';

const TABLE_NAME = 'collections-push-subscriptions';

let docClient = null;

function checkRegion() {
  // Fail fast when Lambda is running in the wrong region.
  const lambdaRegion = process.env.AWS_REGION;
  if (lambdaRegion !== region)
    throw new Error(`Wrong AWS region: expected ${region}, got ${lambdaRegion || 'unset'}.`);
}

function dynamoSdk() {
  // Load AWS SDK modules when DynamoDB access is needed.
  const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
  const {
    DynamoDBDocumentClient,
    PutCommand,
    DeleteCommand,
    ScanCommand,
  } = require('@aws-sdk/lib-dynamodb');
  return {
    DynamoDBClient,
    DynamoDBDocumentClient,
    PutCommand,
    DeleteCommand,
    ScanCommand,
  };
}

function getDocClient() {
  // Return a DynamoDB document client for the Lambda region.
  if (!docClient) {
    checkRegion();
    const { DynamoDBClient, DynamoDBDocumentClient } = dynamoSdk();
    docClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
  }
  return docClient;
}

function corsHeaders(event) {
  // Return CORS headers for browser requests from localhost or production.
  const headers = {
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
  };
  const origin = event?.headers?.origin || event?.headers?.Origin;
  if (origin)
    headers['Access-Control-Allow-Origin'] = origin;
  else
    headers['Access-Control-Allow-Origin'] = '*';
  return headers;
}

function apiResponse(statusCode, body, event) {
  // Return an API Gateway proxy integration response.
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(event),
    },
    body: JSON.stringify(body),
  };
}

function parseSubscriptionBody(body) {
  // Parse the POST body JSON. Throw when the body is missing or invalid.
  if (!body)
    throw new Error('Missing request body.');
  try {
    return JSON.parse(body);
  } catch {
    throw new Error('Invalid JSON body.');
  }
}

function validateSubscription(subscription) {
  // Return an error message when the subscription is invalid.
  if (!subscription || typeof subscription !== 'object')
    return 'Invalid subscription body.';
  if (!subscription.userId)
    return 'Subscription is missing userId.';
  if (!subscription.endpoint)
    return 'Subscription is missing endpoint.';
  if (!subscription.keys?.p256dh)
    return 'Subscription is missing keys.p256dh.';
  if (!subscription.keys?.auth)
    return 'Subscription is missing keys.auth.';
  return null;
}

function tokenUserId(claims) {
  // Return the Cognito user id from API Gateway authorizer claims.
  if (!claims)
    return null;
  return claims.username || claims.sub;
}

function userIdsMatch(bodyUserId, claims) {
  // Return true when the body userId matches the token user.
  const tokenId = tokenUserId(claims);
  if (!tokenId)
    return false;
  return bodyUserId === tokenId;
}

function pushProvider(endpoint) {
  // Return the push service hostname so leftover Apple (or FCM)
  // endpoints from re-subscribe can be replaced, while a phone and a
  // desktop browser can both remain.
  try {
    return new URL(endpoint).hostname;
  } catch {
    return 'unknown';
  }
}

function subscriptionItem(subscription) {
  // Return the DynamoDB item for a push subscription.
  return {
    userId: subscription.userId,
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    updatedAt: new Date().toISOString(),
  };
}

async function putSubscription(item, client) {
  // Write the subscription item to DynamoDB.
  const { PutCommand } = dynamoSdk();
  const db = client || getDocClient();
  await db.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: item,
  }));
}

async function deleteSubscriptionItem(userId, endpoint, client) {
  // Remove one push subscription from DynamoDB.
  const { DeleteCommand } = dynamoSdk();
  const db = client || getDocClient();
  await db.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { userId, endpoint },
  }));
}

async function scanSubscriptionsForEndpoint(endpoint, client) {
  // Return stored subscriptions that use this push endpoint.
  const { ScanCommand } = dynamoSdk();
  const db = client || getDocClient();
  const response = await db.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'endpoint = :endpoint',
    ExpressionAttributeValues: { ':endpoint': endpoint },
  }));
  return response.Items || [];
}

async function deleteOtherSubscriptionsForEndpoint(endpoint, userId, client) {
  // Remove other users' rows for this device endpoint.
  const items = await scanSubscriptionsForEndpoint(endpoint, client);
  for (const item of items) {
    if (item.userId && item.endpoint && item.userId !== userId)
      await deleteSubscriptionItem(item.userId, item.endpoint, client);
  }
}

async function scanSubscriptionsForUser(userId, client) {
  // Return stored subscriptions for this user.
  const { ScanCommand } = dynamoSdk();
  const db = client || getDocClient();
  const response = await db.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'userId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
  }));
  return response.Items || [];
}

async function deleteOlderSubscriptionsForUser(userId, endpoint, client) {
  // Keep this endpoint; remove the user's other endpoints for the
  // same push service.
  const items = await scanSubscriptionsForUser(userId, client);
  const provider = pushProvider(endpoint);
  for (const item of items) {
    if (item.userId !== userId || !item.endpoint)
      continue;
    if (item.endpoint === endpoint)
      continue;
    if (pushProvider(item.endpoint) === provider)
      await deleteSubscriptionItem(item.userId, item.endpoint, client);
  }
}

async function saveSubscription(subscription, claims, client, event) {
  // Validate the subscription, check authorization, and save it.
  const error = validateSubscription(subscription);
  if (error)
    return apiResponse(400, { ok: false, message: error }, event);

  if (!userIdsMatch(subscription.userId, claims))
    return apiResponse(403, { ok: false, message: 'userId does not match token.' }, event);

  const item = subscriptionItem(subscription);
  try {
    await putSubscription(item, client);
  } catch (err) {
    console.error(`DynamoDB PutItem: ${err.message}`);
    return apiResponse(500, { ok: false, message: 'Failed to save subscription.' }, event);
  }

  try {
    await deleteOtherSubscriptionsForEndpoint(item.endpoint, item.userId, client);
    await deleteOlderSubscriptionsForUser(item.userId, item.endpoint, client);
  } catch (err) {
    console.error(`Failed to remove duplicate endpoint subscriptions: ${err.message}`);
  }

  console.log(`Saved subscription for user ${subscription.userId}.`);
  return apiResponse(200, { ok: true, message: 'Subscription saved.' }, event);
}

async function handler(event, context) {
  // Save a push subscription from an API Gateway POST /subscriptions request.
  try {
    checkRegion();
  } catch (err) {
    console.error(err.message);
    return apiResponse(500, { ok: false, message: err.message }, event);
  }

  let subscription;
  try {
    subscription = parseSubscriptionBody(event.body);
  } catch (err) {
    return apiResponse(400, { ok: false, message: err.message }, event);
  }

  const claims = event.requestContext?.authorizer?.claims;
  return saveSubscription(subscription, claims, undefined, event);
}

module.exports = {
  TABLE_NAME,
  region,
  checkRegion,
  parseSubscriptionBody,
  validateSubscription,
  tokenUserId,
  userIdsMatch,
  pushProvider,
  subscriptionItem,
  putSubscription,
  deleteSubscriptionItem,
  scanSubscriptionsForEndpoint,
  deleteOtherSubscriptionsForEndpoint,
  scanSubscriptionsForUser,
  deleteOlderSubscriptionsForUser,
  saveSubscription,
  apiResponse,
  corsHeaders,
  handler,
  getDocClient,
};
