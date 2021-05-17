var express = require('express');
var router = express.Router();
var path = require('path');
var fs = require('fs');
var sanitizeHtml = require('sanitize-html');
var shortid = require('shortid');
var db = require('../lib/db2');
var bcrypt = require('bcrypt');

module.exports = function (passport) {
  router.get('/login', function (request, response) {
    var fmsg = request.flash();
    var feedback = '';
    if (fmsg.error) {
      feedback = fmsg.error[0];
    }
    response.redirect('/login')
  });

  router.post('/login_process',
    passport.authenticate('local', {
      successRedirect: '/',
      failureRedirect: '/login',
      failureFlash: true,
      successFlash: true
    }));

  router.get('/join', function (request, response) {
    var fmsg = request.flash();
    var feedback = '';
    if (fmsg.error) {
      feedback = fmsg.error[0];
    }
    response.redirect('/join')
  });

  router.post('/join', function (request, response) {
    var post = request.body;
    var phone = post.phone;
    var pwd = post.pwd;
    

      bcrypt.hash(pwd, 10, function (err, hash) {
        var user = {
          id: shortid.generate(),
          phone: phone,
          password: hash

        };
        db2.get('users').push(user).write();
        request.login(user, function (err) {
          console.log('redirect');
          return response.redirect('/');
        })
      });
    
  });

  router.get('/logout', function (request, response) {
    request.logout();
    request.session.save(function () {
      response.redirect('/');
    });
  });

  return router;
}