const fs = require('fs');
const jwt = require('jsonwebtoken');
const https = require('https');
module.exports = function (context, req) {
  context.log('JavaScript HTTP trigger function processed a request.');
  let pemCert = fs.readFileSync('./private-key.pem');
  let issueSeconds = Math.floor(Date.now() / 1000);
  let expirySeconds = issueSeconds + 60;
  let payload = {
    iat: issueSeconds,
    exp: expirySeconds,
    iss: +process.env['IssuerId']
  };
  let token = jwt.sign(payload, pemCert, { algorithm: 'RS256' }, (err, token) => {
    console.log(err, token);
    if (err === null) {
      let reqOptions = {
        hostname: 'api.github.com',
        path: '/app/installations',
        headers: {
          'User-Agent': 'serverless-pr-bot',
          'Accept': 'application/vnd.github.machine-man-preview+json',
          'Authorization': `Bearer ${token}`
        }
      }
      const req = https.get(reqOptions, (res) => {
        console.log(res.statusCode);
        res.setEncoding('utf8');
        let fullBody = '';
        res.on('data', (body) => {
          fullBody += body;
        });
        res.on('end', () => {
          let parsedData = JSON.parse(fullBody);
          let installId = parsedData[0].id;
          console.log(installId);
          let tokenOptions = {
            hostname: 'api.github.com',
            path: `/installations/${installId}/access_tokens`,
            method: 'POST',
            headers: {
              'User-Agent': 'serverless-pr-bot',
              'Accept': 'application/vnd.github.machine-man-preview+json',
              'Authorization': `Bearer ${token}`
            }
          };
          const tokenReq = https.request(tokenOptions, (tokenRes) => {
            tokenRes.setEncoding('utf8');
            let tokenData = '';
            tokenRes.on('data', (data) => tokenData += data);
            tokenRes.on('end', () => {
              let jsonTokenData = JSON.parse(tokenData);
              let token = jsonTokenData.token;
            });
          });

          tokenReq.end();
        });
      });
    }
  });

  context.res = {
    // status: 200, /* Defaults to 200 */
    body: "Hello " + req.params.name
  };
  context.done();
};