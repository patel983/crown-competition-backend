'use strict';

var config = require('../../server/config');

module.exports = function (Payment) {

  var stripe = require("stripe")(config.stripe_private_key);

  //send password reset OTP when requested
  Payment.start = function (data, cb) {
    stripe.paymentIntents.create({
        amount: data.amount,
        currency: data.currency
      },
      function (err, clientSecret) {
        if (err) return cb(err)
        return cb(null, clientSecret)
      })
  }
  Payment.remoteMethod('start', {
    description: 'create a payment intent',
    accepts: [{
      arg: 'data',
      type: 'object',
      required: true,
      http: {
        source: 'body'
      }
    }],
    returns: {
      arg: 'success',
      type: 'object',
      root: true
    },
    http: {
      path: '/start',
      verb: 'post',
      status: 200,
      errorStatus: 500
    }
  });

};
