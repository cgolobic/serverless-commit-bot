const fs = require('fs');
const jwt = require('jsonwebtoken');
const https = require('https');
const base64 = require('js-base64').Base64;
const gitHash = require('./git-hash');
const ACCEPT = 'application/vnd.github.machine-man-preview+json';

module.exports = function GitHubApiRequest(config, callback) {
  if (!config.keyFilePath) {
    throw Error('config.keyFilePath was not provided');
  }
  let token = _getJwtToken(config.keyFilePath);
  _getInstallations(token, config.userAgent, (installations) => {
    if (!config.owner) {
      throw Error('config.owner was not provided');
    }
    //TODO cache this if config specifies...
    let installation = installations.find((i) => i.account.login === config.owner);
    if (!installation) {
      throw Error(`Installation not found for owner "${config.owner}"`);
    }
    _getAccessToken(installation.id, token, config.userAgent, (accessToken) => {
      //TODO error handling, caching...
      if (!config.repo) {
        throw Error('config.repo was not provided');
      }
      _getBlobShaForFile(config.owner, config.repo, config.filePath, accessToken, config.userAgent, (metadata) => {
        let needGitUpdate = false;
        if (metadata.sha) {
          let newContentHash = gitHash(config.content, 'blob');
          needGitUpdate = newContentHash !== metadata.sha;
        }
        if (needGitUpdate) {
          _updateOrCreateFile(config.owner, config.repo, config.filePath, accessToken, metadata.sha, config.content, config.commitMessage, config.userAgent, (commitResponse) => {
            callback(commitResponse);
          });
        } else {
          callback({});
        }
      });
    });
  });
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

function _getInstallations(jwt, userAgent, callback) {
  let reqOptions = {
    hostname: 'api.github.com',
    path: '/app/installations',
    headers: {
      'User-Agent': userAgent,
      'Accept': ACCEPT,
      'Authorization': `Bearer ${jwt}`
    }
  };
  const req = https.get(reqOptions, (res) => {
    res.setEncoding('utf8');
    let fullBody = '';
    res.on('data', (body) => {
      fullBody += body;
    });
    res.on('end', () => {
      let installations = JSON.parse(fullBody);
      callback(installations);
    });
  });
}

function _getAccessToken(installationId, jwt, userAgent, callback) {
  let options = {
    hostname: 'api.github.com',
    path: `/installations/${installationId}/access_tokens`,
    method: 'POST',
    headers: {
      'User-Agent': userAgent,
      'Accept': ACCEPT,
      'Authorization': `Bearer ${jwt}`
    }
  };
  const tokenReq = https.request(options, (res) => {
    res.setEncoding('utf8');
    let fullBody = '';
    res.on('data', (data) => fullBody += data);
    res.on('end', () => {
      let token = JSON.parse(fullBody).token;
      callback(token);
    });
  });
  tokenReq.end();
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
