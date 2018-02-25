const fs = require('fs');
const jwt = require('jsonwebtoken');
const https = require('https');
const base64 = require('js-base64').Base64;

const USER_AGENT = 'serverless-pr-bot';
const ACCEPT = 'application/vnd.github.machine-man-preview+json';

module.exports = function (context, req) {
  if (!process.env['KEY_FILE_PATH']) {
    _returnError(context, 'App setting "KEY_FILE_PATH" not defined');
    return;
  }
  let token = _getJwtToken(process.env['KEY_FILE_PATH']);
  _getInstallations(token, (installations) => {
    let installation = installations.find((i) => i.account.login === req.params.owner);
    if (!installation) {
      _returnError(context, `Installation not found for owner "${req.params.owner}"`);
      return;
    }
    _getAccessToken(installation.id, token, (token) => {
      _getBlobShaForFile(req.params.owner, req.params.repo, 'README.md', token, (data) => {
        _updateFile(req.params.owner, req.params.repo, 'README.md', token, data.sha, (commitData) => {
          context.res = {
            status: 200,
            body: JSON.stringify(commitData)
          };
          context.done();
        });
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

function _getInstallations(jwt, callback) {
  let reqOptions = {
    hostname: 'api.github.com',
    path: '/app/installations',
    headers: {
      'User-Agent': USER_AGENT,
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

function _getAccessToken(installationId, jwt, callback) {
  let options = {
    hostname: 'api.github.com',
    path: `/installations/${installationId}/access_tokens`,
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
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

function _getBlobShaForFile(owner, repo, filePath, token, callback) {
  let reqOptions = {
    hostname: 'api.github.com',
    path: `/repos/${owner}/${repo}/contents/${filePath}`,
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': ACCEPT,
      'Authorization': `token ${token}`
    }
  };
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

function _updateFile(owner, repo, filePath, token, blobSha, callback) {
  let putParams = JSON.stringify({
    message: 'Updating the readme',
    sha: blobSha,
    content: base64.encode('# gh-apps-test-repo')
  });
  let reqOptions = {
    hostname: 'api.github.com',
    path: `/repos/${owner}/${repo}/contents/${filePath}`,
    method: 'PUT',
    headers: {
      'User-Agent': USER_AGENT,
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

function _returnError(context, message) {
  context.res = {
    status: 400,
    body: `Error: ${message}`
  };
  context.done();
}