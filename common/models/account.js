'use strict';
var async = require("async");
var passcode = require('../../server/modules/passcode');
var datasources = require('../../server/datasources.json');
var config = require('../../server/config');

module.exports = function (Account) {


  var emailDs = datasources.emailDataSource.transports[0].auth;

  Account.beforeRemote('login', function (context, unused, next) {
    Account.findOne({
      where: {
        "email": context.args.credentials.email
      }
    }, function (err, user) {
      if (err || !user) return next(err);
      if (!user.accountVerified) return next(new Error('Email for this account not yet verified'));
      next();
    })
  })

  Account.afterRemote('login', function (context, modelInstance, next) {
    var res = context.res;
    var token = context.result.__data;
    if (!token) return next(new Error('Login Failed'));

    Account.findById(token.userId, {
      include: [{
        "contact": "preference"
      }, "roles"]
    }, function (err, user) {
      if (err || !user) return next(err);
      res.send({
        created: token.created,
        id: token.id,
        ttl: token.ttl,
        user: user,
        userId: token.userId
      });
    })
  })

  Account.afterRemote('create', function (context, modelInstance, next) {
    var req = context.req;
    var user = context.result.__data;
    var names = user.fullname ? user.fullname.split(' ') : null;
    console.log(req.headers.origin);
    async.waterfall([
      function (callback) {
        sendVerification(modelInstance, context.req.headers.origin, function (err, result) {
          if (err) next(err);
          callback(err);
        });
      },
      function (callback) {
        Account.app.models.Contact.create({
          firstName: names ? names[0] : user.firstName,
          lastName: names ? names[names.length - 1] : user.lastName,
          picture: null,
          email: user.email,
          accountId: user.id,
          createdAt: new Date(),
          createdBy: user.id,
          updatedAt: new Date(),
          updatedBy: user.id
        }, function (err, contact) {
          if (err) next(new Error(err))
          if (!err && !contact) {
            next(new Error(err))
          }
          callback(err, user, contact);
        });
      },
      function (user, contact, callback) {
        Account.app.models.Preference.create({
          contactId: contact.id,
          createdAt: new Date(),
          createdBy: contact.id,
          updatedAt: new Date(),
          updatedBy: contact.id
        }, function (err, preference) {
          if (err) next(new Error(err))
          if (!err && !preference) {
            next(new Error(err))
          }
          next(err, user);
        });
      }
    ])
  });


  function sendVerification(user, origin, cb) {

    var options = {
      to: user.email,
      from: emailDs.user,
      subject: 'Email Address Verification',
      html: `
      <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta name="viewport" content="width=device-width" />
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<title>Email Address Verification</title>

<style>
/* -------------------------------------
    GLOBAL
------------------------------------- */
* {
  margin: 0;
  padding: 0;
  font-family: "Helvetica Neue", "Helvetica", Helvetica, Arial, sans-serif;
  box-sizing: border-box;
  font-size: 14px;
}

img {
  max-width: 100%;
}

body {
  -webkit-font-smoothing: antialiased;
  -webkit-text-size-adjust: none;
  width: 100% !important;
  height: 100%;
  line-height: 1.6;
}

/* Let's make sure all tables have defaults */
table td {
  vertical-align: top;
}

/* -------------------------------------
    BODY & CONTAINER
------------------------------------- */
body {
  background-color: #f6f6f6;
}

.body-wrap {
  background-color: #f6f6f6;
  width: 100%;
}

.container {
  display: block !important;
  max-width: 600px !important;
  margin: 0 auto !important;
  /* makes it centered */
  clear: both !important;
}

.content {
  max-width: 600px;
  margin: 0 auto;
  display: block;
  padding: 20px;
}

.social ul {
    overflow: auto;
    list-style-type: none;
    text-align: center;
    
}

.social li {
 	display: inline;
}

.social p {
    text-align: center;
}

/* -------------------------------------
    HEADER, FOOTER, MAIN
------------------------------------- */
.main {
  background: #fff;
  border: 1px solid #e9e9e9;
  border-radius: 3px;
}

.content-wrap {
  padding: 20px;
}

.content-block {
  padding: 0 0 20px;
}

.header {
  width: 100%;
  margin-bottom: 20px;
}

.footer {
  width: 100%;
  clear: both;
  color: #999;
  padding: 20px;
}
.footer a {
  color: #999;
}
.footer p, .footer a, .footer unsubscribe, .footer td {
  font-size: 12px;
}

/* -------------------------------------
    GRID AND COLUMNS
------------------------------------- */
.column-left {
  float: left;
  width: 50%;
}

.column-right {
  float: left;
  width: 50%;
}

/* -------------------------------------
    TYPOGRAPHY
------------------------------------- */
h1, h2, h3 {
  font-family: "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif;
  color: #000;
  margin: 40px 0 0;
  line-height: 1.2;
  font-weight: 400;
}

h1 {
  font-size: 32px;
  font-weight: 500;
}

h2 {
  font-size: 24px;
}

h3 {
  font-size: 18px;
}

h4 {
  font-size: 14px;
  font-weight: 600;
}

p, ul, ol {
  margin-bottom: 10px;
  font-weight: normal;
}
p li, ul li, ol li {
  margin-left: 5px;
  list-style-position: inside;
}

/* -------------------------------------
    LINKS & BUTTONS
------------------------------------- */
a {
  color: #348eda;
  text-decoration: underline;
}

.btn-primary {
  text-decoration: none;
  color: #FFF;
  background-color: #348eda;
  border: solid #348eda;
  border-width: 10px 20px;
  line-height: 2;
  font-weight: bold;
  text-align: center;
  cursor: pointer;
  display: inline-block;
  border-radius: 5px;
  text-transform: capitalize;
}

/* -------------------------------------
    OTHER STYLES THAT MIGHT BE USEFUL
------------------------------------- */
.last {
  margin-bottom: 0;
}

.first {
  margin-top: 0;
}

.padding {
  padding: 10px 0;
}

.aligncenter {
  text-align: center;
}

.alignright {
  text-align: right;
}

.alignleft {
  text-align: left;
}

.clear {
  clear: both;
}

/* -------------------------------------
    Alerts
------------------------------------- */
.alert {
  font-size: 16px;
  color: #fff;
  font-weight: 500;
  padding: 20px;
  text-align: center;
  border-radius: 3px 3px 0 0;
}
.alert a {
  color: #fff;
  text-decoration: none;
  font-weight: 500;
  font-size: 16px;
}
.alert.alert-warning {
  background: #ff9f00;
}
.alert.alert-bad {
  background: #d0021b;
}
.alert.alert-good {
  background: #68b90f;
}
.alert.alert-calm {
  background: #259EE6;
}

/* -------------------------------------
    INVOICE
------------------------------------- */
.invoice {
  margin: 40px auto;
  text-align: left;
  width: 80%;
}
.invoice td {
  padding: 5px 0;
}
.invoice .invoice-items {
  width: 100%;
}
.invoice .invoice-items td {
  border-top: #eee 1px solid;
}
.invoice .invoice-items .total td {
  border-top: 2px solid #333;
  border-bottom: 2px solid #333;
  font-weight: 700;
}

/* -------------------------------------
    RESPONSIVE AND MOBILE FRIENDLY STYLES
------------------------------------- */
@media only screen and (max-width: 640px) {
  h1, h2, h3, h4 {
    font-weight: 600 !important;
    margin: 20px 0 5px !important;
  }

  h1 {
    font-size: 22px !important;
  }

  h2 {
    font-size: 18px !important;
  }

  h3 {
    font-size: 16px !important;
  }

  .container {
    width: 100% !important;
  }

  .content, .content-wrapper {
    padding: 10px !important;
  }

  .invoice {
    width: 100% !important;
  }
}
</style>

</head>

<body>

<table class="body-wrap">
	<tr>
		<td></td>
		<td class="container" width="600">
			<div class="content">
				<table class="main" width="100%" cellpadding="0" cellspacing="0">
					<tr>
						<td class="alert alert-calm">
							Verify your email
						</td>
					</tr>
					<tr>
						<td class="content-wrap">
							<table width="100%" cellpadding="0" cellspacing="0">
								<tr>
									<td class="content-block">
										Hi, Welcome to the <strong>Raffler Community.</strong> 
									</td>
								</tr>
								<tr>
									<td class="content-block">
Most of our competition winners will pay on average less than £30 - imagine winning a Range Rover, Smart TV or trip to New York for less than the cost of a restaurant meal. Even better you can also win ca$h.									</td>
								</tr>
								<tr>
									<td class="content-block">
										<a href="${origin}/${config.emailVerifiyLink}" class="btn-primary">Verify Email</a>
									</td>
								</tr>
								<tr>
																		<td class="content-block">
										Thanks for choosing Raffler LTD.
									</td>
								</tr>
							</table>
						</td>
					</tr>
				</table>
				<div class="footer">
					<table width="100%">
						<tr>
							<td class="aligncenter content-block"><a href="%unsubscribe_url%">Unsubscribe</a> from these alerts.</td>
<div class="social">
  <ul>
        <li><a href="#"> T&Cs</a></li>
        <li><a href="#"> Privacy Policy</a></li>
        <li><a href="#" target="_blank"> Facebook</a></li>
        <li><a href="#" target="_blank"> Twitter</a></li>
        <li><a href="#" target="_blank"> Instagram</a></li>
  </ul>
  <p>Raffler LTD | +44 (020) 1234 1234 | 101, London, E1 8UU</p>
</div>

						</tr>
					</table>
				</div></div>
		</td>
		<td></td>
	</tr>
</table>

</body>
</html>      
      `
    }
    // <h3>Your verification code is: </h3><br/><br/><strong><h3>#!pin!#</h3></strong>

    user.sendVerification(options, function (err, response) {
      if (err) return cb(err);
      return cb(null);
    });
  };

  Account.prototype.sendVerification = function (options, cb) {
    var user = this;
    var recipients = options.to ? options.to : options.recipients.toString();
    var _passcode = passcode.generatePasscode();
    user.updateAttributes({
      "passcode": _passcode
    }, function (err, user) {
      if (err) {
        return cb(err);
      }

      options.html = options.html.replace(/\#\!pin\!\#/g, _passcode).replace(/\#\!id\!\#/g, user.id).replace(/\#\!email\!\#/g, recipients);
      Account.email.send(options, function (err, email) {
        if (err) return cb(err);
        console.log(_passcode);
        cb(null);
      });
    });
  };

  Account.verifyEmail = function (options, data, cb) {

    async.waterfall([
      function (callback) {
        Account.findOne({
          where: {
            and: [{
                "passcode": data.passcode
              },
              {
                email: data.email
              }
            ]
          }
        }, function (err, user) {
          if (err || !user) return cb(new Error('Account not found: Check passcode'));
          if (user.accountVerified) return cb(new Error('Email has already been verified'));
          callback(err, user);
        })
      },
      function (user, callback) {
        user.updateAttributes({
          "passcode": null,
          "accountVerified": true
        }, function (err, user) {
          if (err) return cb(err);
          cb(null, true);
        });
      },
    ]);
  }

  Account.remoteMethod('verifyEmail', {
    description: 'Verifies the user Email address',
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
      path: '/verify-email',
      verb: 'post',
      status: 200,
      errorStatus: 500
    }
  });

  Account.resendVerification = function (data, req, cb) {
    if (!data.email) return cb(new Error('Email not Provided'));
    Account.findOne({
      where: {
        email: data.email
      }
    }, function (err, user) {
      if (err || !user) return cb(new Error('Email is not associated to an account. Use Sign up'));
      if (user.accountVerified) return cb(new Error('Email has already been verified'));
      sendVerification(user, req, function (err, result) {
        if (err) return cb(err);
        cb(null, true);
      });
    })
  }

  Account.remoteMethod('resendVerification', {
    description: 'Resends the user verification passcode.',
    accepts: [{
        arg: 'data',
        type: 'object',
        required: true,
        http: {
          source: 'body'
        }
      },
      {
        arg: 'req',
        type: 'object',
        'http': {
          source: 'req'
        }
      }
    ],
    returns: {
      arg: 'success',
      type: 'boolean',
      root: true
    },
    http: {
      path: '/resend-verification/',
      verb: 'post',
      status: 200,
      errorStatus: 500
    }
  });

  function sendPasswordReset(user, req, cb) {

    var options = {
      to: user.email,
      from: emailDs.user,
      subject: 'Password Reset',
      html: `
      <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
      <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
      <meta name="viewport" content="width=device-width" />
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <title>Password Reset</title>
      
      <style>
      /* -------------------------------------
          GLOBAL
      ------------------------------------- */
      * {
        margin: 0;
        padding: 0;
        font-family: "Helvetica Neue", "Helvetica", Helvetica, Arial, sans-serif;
        box-sizing: border-box;
        font-size: 14px;
      }
      
      img {
        max-width: 100%;
      }
      
      body {
        -webkit-font-smoothing: antialiased;
        -webkit-text-size-adjust: none;
        width: 100% !important;
        height: 100%;
        line-height: 1.6;
      }
      
      /* Let's make sure all tables have defaults */
      table td {
        vertical-align: top;
      }
      
      /* -------------------------------------
          BODY & CONTAINER
      ------------------------------------- */
      body {
        background-color: #f6f6f6;
      }
      
      .body-wrap {
        background-color: #f6f6f6;
        width: 100%;
      }
      
      .container {
        display: block !important;
        max-width: 600px !important;
        margin: 0 auto !important;
        /* makes it centered */
        clear: both !important;
      }
      
      .content {
        max-width: 600px;
        margin: 0 auto;
        display: block;
        padding: 20px;
      }
      
      .social ul {
          overflow: auto;
          list-style-type: none;
          text-align: center;
          
      }
      
      .social li {
         display: inline;
      }
      
      .social p {
          text-align: center;
      }
      
      /* -------------------------------------
          HEADER, FOOTER, MAIN
      ------------------------------------- */
      .main {
        background: #fff;
        border: 1px solid #e9e9e9;
        border-radius: 3px;
      }
      
      .content-wrap {
        padding: 20px;
      }
      
      .content-block {
        padding: 0 0 20px;
      }
      
      .header {
        width: 100%;
        margin-bottom: 20px;
      }
      
      .footer {
        width: 100%;
        clear: both;
        color: #999;
        padding: 20px;
      }
      .footer a {
        color: #999;
      }
      .footer p, .footer a, .footer unsubscribe, .footer td {
        font-size: 12px;
      }
      
      /* -------------------------------------
          GRID AND COLUMNS
      ------------------------------------- */
      .column-left {
        float: left;
        width: 50%;
      }
      
      .column-right {
        float: left;
        width: 50%;
      }
      
      /* -------------------------------------
          TYPOGRAPHY
      ------------------------------------- */
      h1, h2, h3 {
        font-family: "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif;
        color: #000;
        margin: 40px 0 0;
        line-height: 1.2;
        font-weight: 400;
      }
      
      h1 {
        font-size: 32px;
        font-weight: 500;
      }
      
      h2 {
        font-size: 24px;
      }
      
      h3 {
        font-size: 18px;
      }
      
      h4 {
        font-size: 14px;
        font-weight: 600;
      }
      
      p, ul, ol {
        margin-bottom: 10px;
        font-weight: normal;
      }
      p li, ul li, ol li {
        margin-left: 5px;
        list-style-position: inside;
      }
      
      /* -------------------------------------
          LINKS & BUTTONS
      ------------------------------------- */
      a {
        color: #348eda;
        text-decoration: underline;
      }
      
      .btn-primary {
        text-decoration: none;
        color: #FFF;
        background-color: #348eda;
        border: solid #348eda;
        border-width: 10px 20px;
        line-height: 2;
        font-weight: bold;
        text-align: center;
        cursor: pointer;
        display: inline-block;
        border-radius: 5px;
        text-transform: capitalize;
      }
      
      /* -------------------------------------
          OTHER STYLES THAT MIGHT BE USEFUL
      ------------------------------------- */
      .last {
        margin-bottom: 0;
      }
      
      .first {
        margin-top: 0;
      }
      
      .padding {
        padding: 10px 0;
      }
      
      .aligncenter {
        text-align: center;
      }
      
      .alignright {
        text-align: right;
      }
      
      .alignleft {
        text-align: left;
      }
      
      .clear {
        clear: both;
      }
      
      /* -------------------------------------
          Alerts
      ------------------------------------- */
      .alert {
        font-size: 16px;
        color: #fff;
        font-weight: 500;
        padding: 20px;
        text-align: center;
        border-radius: 3px 3px 0 0;
      }
      .alert a {
        color: #fff;
        text-decoration: none;
        font-weight: 500;
        font-size: 16px;
      }
      .alert.alert-warning {
        background: #ff9f00;
      }
      .alert.alert-bad {
        background: #d0021b;
      }
      .alert.alert-good {
        background: #68b90f;
      }
      .alert.alert-calm {
        background: #259EE6;
      }
      
      /* -------------------------------------
          INVOICE
      ------------------------------------- */
      .invoice {
        margin: 40px auto;
        text-align: left;
        width: 80%;
      }
      .invoice td {
        padding: 5px 0;
      }
      .invoice .invoice-items {
        width: 100%;
      }
      .invoice .invoice-items td {
        border-top: #eee 1px solid;
      }
      .invoice .invoice-items .total td {
        border-top: 2px solid #333;
        border-bottom: 2px solid #333;
        font-weight: 700;
      }
      
      /* -------------------------------------
          RESPONSIVE AND MOBILE FRIENDLY STYLES
      ------------------------------------- */
      @media only screen and (max-width: 640px) {
        h1, h2, h3, h4 {
          font-weight: 600 !important;
          margin: 20px 0 5px !important;
        }
      
        h1 {
          font-size: 22px !important;
        }
      
        h2 {
          font-size: 18px !important;
        }
      
        h3 {
          font-size: 16px !important;
        }
      
        .container {
          width: 100% !important;
        }
      
        .content, .content-wrapper {
          padding: 10px !important;
        }
      
        .invoice {
          width: 100% !important;
        }
      }
      </style>
      
      </head>
      
      <body>
      
      <table class="body-wrap">
        <tr>
          <td></td>
          <td class="container" width="600">
            <div class="content">
              <table class="main" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="alert alert-warning">
                    Password Reset
                  </td>
                </tr>
                <tr>
                  <td class="content-wrap">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td class="content-block">
                          Hi, click the link below to <strong>reset</strong> your password.
                        </td>
                      </tr>
                      <tr>
                        <td class="content-block">
      Want to play but your numbers have already been picked by someone else. Don't worry, hit the 'Lucky Dip' button and watch our AI algorithm pick you some new numbers from the remaining batch.								</td>
                      </tr>
                      <tr>
                        <td class="content-block">
                          <a href="${req.headers.origin}/${config.passwordResetLink}" class="btn-primary">Verify Email</a>
                        </td>
                      </tr>
                      <tr>
                        <td class="content-block">
                          Thanks for choosing Raffler LTD.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <div class="footer">
                <table width="100%">
                  <tr>
                    <td class="aligncenter content-block"><a href="%unsubscribe_url%">Unsubscribe</a> from these alerts.</td>
      <div class="social">
        <ul>
              <li><a href="#"> T&Cs</a></li>
              <li><a href="#"> Privacy Policy</a></li>
              <li><a href="#" target="_blank"> Facebook</a></li>
              <li><a href="#" target="_blank"> Twitter</a></li>
              <li><a href="#" target="_blank"> Instagram</a></li>
        </ul>
        <p>Raffler LTD | +44 (020) 1234 1234 | 101, London, E1 8UU</p>
      </div>
      
                  </tr>
                </table>
              </div></div>
          </td>
          <td></td>
        </tr>
      </table>
      
      </body>
      </html>
      `
    };

    user.sendVerification(options, function (err, response) {
      if (err) return cb(err);
      return cb(null);
    });
  };

  //send password reset OTP when requested
  Account.resetPasswordRequest = function (data, req, cb) {
    Account.findOne({
        where: {
          and: [{
            email: data.email
          }]
        }
      },
      function (err, user) {
        if (!user) return cb(new Error('User Not Found'));
        if (err) return cb(new Error(err));
        sendPasswordReset(user, req, function (err, result) {
          if (err) return cb(err);
          return cb(null, true);
        });
      })
  }
  Account.remoteMethod('resetPasswordRequest', {
    description: 'Send password reset Token.',
    accepts: [{
        arg: 'credentials',
        type: 'object',
        required: true,
        http: {
          source: 'body'
        }
      },
      {
        arg: 'req',
        type: 'object',
        'http': {
          source: 'req'
        }
      }
    ],
    returns: {
      arg: 'success',
      type: 'boolean',
      root: true
    },
    http: {
      path: '/reset-password-request',
      verb: 'post',
      status: 200,
      errorStatus: 500
    }
  });

  Account.resetAccountPassword = function (data, cb) {
    async.waterfall([
      function (callback) {
        Account.findOne({
          where: {
            and: [{
              "passcode": data.passcode
            }, {
              "accountVerified": true
            }]
          }
        }, function (err, user) {
          if (err || !user) return cb(new Error('Account not found: Check passcode'));
          callback(err, user);
        })
      },
      function (user, callback) {
        user.updateAttributes({
          "passcode": null,
          'password': Account.hashPassword(data.password)
        }, function (err) {
          if (err) return cb(new Error('Error Updating Password'))
          cb(null, true);
        });
      }
    ]);
  }
  Account.remoteMethod('resetAccountPassword', {
    description: 'Resets the user password',
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
      path: '/reset-account-password',
      verb: 'post',
      status: 200,
      errorStatus: 500
    }
  });

  Account.socialLogin = function (data, cb) {

    var filter = {
      or: [{
        email: data.email
      }]
    };

    Account.find({
      where: filter
    }, function (err, users) {
      var user = users[0];
      if (user) {
        if ((data.provider === 'FACEBOOK' && user.facebook === data.id) || (data.provider === 'GOOGLE' && user.google === data.id)) {
          return cb(null, true);
        }
        return cb(new Error('This user already has an account'));
      } else {
        async.waterfall([
          function (callback) {
            Account.create({
              displayName: data.name,
              firstName: data.firstName || data.givenName,
              lastName: data.lastName || data.familyName,
              picture: data.photoUrl,
              facebook: data.facebook ? data.id : null,
              google: data.google ? data.id : null,
              email: data.email,
              accountVerified: true,
              password: data.id
            }, function (err, user) {
              if (err) {
                return cb(new Error('Error Creating User'));
              }
              callback(err, user);
            });
          },
          function (user, callback) {
            Account.app.models.Contact.create({
              firstName: user.firstName,
              lastName: user.lastName,
              picture: user.picture,
              email: user.email,
              gender: data.gender || null,
              accountId: user.id,
              createdAt: new Date(),
              createdById: user.id,
              updatedAt: new Date(),
              updatedById: user.id
            }, function (err, contact) {
              if (err) {
                return cb(new Error('Error Creating User Contact'));
              }
              callback(err, user, contact);
            });
          },
          function (user, contact, callback) {
            Account.app.models.Preference.create({
              contactId: contact.id,
              createdAt: new Date(),
              createdById: contact.id,
              updatedAt: new Date(),
              updatedById: contact.id
            }, function (err, preference) {
              if (err) {
                return cb(new Error('Error Creating Preference'));
              }
              return cb(null, true);
            });
          }
        ]);
      }
    })

  }
  Account.remoteMethod('socialLogin', {
    description: 'Login with social media account',
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
      path: '/social-login',
      verb: 'post',
      status: 200,
      errorStatus: 500
    }
  });

  function sendEmail(user, subject, content, cb) {

    var options = {
      to: user,
      from: emailDs.user,
      subject: subject,
      html: content,
    };
    Account.email.send(options, function (err, email) {
      if (err) return cb(err);
      return cb(null);
    });
  };

  Account.sendUserEmail = function (data, cb) {
    const emails = data.emails;
    const emailData = data.emailData;
    if (!emails instanceof Array) console.log(new Error('Data not in the correct format'));

    emails.forEach(function (email) {
      Account.findOne({
        where: {
          email: email
        }
      }, function (err, user) {
        if (err || !user) console.log(new Error('Email is not associated to an account. Use Sign up'));
        if (user.accountVerified) console.log(new Error('Email has already been verified'));
        sendEmail(user.email, emailData.subject, emailData.content, function (err, result) {
          if (err) return cb(err);
        });
      });
    });
    cb(null);
  }

  Account.remoteMethod('sendUserEmail', {
    description: 'sends email to list of users',
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
      path: '/send-user-email/',
      verb: 'post',
      status: 200,
      errorStatus: 500
    }
  });

  Account.sendEmail = function (data, cb) {
    const emails = data.emails;
    const emailData = data.emailData;
    if (!emails instanceof Array) console.log(new Error('Data not in the correct format'));

    emails.forEach(function (email) {
      Account.findOne({
        where: {
          email: email
        }
      }, function (err, user) {
        sendEmail(email, emailData.subject, emailData.content, function (err, result) {
          if (err) return cb(err);
          return cb(null);
        });
      });
    });

  }

  Account.remoteMethod('sendEmail', {
    description: 'sends email to list of emails that arent users',
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
      path: '/send-email/',
      verb: 'post',
      status: 200,
      errorStatus: 500
    }
  });

  Account.setInvitationCode = function (data, cb) {
    async.waterfall([
      function (callback) {
        Account.findById(data.id, function (err, user) {
          if (err || !user) return cb(new Error('Account not found'));
          callback(err, user);
        })
      },
      function (user, callback) {
        user.updateAttributes({
          "invitivationCode": passcode.generatePasscode(),
        }, function (err) {
          if (err) return cb(new Error('Error Updating Account'))
          cb(null, user);
        });
      }
    ]);
  }
  Account.remoteMethod('setInvitationCode', {
    description: 'Set Invitation Code',
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
      path: '/set-invitation-code',
      verb: 'post',
      status: 200,
      errorStatus: 500
    }
  });
};
