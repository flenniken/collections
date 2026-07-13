"use strict";

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
  const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
  return { DynamoDBClient, DynamoDBDocumentClient, PutCommand };
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

function apiResponse(statusCode, body) {
  // Return an API Gateway proxy integration response.
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
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

async function saveSubscription(subscription, claims, client) {
  // Validate the subscription, check authorization, and save it.
  const error = validateSubscription(subscription);
  if (error)
    return apiResponse(400, { ok: false, message: error });

  if (!userIdsMatch(subscription.userId, claims))
    return apiResponse(403, { ok: false, message: 'userId does not match token.' });

  const item = subscriptionItem(subscription);
  try {
    await putSubscription(item, client);
  } catch (err) {
    console.error(`DynamoDB PutItem: ${err.message}`);
    return apiResponse(500, { ok: false, message: 'Failed to save subscription.' });
  }

  console.log(`Saved subscription for user ${subscription.userId}.`);
  return apiResponse(200, { ok: true, message: 'Subscription saved.' });
}

async function handler(event, context) {
  // Save a push subscription from an API Gateway POST /subscriptions request.
  try {
    checkRegion();
  } catch (err) {
    console.error(err.message);
    return apiResponse(500, { ok: false, message: err.message });
  }

  let subscription;
  try {
    subscription = parseSubscriptionBody(event.body);
  } catch (err) {
    return apiResponse(400, { ok: false, message: err.message });
  }

  const claims = event.requestContext?.authorizer?.claims;
  return saveSubscription(subscription, claims);
}

module.exports = {
  TABLE_NAME,
  region,
  checkRegion,
  parseSubscriptionBody,
  validateSubscription,
  tokenUserId,
  userIdsMatch,
  subscriptionItem,
  putSubscription,
  saveSubscription,
  apiResponse,
  handler,
  getDocClient,
};
