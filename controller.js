//import secrets
var config = require('./config.js');

//requires for discord auth process
var session = require('express-session');
var passport = require('passport');
var Strategy = require('./lib').Strategy;
var stripe = require("stripe")(config.stripe_sk);

//mongodb requirements
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var url = 'mongodb://localhost:27017/test';

//discord bot for spaceorb
var Eris = require('eris');
var bot = new Eris(config.bot_token, {'restMode': true});
bot.on("ready", () => { // When the bot is ready
    console.log("Ready!"); // Log "Ready!"
});

var Express = require("express");
var app = Express();

var Liquid = require("liquidjs");
var engine = Liquid({
  root: __dirname,  // for layouts and partials
  extname: '.liquid'
})

//set templating engine for page rendering
app.engine('liquid', engine.express()) // register liquid engine
app.set('views', ['./partials', './views'])            // specify the views directory
app.set('view engine', 'liquid')       // set to default

//for Stripe integration
app.use(require("body-parser").urlencoded({extended: false}));

//static folders/files to use
app.use('/images', Express.static('images'));
app.use('/bs', Express.static('node_modules/bootstrap/dist'));
app.use('/files', Express.static('Files'));
var people = require("./assets/people.json");
var groups = require("./assets/groups.json");
//var articles = require("./assets/news.json");

var articles
MongoClient.connect(url, (err, database) => {
	if (err)
		return console.log(err);
  	var db = database;
	db.collection('news').find().toArray(function(err, results) {
  		articles = results;
  		console.log(results);
	});
});

//setup passport
passport.serializeUser(function(user, done) {
	done(null, user);
});
passport.deserializeUser(function(obj, done) {
	done(null, obj);
});

var scopes = ['identify', 'email', 'guilds'];

passport.use(new Strategy({
	clientID: config.bot_id,
	clientSecret: config.bot_secret,
	callbackURL: 'http://seds.ca/callback',
	scope: scopes
}, function(accessToken, refreshToken, profile, done) {
	process.nextTick(function() {
		return done(null, profile);
	});
}));

app.use(session({
	secret: '3s8p8a4c7e2i3s3g8r9e2a5t9',
	resave: false,
	saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

//Members login page
app.get('/login', passport.authenticate('discord', { scope: scopes }), function(req, res) {

});

//Redirects to success or failure page
app.get('/callback',
    passport.authenticate('discord', { failureRedirect: '/membership' }), function(req, res) { res.redirect('/spaceorb') } // auth success
    );

//logout
app.get('/logout', function(req, res) {
	req.logout();
	res.redirect('/membership');
});

//page when logged in
app.get('/spaceorb', checkAuth, async (req, res) => {
	var rolecheck = await checkRoles(req.user.id);
	if(rolecheck != -1) {
		res.render('spaceorb', {
			title: 'SpaceORB'
		});
	} else {
		res.redirect('missing-role');
	}
});

function checkAuth(req, res, next) {
	if (req.isAuthenticated()) return next();
	res.redirect('/logged-out');
}

async function checkRoles(userid) {
	let member = await bot.getRESTGuildMember('318757443255402506', userid);
	var roleList = Array.from(member.roles);
	if(roleList.indexOf('319477686734946316') != -1)
		return 1;
	else
		return -1;
}

//Home page
app.get('/', (req, res) => {
	res.render('home', {
		title: 'SEDS Canada',
		article: articles[0]
	});
});

//About page
app.get('/about', (req, res) => {
	res.render('about', {
		title: 'About SEDS Canada'
	});
});

//Projects page
app.get('/projects', (req, res) => {
	res.render('projects', {
		title: 'SEDS Canada Projects',
		project: 'rgx'
	});
});

//projects subpages
app.get('/can-rgx', (req, res) => {
	res.render('projects', {
		title: 'SEDS Canada Projects',
		project: 'rgx'
	});
});

app.get('/can-sbx', (req, res) => {
	res.render('projects', {
		title: 'SEDS Canada Projects',
		project: 'sbx'
	});
});

app.get('/act-in-space', (req, res) => {
	res.render('projects', {
		title: 'SEDS Canada Projects',
		project: 'ais'
	});
});

app.get('/marssat', (req, res) => {
	res.render('projects', {
		title: 'SEDS Canada Projects',
		project: 'msat'
	});
});

//end subpages

//Opportunities page
app.get('/opportunities', (req, res) => {
	res.render('opportunities', {
		title: 'Opportunities at SEDS Canada'
	});
});

//Conference page
app.get('/conference', (req, res) => {
	res.render('conference', {
		title: 'Ascension 2018'
	});
});

//People page
app.get('/people', (req, res) => {
	res.render('people', {
		title: 'Our People',
		people: people
	});
});

//Partners page
app.get('/partners', (req, res) => {
	res.render('partners', {
		title: 'Our Partners',
		groups: groups
	});
});

//News page
app.get('/news', (req, res) => {
	res.render('news', {
		title: 'SEDS Canada News',
		articles: articles
	});
});

//Donate page
app.get('/sponsorship', (req, res) => {
	res.render('sponsorship', {
		title: 'Become a Sponsor!'
	});
});

//Membership page
app.get('/join', (req, res) => {
	res.render('membership', {
		title: 'Join SEDS Canada'
	});
});

app.get('/logged-out', (req, res) => {
	res.render('logged-out', {
		title: 'Logged Out'
	});
});

app.get('/missing-role', (req, res) => {
	res.render('missing-role', {
		title: 'Missing Role'
	});
});

app.get('/man-made-martians', (req, res) => {
	res.render('man-made-martians', {
		title: 'Man Made Martians'
	});
});


app.get('/man-made-martians-2', (req, res) => {
	res.render('man-made-martians-2', {
		title: 'Man Made Martians-2'
	});
});

//database related pages and functions
app.get('/posting', (req, res) => {
	res.render('db_submit', {
		title: 'Submission Page'
	});
});

//submit new post
app.post('/submit-news', (req, res) => {
	MongoClient.connect(url, (err, database) => {
		if (err)
			return console.log(err);
  		var db = database;

  		db.collection('news').save(req.body, (err, result) => {
    		if (err) 
    			return console.log(err);

    		console.log(req.body);
    		res.redirect('/');
    	});
	});
});

//Stripe payments
app.post('/checkout', (req, res) => {
	var token = req.body.stripeToken;

	stripe.charges.create({
		amount: 1200,
		currency: "cad",
		description: "SEDS - EEDS Canada Student Membership",
		source: token,
	}, function(err, charge) {
		res.render('confirmation', {
			title: 'Payment Confirmation',
			error: charge.failure_message
		});
	});

});

//quick 404 page
app.use((req, res) => {
	res.status(404);
	res.render('404', {
		title: '404'
	});
});

//Contact Us?

bot.connect();

app.listen(3000, function () {
	console.log('Example app listening on port 3000!');
});
