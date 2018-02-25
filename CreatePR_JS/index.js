const fs = require('fs');
const jwt = require('jsonwebtoken');
const https = require('https');
const base64 = require('js-base64').Base64;

module.exports = function (context, req) {
  let token = _getJwtToken();
  _getInstallations(token, (installations) => {
    _getAccessToken(installations[0].id, token, (token) => {
      console.log(token);
      _getBlobShaForFile('README.md', token, (data) => {
        _updateFile('README.md', token, data.sha, (data2) => console.log(data2));
      });
    });
  });
  context.res = {
    // status: 200, /* Defaults to 200 */
    body: "Hello " + req.params.name
  };
  context.done();
}

function _getJwtToken() {
  let pemCert = fs.readFileSync('./private-key.pem');
  let issueSeconds = Math.floor(Date.now() / 1000);
  let expirySeconds = issueSeconds + 60;
  let payload = {
    iat: issueSeconds,
    exp: expirySeconds,
    iss: +process.env['IssuerId']
  };
  return jwt.sign(payload, pemCert, { algorithm: 'RS256' });
}

function _getInstallations(jwt, callback) {
  let reqOptions = {
    hostname: 'api.github.com',
    path: '/app/installations',
    headers: {
      'User-Agent': 'serverless-pr-bot',
      'Accept': 'application/vnd.github.machine-man-preview+json',
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
      'User-Agent': 'serverless-pr-bot',
      'Accept': 'application/vnd.github.machine-man-preview+json',
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

function _getBlobShaForFile(filePath, token, callback) {
  let reqOptions = {
    hostname: 'api.github.com',
    path: `/repos/cgolobic/gh-apps-test-repo/contents/${filePath}`,
    headers: {
      'User-Agent': 'serverless-pr-bot',
      'Accept': 'application/vnd.github.machine-man-preview+json',
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

function _updateFile(filePath, token, blobSha, callback) {
  let putParams = JSON.stringify({
    message: 'Updating the readme',
    sha: blobSha,
    content: base64.encode('# gh-apps-test-repo')
  });
  let reqOptions = {
    hostname: 'api.github.com',
    path: `/repos/cgolobic/gh-apps-test-repo/contents/${filePath}`,
    method: 'PUT',
    headers: {
      'User-Agent': 'serverless-pr-bot',
      'Accept': 'application/vnd.github.machine-man-preview+json',
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