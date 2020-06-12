'use strict';
var async = require("async");

module.exports = function (app) {

  createDefaultUsers();

  function createDefaultUsers() {

    console.log('Creating roles and users');

    var Account = app.models.Account;
    var Role = app.models.Role;
    var RoleMapping = app.models.RoleMapping;

    var users = [];
    var roles = [{
      name: 'admin',
      users: [{
        firstName: 'Crown',
        lastName: 'Competitions',
        email: 'jprclouduk@gmail.com',
        username: 'admin',
        accountVerified: true,
        password: 'Raffleapp123'
      }]
    }];

    roles.forEach(function (role) {
      Role.findOrCreate({
          where: {
            name: role.name
          }
        }, // find
        {
          name: role.name
        }, // create
        function (err, createdRole, created) {
          if (err) {
            console.error('error running findOrCreate(' + role.name + ')', err);
          }
          (created) ? console.log('created role', createdRole.name): console.log('found role', createdRole.name);
          role.users.forEach(function (roleUser) {
            Account.findOrCreate({
                where: {
                  username: roleUser.username
                }
              }, // find
              roleUser, // create
              function (err, createdUser, created) {
                if (err) {
                  console.error('error creating roleUser', err);
                }
                if (created) {
                  async.waterfall([
                    // function (callback) {
                    //   sendVerification(modelInstance, function (err, result) {
                    //     if (err) next(err);
                    //     callback(err);
                    //   });
                    // },
                    function (callback) {
                      Account.app.models.Contact.create({
                        firstName: createdUser.firstName,
                        lastName: createdUser.lastName,
                        picture: null,
                        email: createdUser.email,
                        accountId: createdUser.id,
                        createdAt: new Date(),
                        createdBy: createdUser.id,
                        updatedAt: new Date(),
                        updatedBy: createdUser.id
                      }, function (err, contact) {
                        if (err) console.log(new Error(err))
                        if (!err && !contact) {
                          console.log(new Error(err))
                        }
                        callback(err, createdUser, contact);
                      });
                    },
                    function (createdUser, contact, callback) {
                      Account.app.models.Preference.create({
                        contactId: contact.id,
                        createdAt: new Date(),
                        createdBy: contact.id,
                        updatedAt: new Date(),
                        updatedBy: contact.id
                      }, function (err, preference) {
                        if (err) console.log(new Error(err))
                        if (!err && !preference) {
                          console.log(new Error(err))
                        }
                        callback(err, createdUser);
                      });
                    }
                  ])
                }
                (created) ? console.log('created user', createdUser.username): console.log('found user', createdUser.username);
                RoleMapping.findOrCreate({
                  where: {
                    principalId: createdUser.id
                  }
                }, {
                  roleId: createdRole.id,
                  principalType: RoleMapping.USER,
                  principalId: createdUser.id,
                }, function (err, rolePrincipal) {
                  if (err) {
                    console.error('error creating rolePrincipal', err);
                  }
                  users.push(createdUser);
                });
              });
          });
        });
    });
    return users;
  }
}
