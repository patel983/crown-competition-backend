'use strict';

module.exports = function (Model, options) {

  Model.observe('after save', function event(ctx, next) {
    var userId = null;

    if (ctx.options && ctx.options.accessToken) {
      userId = ctx.options.accessToken.userId;
    }

    if (ctx.instance) {
      if (ctx.isNewInstance) {
        ctx.instance.createdById = !userId ? ctx.instance.createdById : userId;
      }
      ctx.instance.updatedById = !userId ? ctx.instance.createdById : userId;
    } else {
      if (ctx.isNewInstance) {
        ctx.data.createdById = !userId ? ctx.instance.createdById : userId;
      }
      ctx.data.updatedById = !userId ? ctx.instance.createdById : userId;
    }
    next();
  });
};