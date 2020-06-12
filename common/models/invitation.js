'use strict';
var async = require("async");
module.exports = function (Invitation) {

  Invitation.claim = function (options, data, cb) {

    async.waterfall([
      function (callback) {
        Invitation.findOne({
          where: {
            and: [{
                accountId: data.senderId
              },
              {
                receiverEmail: data.email
              },
              {
                code: data.code
              }
            ]
          }
        }, function (err, invite) {
          if (err || !invite) return cb(new Error('No Invite found: Make sure you have the right email address'));
          callback(err, invite);
        })
      },
      function (invite, callback) {
        invite.updateAttributes({
          hasSignedUp: true,
        }, function (err, invite) {
          if (err) return cb(err);
          cb(null, true);
        });
      },
    ]);
  }
  Invitation.remoteMethod('claim', {
    description: 'flags an invitation has had a sign up',
    accepts: [{
      arg: 'options',
      type: 'object',
      http: 'optionsFromRequest'
    }, {
      arg: 'data',
      type: 'object',
      required: true,
      http: {
        source: 'body'
      }
    }],
    returns: {
      arg: 'success',
      type: 'boolean',
      root: true
    },
    http: {
      path: '/claim',
      verb: 'post',
      status: 200,
      errorStatus: 500
    }
  });
};
