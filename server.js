const express = require("express");
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const csurf = require('csurf')
const helmet = require('helmet')
const passport = require('passport')
// const LocalStrategy = require('passport-local').LocalStrategy
var LocalStrategy   = require('passport-local').Strategy
const db = require('./routes/db')(session)
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const crypto = require('crypto');
const app = express();
var flash = require('connect-flash');
  

// ES6 Module loader
const nunjucks = require('nunjucks');
nunjucks.configure('views', {
  autoescape: true,
  express: app
});
app.set('view engine', 'html');
app.use(express.static("public"));

app.use(session({
	secret: 'awesome auth',
	store: db.SessionStore,
	resave: false,
	saveUninitialized: true
}))

const db_name = path.join(__dirname, "data", "apptest.db");
const dbS = new sqlite3.Database(db_name, err => {
  if (err) {
    return console.error(err.message);
  }
  console.log("Connexion réussie à la base de données 'apptest.db'");
});
//Security
app.use(passport.initialize())
app.use(passport.session())
const passportConfig = { failureRedirect: '/login'}
app.use(flash());


// app.post('/join', passport.authenticate('local-join', {
//   successRedirect: '/subscribe',
//   failureRedirect: '/join',
//   failureFlash: true
// }));

const authRequired = (req, res, next) => {
	if (req.user) return next()
	else res.redirect('/login?required=1')
}

app.use((req, res, next) => {
	res.locals.user = req.user
	res.locals.isLoggedIn = (req.user && req.user.phone > 0)
	next()
})



passport.serializeUser((user, cb) => {
	cb(null, user.id)
})

passport.use(new LocalStrategy((phone,password,done) => {
  db.getUserByPhone(phone)
  .then(async (phone) => {
    if (!phone) return done(new Error('등록되지 않은 번호입니다'), false)
    if (!(await db.isPasswordHashVerified(phone.password_hash,password))) return done(new Error('Invalid Password'), false)
    return done(null, phone)
  })
  .catch((err) =>{
    return done(err)
  })
}))

//should change
passport.serializeUser((user,cb) => {
  cb(null, user.id)
})

passport.deserializeUser((id, cb) => {
  db.getUserById(id)
  .then((user)=>{
    cb(null,user)
  })
  .catch((err) => {
    cb(err,null)
  })
})




// Démarrage du serveur
app.listen(503, () => {
    console.log("Serveur démarré (http://localhost:503/ ) !");
});

// GET /
app.get("/", (req, res) => {
  // res.send("Bonjour le monde...");
  res.render("index.html");
});

// GET /about
app.get("/about", (req, res) => {
  res.render("about");
});

app.get("/subscribe", (req, res) => {
  res.render("subscribe");
});

app.get("/join", (req, res) => {
  res.render("join");
});


app.all('/login', (req,res,next) => {
  new Promise((resolve, reject) => {
    if(req.method === 'GET') {return reject()}
    if(req.body.phone && req.body.password){
      passport.authenticate('local', (err,user, info)=>{
        if(!err && user){
          return resolve(user)
        }
        reject(err)
      })(req,res,next)
    }
else{
  reject(new Error('다 채워주세요'))
}
})
.then(user => new Promise((resolve, reject)=> {
  req.login(user,err => {
    if(err) return reject(err)
    console.log('auth completed', user)
    res.redirect('/')
  })
}))
.catch(error => {
			let errorMsg = (error && error.message) || ''
			if (!error && req.query.required) errorMsg = 'Authentication required'

			res.render('login', {
			
				hasError: (errorMsg && errorMsg.length > 0),
				error: errorMsg,
				form: req.body,
			})
		})
})

passport.serializeUser(function(user, done) {
  // the values returned here will be used to deserializeUser
  // this can be use for further logins
  done(null, {username: user.username, _id: user.id, role: user.role});
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});


passport.use(new LocalStrategy(function(username, password, done){
  odm.User.findOne({username: username, authType: 'direct'}, function(err, user){
      if(err){
          return done(err, false);
      }
      if(!user){
          return done(null, false);
      }
      if(user.role === 'new'){
          console.log('can not use new user!');
          return done('user not activated yet, please contact admin', false);
      }
      user.comparePassword(password,function(err, isMatch){
          if(err){
              return done(err, false);
          }
          if(isMatch){
              return done(null, user);//{username: username});
          }
          return done(null, false);
      });
  });
}));
app.post('/login',  function(req, res, next){
      passport.authenticate('local', {
          failureRedirect: '/logout?status=login failed'
      }, function(err, user, info){
              if(err){
                  return next(err);
              }
              if(!user){
                  return res.redirect('/login');
              }
              req.logIn(user, function(err){
                  if (req.body.rememberme) {
                      req.session.cookie.maxAge = 30*24*60*60*1000 ;//Rememeber 'me' for 30 days
                  } else {
                      req.session.cookie.expires = false;
                  }
                  var redirect = req.param('redirect') || '/index';
                  res.redirect(redirect);
              });
          }
      )(req, res, next);
  }
);


app.post('/join',function(req, res,next){
  console.log('phoneㅇㅡㄴ말이야 ', phone)
  const x = [req.body.phone, req.body.password];
  const sql = "insert into user (phone, password) values (?,?)"
  console.log('phone::::', phone)
  
  db.run(sql, x, err => {
    if (err) {
      return console.error(err.message);
    }
    res.redirect("/");
  });
});





app.get('/logout', authRequired, (req,res)=>{
  req.logout()
  res.render('/')
})