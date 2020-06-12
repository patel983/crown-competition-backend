'use strict';
var async = require("async");

module.exports = function (Rafflewinner) {

  Rafflewinner.getWinningNumbers = function (data, cb) {
    if (!data) return cb(new Error('No Data Provided'));
    if (data.isCompleted) return cb(new Error('Raffle already has winning numbers generated'));

    async.waterfall([
      function (callback) {
        const raffleWinners = [];

        for (let index = 0; index < data.maxWinners; index++) {
          Rafflewinner.create({
            winningNumber: generateRandomNumber(data.maxOptions),
            isDeleted: false,
            raffleDrawId: data.id,
            createdAt: new Date(),
            updatedAt: new Date()
          }, function (err, raffleWinner) {
            if (err || !raffleWinner) return cb(new Error('There was an error'));
            raffleWinners.push(raffleWinner)
          });
        }
        callback(null, raffleWinners);
      },
      function (raffleWinners, callback) {
        raffleWinners.forEach(function (winner) {
          Rafflewinner.app.models.RaffleEntry.find({
              where: {
                entrynumber: winner.winningNumber,
                raffleDrawId: data.id
              }
            },
            function (err, _raffleEntry) {
              if (err || !_raffleEntry) return next(err);
              _raffleEntry.updateAttributes({
                "isWinningEntry": true
              }, function (err, params) {
                if (err || !params) return cb(new Error('There was an error'));
              })
            })
        });
        callback(null, raffleWinners);
      },
      function (raffleWinners, callback) {
        data.isCompleted = true;
        Rafflewinner.app.models.RaffleDraw.findById(data.id,
          function (err, _raffle) {
            if (err || !_raffle) return next(err);
            _raffle.updateAttributes({
                "isCompleted": true
              },
              function (err, raffle) {
                cb(null, {
                  raffleWinners,
                  raffle
                })
              });
          })
      }
    ])
  }

  Rafflewinner.remoteMethod('getWinningNumbers', {
    description: 'Resends the user verification passcode.',
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
      type: 'boolean',
      root: true
    },
    http: {
      path: '/get-winning-numbers/',
      verb: 'post',
      status: 200,
      errorStatus: 500
    }
  });

  function generateRandomNumber(end) {
    return Math.floor(Math.random() * end) + 1;
  }

};
