/**
* Stitch - Steam with Twitch
* File: server.js
* Purpose: The main node.js server file to instantiate and operate a server.
*			To form clear seperation between server and client, the server
*			will, at most, return a JSON object back to the client.
*			See core.js for how the client works with this.
*/
var http = require('http'),
    url = require('url'),
    fs = require('fs'),
    qs = require('querystring'),
    request = require('request'),
    FeedParser = require('feedparser'),
    cheerio = require('cheerio');

var CMD_WAKE = "wake";
var CMD_SEARCH = "search";
var CMD_STEAM = "steam";
var CMD_KRAKEN = "kraken";
var CMD_CORRECT = "correct";
var CMD_TITLES = "titles";
var RSS_FEED = "http://feeds.ign.com/ign/pc-reviews/";

var TITLES = null;

//The . is important here.
var MIME_TYPES = {
	".json":"application/json",
	".rss": "application/rss+xml",
    ".html":"text/html",
    ".css":"text/css",
    ".js" : "text/js",
    ".ico" : "image/x-icon",
    ".png" : "image/png"
}

//Load the config file and title file.
try{
	eval(fs.readFileSync('etc/config.js', encoding="ascii"));
	TITLES = JSON.parse(fs.readFileSync('etc/titles.js', encoding="ascii"));
}catch(err){
	console.log("[FATAL] Configuration error: " + err);
}

/*
* Blank constructor. Uses prototyping to add additional features.
*/
function Server() { 
}

/**
* This method takes the incoming request, parses the URL
* and displays it. Used to display the client side pages.
*/
Server.process = function(req, res) {

	//Helper variables to explode the URL then smash it back together.
	baseUrl = req.url;
	
	//Find the query first.
	query = baseUrl.split("?");	
	if(query.length > 1){
		//Remove the query.
		query = baseUrl.slice(baseUrl.indexOf("?") + 1);
		//Adjust the baseURL.
		baseUrl = baseUrl.slice(0, baseUrl.indexOf("?"));
		//Process our queries.
		Server._processQueries(query, res);
	}else{
		//Get the file and identifies what MIME_TYPE it is to display it.
		fs.readFile(__dirname + baseUrl, function (err, data) {
			if(err){ console.log(err); }
			res.writeHead(200, {'Content-Type': MIME_TYPES[baseUrl.split(".")[1]]});
			res.write(data);
			res.end();
	  	});
	}
};

/**
* Process any queries we had, such as the WAKE command.
*/
Server._processQueries = function(querystring, res){
	queryArray = qs.parse(querystring);
	console.log(queryArray);
	//Loop through the commands.
	for(var cmd in queryArray){
		switch(cmd){
			case CMD_WAKE:
				Server._parseRSS(res);
				break;
			case CMD_SEARCH:
				Server._steamDB(queryArray[cmd], res);
				break;
			case CMD_STEAM:
				Server._storefront(queryArray[cmd], res);
				break;
			case CMD_KRAKEN:
				//Wake...the KRAKEN!
				Server._flyingDutchman(queryArray[cmd], res);
				break;
			case CMD_CORRECT:
				//Correct an incorrect title
				Server._correctTitle(queryArray["old"], queryArray["new"], res);
				break;
			case CMD_TITLES:
				//get the titles
				Server._getTitles(res);
				break;
			default:
				break;
		}
	}
};

/**
* Parses the IGN RSS Feed.
*/
Server._parseRSS = function(response){
	var req = request(RSS_FEED), feedparser = new FeedParser();

	//Grab any errors.
	req.on('error', function (error) {
		console.log("RSS Terminated with " + error);
	});
	
	//Get the response.
	req.on('response', function (res) {
	  var stream = this;
	  if (res.statusCode != 200) return this.emit('error', new Error('Bad status code'));
	  stream.pipe(feedparser);
	});

	//Grab feedparser errors.
	feedparser.on('error', function(error) {
		console.log("Feed Terminated with " + error);
	});
	
	var itemList = new Array();
	//Now we can read the stream.
	feedparser.on('readable', function() {
	  var stream = this, meta = this.meta, item;  
	  
	  //Grab all of the titles.
	  while (item = stream.read()) {
	  	itemList.push(item);
	  }
	});
	
	//Wait until we've fully loaded the RSS feed.
	//We return it in JSON format.
	feedparser.on('end', function(){
		response.write(JSON.stringify(itemList));
		response.end();
	});
	
}

/**
* This function scrapes the http://steamdb.com website
* to find the AppID of the provided game. This isn't
* an exact science, but without the AppID, we can't access
* steam storefront to get the price and metacritic score.
*/
Server._steamDB = function(game, response){
	//The steamdb url to go to.
	var theUrl = 'http://www.steamdb.info/search/?a=app&q=' + game + '&type=1&category=0';

	//Need these options to coax steamDb into beleiving we're a real client.
	var options = {
		url: theUrl,
		headers: {
		    'User-Agent': 'request'
		}
	};
	
	var appIDarr = new Array();
	var req = request(options, function(err, res, body){
		if (res.statusCode != 200){
			return this.emit('error', new Error('Bad status code'));
		} else if(res.statusCode == 200){
		  	//Initialize cheerio.
			$ = cheerio.load(body);
			//Find the table.
			$('#table-sortable tr').each(function() {
				//Find the individual td
				$(this).find('td a').each(function() {
					var appid = $(this).text().trim();
					appIDarr.push(appid);
				});
			});
			
			//Pass the response back to the client. 
			done();
		  }
	});
	
	/**
	* Called once Cheerio has dealt with the stream.
	*/
	var done = function(){
		response.write(JSON.stringify(appIDarr));
		response.end();
	};

};
				
/**
* This function accesses Steam Storefront
* via the BigPicture api. It requires an AppID.
*/
Server._storefront = function(appID, response){
	//The steam url to go to.
	var storefront = "http://store.steampowered.com/api/appdetails?appids=" + appID +"&filters=price_overview,metacritic,basic";

	//Need these options to coax steam into beleiving we're a real client.
	var options = {
		url: storefront,
		headers: {
		    'User-Agent': 'request'
		}
	};
	
	var req = request(options, function(err, res, body){
		if (res.statusCode != 200){
			return this.emit('error', new Error('Bad status code'));
		} else if(res.statusCode == 200){
			done(body);  	
		}
	});

	var done = function(body){
		response.write(body);
		response.end();
	};

};

/**
* This function accesses Twitch to retreive
* a list of streams relevant to the game
* name provided.
*/
Server._flyingDutchman = function(game, response){
	//The method's name is a reference to Pirates of the Caribbean, go watch the trilogy if you haven't seen it!
	//The steamdb url to go to.
	var kraken = 'https://api.twitch.tv/kraken/search/streams?query=' + game + '&type=suggest';
	
	//Need these options to coax kraken into beleiving we're a real client.
	var options = {
		url: kraken,
		headers: {
		    'User-Agent': 'request'
		}
	};
	
	var req = request(options, function(err, res, body){
		if (res.statusCode != 200){
			return this.emit('error', new Error('Bad status code'));
		} else if(res.statusCode == 200){
		  	done(body);
		  }
	});
	
	var done = function(body){
		response.write(body);
		response.end();
	};

};

/**
* This function takes the incorrect title
* of a game, corrects it and stores it in a file.
*/
Server._correctTitle = function(oldTitle, correct, response){
	
	TITLES[TITLES.length] = {
		old: oldTitle, newTitle: correct
	};
	
	//Write a file.
	fs.writeFile("etc/titles.js", JSON.stringify(TITLES), function(err) {
    if(err) {
        console.log(err);
    } else {
        console.log("The file was adjusted.");
    }
	}); 

};

/**
* Returns the TITLES JSON object.
*/
Server._getTitles = function(response){
	response.write(JSON.stringify(TITLES));
	response.end();
};



var Server$ = {

};

(function() {
  var host = '127.0.0.1';   //localhost.
  var port = config.PORT;			//from the config
  try {
    http.createServer(Server.process).listen(port, host);
    console.log('Server running and live on http://' + host + ':' + port);
  }  catch (e) {
    console.error('Error while creating server:\n\n' + e.stack);
  }
})();

