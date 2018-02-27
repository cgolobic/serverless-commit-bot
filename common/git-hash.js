const crypto = require('crypto');

module.exports = function(data, gitObjectType) {
  let byteLength = Buffer.byteLength(data);
  let gitHeader = `${gitObjectType} ${byteLength}\0`;
  let content = gitHeader + data;
  let shaHash = crypto.createHash('sha1');
  shaHash.update(content);
  return shaHash.digest('hex');
}