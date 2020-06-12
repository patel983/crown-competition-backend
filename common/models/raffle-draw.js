'use strict';
var schedule = require('node-schedule');

module.exports = function (Raffledraw) {

  // Raffledraw.observe('after save', function (context, next) {

  //   var raffle = context.instance;
  //   var date = addMinutes(new Date(), 1) // addMinutes(new Date(raffle.endDate), 60);
  //   if (context.isNewInstance === true) {
  //     var j = schedule.scheduleJob(date, function () {
  //       Raffledraw.app.models.Raffleentry.upsert({
  //         isWinningEntry: generateRandomNumber(raffle.maxOptions),
  //       }, function (err, entry) {
  //         if (err) next(new Error(err));
  //         if (!err && !entry) {
  //           next(new Error(err));
  //         }
  //         next();
  //       });
  //     });
  //   }
  //   next();
  // });

  function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60000);
  }

  function generateRandomNumber(end) {
    return Math.floor(Math.random() * end) + 1;
  }

};
