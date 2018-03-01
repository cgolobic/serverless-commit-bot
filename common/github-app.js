const fs = require('fs');
const jwt = require('jsonwebtoken');
const https = require('https');
const base64 = require('js-base64').Base64;
const gitHash = require('./git-hash');
const queries = require('../queries');
const ACCEPT = 'application/vnd.github.machine-man-preview+json';
const HOSTNAME = 'api.github.com';

module.exports = async function GitHubApiRequest(config, callback) {
  if (!config.keyFilePath) {
    throw Error('config.keyFilePath was not provided');
  }
  let token = _getJwtToken(config.keyFilePath);
  let installations = await _getInstallations(token, config.userAgent);
  if (!config.owner) {
    throw Error('config.owner was not provided');
  }
  //TODO cache this if config specifies...
  let installation = installations.find((i) => i.account.login === config.owner);
  if (!installation) {
    throw Error(`Installation not found for owner "${config.owner}"`);
  }
  let accessToken = (await _getAccessToken(installation.id, token, config.userAgent)).token;
  //TODO error handling, caching...
  if (!config.repo) {
    throw Error('config.repo was not provided');
  }
  let gqlParams = {
    repository: config.repo,
    owner: config.owner,
    root: config.filePath
  };
  let gqlResp = await _graphQLQuery(queries.GET_TREE, gqlParams, accessToken, config.userAgent);
      // _getBlobShaForFile(config.owner, config.repo, config.filePath, accessToken, config.userAgent, (metadata) => {
      //   let needGitUpdate = false;
      //   if (metadata.sha) {
      //     let newContentHash = gitHash(config.content, 'blob');
      //     needGitUpdate = newContentHash !== metadata.sha;
      //   }
      //   if (needGitUpdate) {
      //     _updateOrCreateFile(config.owner, config.repo, config.filePath, accessToken, metadata.sha, config.content, config.commitMessage, config.userAgent, (commitResponse) => {
      //       callback(commitResponse);
      //     });
      //   } else {
      //     callback({});
      //   }
      // });
}

function _getJwtToken(keyPath) {
  let pemCert = fs.readFileSync(keyPath);
  let issueSeconds = Math.floor(Date.now() / 1000);
  let expirySeconds = issueSeconds + 60;
  let payload = {
    iat: issueSeconds,
    exp: expirySeconds,
    iss: +process.env['ISSUER_ID']
  };
  return jwt.sign(payload, pemCert, { algorithm: 'RS256' });
}

async function _getInstallations(jwt, userAgent) {
  let options = {
    hostname: HOSTNAME,
    path: '/app/installations',
    headers: {
      'User-Agent': userAgent,
      'Accept': ACCEPT,
      'Authorization': `Bearer ${jwt}`
    }
  };
  return new Promise((resolve, reject) => {
    https.get(options, (response) => {
      _getResponseJson(response, resolve, reject);
    });
  });I
}

async function _getAccessToken(installationId, jwt, userAgent) {
  let options = {
    hostname: HOSTNAME,
    path: `/installations/${installationId}/access_tokens`,
    method: 'POST',
    headers: {
      'User-Agent': userAgent,
      'Accept': ACCEPT,
      'Authorization': `Bearer ${jwt}`
    }
  };
  return new Promise((resolve, reject) => {
    let req = https.request(options, (response) => {
      _getResponseJson(response, resolve, reject);
    });
    req.end();
  });
}

function _getBlobShaForFile(owner, repo, filePath, token, userAgent, callback) {
  // gets more than just the sha, could use GraphQL api to just get what we need...
  let reqOptions = {
    hostname: 'api.github.com',
    path: `/repos/${owner}/${repo}/contents/${filePath}`,
    headers: {
      'User-Agent': userAgent,
      'Accept': ACCEPT,
      'Authorization': `token ${token}`
    }
  };
  // TODO: handle response for new file better
  const req = https.get(reqOptions, (res) => {
    res.setEncoding('utf8');
    let fullBody = '';
    res.on('data', (body) => {
      fullBody += body;
    });
    res.on('end', () => {
      let fileData = JSON.parse(fullBody);
      callback(fileData);
    });
  }); 
}

function _updateOrCreateFile(owner, repo, filePath, token, blobSha, content, message, userAgent, callback) {
  let putParams = JSON.stringify({
    message: message,
    sha: blobSha,
    content: base64.encode(content)
  });
  let reqOptions = {
    hostname: 'api.github.com',
    path: `/repos/${owner}/${repo}/contents/${filePath}`,
    method: 'PUT',
    headers: {
      'User-Agent': userAgent,
      'Accept': ACCEPT,
      'Authorization': `token ${token}`
    }
  };
  const req = https.request(reqOptions, (res) => {
    res.setEncoding('utf8');
    let fullBody = '';
    res.on('data', (body) => {
      fullBody += body;
    });
    res.on('end', () => {
      let fileData = JSON.parse(fullBody);
      callback(fileData);
    });
  }); 
  req.write(putParams);
  req.end();
}

async function _graphQLQuery(query, params, token, userAgent) {
  let postBody = JSON.stringify({
    query
  });
  let options = {
    hostname: HOSTNAME,
    path: `/graphql`,
    method: 'POST',
    headers: {
      'User-Agent': userAgent,
      //'Accept': ACCEPT,
      'Authorization': `token ${token}`
    }
  };
  return new Promise((resolve, reject) => {
    let req = https.request(options, (response) => {
      _getResponseJson(response, resolve, reject);
    });
    req.write(postBody);
    req.end();
  });
}

function _getResponseJson(response, resolve, reject) {
  response.setEncoding('utf8');
  let fullBody = '';
  response.on('data', (body) => fullBody += body);
  response.on('end', () => resolve(JSON.parse(fullBody)));
  response.on('error', (error) => reject(error));
}
