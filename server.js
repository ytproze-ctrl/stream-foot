require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL: process.env.DISCORD_CALLBACK_URL,
  scope: ['identify']
}, (accessToken, refreshToken, profile, done) => done(null, profile)));

app.use(session({ secret: 'supersecret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

function checkAuth(req,res,next){
  if(req.isAuthenticated()) return next();
  res.redirect('/login.html');
}

app.get('/login', passport.authenticate('discord'));
app.get('/callback', passport.authenticate('discord', { failureRedirect: '/login.html' }), (req,res)=>{
  res.redirect('/');
});
app.get('/logout', (req,res)=>{
  req.logout(()=>{});
  res.redirect('/login.html');
});

app.use(express.static(path.join(__dirname,'public')));
app.get('/', checkAuth, (req,res)=>{
  res.sendFile(path.join(__dirname,'public','index.html'));
});

app.get('/me', checkAuth, (req,res)=>{
  res.json(req.user);
});

app.listen(PORT,()=>console.log(`Serveur lancé sur http://localhost:${PORT}`));
