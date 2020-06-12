'use strict';

module.exports = function (Model, options) {

  Model.observe('before save', function event(ctx, next) {
    if (ctx.instance) {
      ctx.instance.updatedAt = new Date();
      if (ctx.isNewInstance) {
        ctx.instance.createdAt = new Date();
      }
    } else {
      ctx.data.updatedAt = new Date();
      if (ctx.isNewInstance) {
        ctx.data.createdAt = new Date();
      }
    }
    next();
  });
};
