/***
* Stitch - Steam with Twitch
* File: core.js
* Purpose: The core javascript file, run in the client,
* 			that iterates through returned content, edits
*			the DOM and provides flashy features.
*			Each AJAX call relies on the success of the 
*			parent.
*/
var processing = false;
var TITLES = null;

/**
* The central part of the client-side
* Javascript processing. Manages all
* AJAX calls in progressive order, and
* assigns JQuery handlers as necessary.
* @constructor
*/
function Core(){	
	
	//Get our list of corrected Titles from the server.
	$.get("/?titles", function(data){
		TITLES = JSON.parse(data);
	});
	
	//Start the app in motion.
	Core.getRSSArticles();
	
};

/**
* This function AJAX's down to the server and informs it that
* we are ready to begin displaying content.
* It generates the RSS items and places them in an accordion.
* It calls {@linkcode Core.searchSteamStorefront} if successful.	
*/
Core.getRSSArticles = function(){
    $.ajax({
		url: "/?wake",
		timeout: config.TIMEOUT
	}).done(function(data){
	
		//Parse the resposne body.	
		var rssData = JSON.parse(data);	
		var content = "";
		
		//Iterate through the data and adjust our content
		//to have a 'Header' and an 'Article' for the accordion.
		for(var i = 0; i < Math.min(rssData.length / 2, config.MAX_RSS_ITEMS); i++){
			content += Core.makeHeader(rssData[i]);
			content += Core.makeArticle(rssData[i]);		
		}
		
    	//Add the content to the div
		$("#contentArea").html(content);
		
		//Assign an accordion
		$("#contentArea").accordion({
			heightStyle: "content",
			collapsible: true,
		 	active: false,
		 	beforeActivate: function(event, ui) {
		 		//This forces a synchronous lock so that user
		 		//can't switch between games while the AJAX calls are in progress.
		 		if(processing){
		 			event.preventDefault();
		 			event.stopImmediatePropagation();
		 		}
		 	}
		});
	
		//Make sure all hyperlinks are injected with a new window target.
		$(".ui-accordion-content a").attr("target", "_blank");
		
		//Now go search steam for this particular game.
		$(".rss-header").click(function(event){
			if(!processing){
				processing = true;
				//Process the game's name (using +'s for spacess)
				var arr = $(this).data("sanitized-title").split(" ");
				var url = "/?search=" + arr.join("+");
				Core.searchSteamStorefront(url, $(this));
			}
		});
	}).error(function(jqXHR, textStatus, errorThrown){
		//On Timeout.
		processing = false;
		
		//Report the error
		var error = "<br /><p>The RSS Feed didn't load. Please refresh your browser.</p>";
		$("#contentArea").html($("#contentArea").html() + error);
	});
};

/**
* This AJAX call fetches a JSON object of
* potential AppID's from SteamDB, using the provided
* name.
* It calls {@linkcode Core.getPricesAndScore} if successful.
* It calls {@linkcode Core.failedPricesAndScore} if SteamDB cannot find the game.
* @param url - The url to pass the server, likely /?search=game+name
* @param caller - Which accordion link called this function?
* @param newTitle - May be undefined, the 'corrected' title of the game (see {@linkcode Core.failedPricesAndScore})
*/
Core.searchSteamStorefront = function(url, caller, newTitle){
	$.ajax({
		url: url,
		timeout: config.TIMEOUT
	}).done(function(data){
	
		//Parse the data and prepare an array.	
		var appData = JSON.parse(data);	
		var allIds = new Array();
		var content = "";
		
		//Loop through the data and push to array.
		for(var i = 0; i < appData.length; i++){
			allIds.push(appData[i]);
		}
		
		if(allIds.length > 0){
			if(typeof(newTitle)==="undefined"){
				//Ignore the undefined parameter.
			}else{
				//Hey, not the first time we've called this.
				//Ask the serve the remember the change.
				$.get("/?correct&old=" + caller.data("sanitized-title") + "&new=" + newTitle.join(" "), function(data){});
				
				//It's been succesful, so we rename our caller.
				caller.data("sanitized-title", newTitle.join(" "));
			}
			
			//Assumes steamDB got the guess right.
			Core.getPricesAndScore(allIds[0], caller.data("sanitized-title"));
		}else{
			//Failed. Ask the user to manually find the game's name.
			processing = false;
			Core.failedPricesAndScore(caller);
		}
	}).error(function(jqXHR, textStatus, errorThrown){
		//On Timeout.
		processing = false;
		
		//Report the error
		var error = "<br /><p>Steam Storefront took too long to respond. Try refreshing your browser.</p>";
		$("#twitchArea").html($("#twitchArea").html() + error);
	});
};

/**
* Retreives Pricing and Metacritic info
* from the game with the given AppID, using
* the Steam Storefront API.
* It calls {@linkcode Core.flyingDutchman} if everything worked.
* @param bestGuess - The AppID that SteamDB believes is correct.
* @param name - What's this game's name?
*/
Core.getPricesAndScore = function(bestGuess, name){
	//Remove the content from the div
	$("#twitchArea").html("");
	
	$.ajax({
		url: "/?steam=" + bestGuess,
		timeout: config.TIMEOUT
	}).done(function(data){

		//Parse the data.
		var steamData = JSON.parse(data);
		var content = "";

		//Make the header image from Steam.
		var img = "<img class=\"header_image\" src=\"" + String(steamData[bestGuess].data.header_image) + "\"/><br />";
		content += img;
		
		//Try to find the price - it might not exist if the game is free.		
		try{
			var cost = String(steamData[bestGuess].data.price_overview.final);
			var cents = cost.substr(cost.length - 2, 2);
			var dollars = cost.substr(0, cost.length - 2);
			var final = "<span class=\"cost\">$" + dollars + "." + cents + "</span>";
			content += final;
		}catch(err){
			content += "<span class=\"cost\" title=\"This game is free to play.\">Free</span>"
		}
		
		//Try to find the Metacritic rating - some game's don't have them.
		try{
			var meta = String(steamData[bestGuess].data.metacritic.score);
			var score = "<span class=\"metacritic\">" + meta + "</span>";
			content += score;
		}catch(err){
			content += "<span class=\"metacritic\" title=\"This game doesn't have a Metacritic score.\">?</span>"
		}
		
		//Now show the Play with Steam button (steam://run/ protocol).
		content += "<span class=\"cost\"><a class=\"launchSteam\" target=\"_blank\" href=\"steam://run/" + bestGuess + "\">Launch</a></span>";

		//Add the content to the div
		$("#twitchArea").html(content);
		
		//Try getting twitch videos next
		Core.flyingDutchman(name);
		
	}).error(function(jqXHR, textStatus, errorThrown){
		//On Timeout.
		processing = false;
		
		//Report the error
		var error = "<br /><p>Steam Storefront took too long to respond. Try refreshing your browser.</p>";
		$("#twitchArea").html($("#twitchArea").html() + error);
	});
};

/**
* Retreives a list of Streams from
* Twitch that match the game name.
* This is the final part of the process, terminating the
* lock over the user's actions. It shows the available streams
* as previews in a slider.
* @param game - The game's name.
*/
Core.flyingDutchman = function(game){
	
	//Wake...the KRAKEN
	$.ajax({
		url: "/?kraken=" + game,
		timeout: config.TIMEOUT
	}).done(function(data){
	
		//Our retreived data
		var kraken = JSON.parse(data);
		var content = "";
		
		//Iterate through the array and make the relevant links.
		if(kraken.streams.length > 0){
			content += "<ul id=\"twitchGallery\">";
			for(var i = 0; i < Math.min(kraken.streams.length, config.MAX_STREAM_PREVIEW); i++){
				content += Core.makeStreamLink(kraken.streams[i]);
			}
			content += "</ul>";
		}else{
			content += "<br /><br />Nobody's streaming right now.<br />Try again later!";
		}
		
		//Add the content.
		$("#twitchArea").html($("#twitchArea").html() + content);
		
		//Attach the slider.
		$('#twitchGallery').lightSlider({
		 	 minSlide:1,
			 maxSlide:1,
			 slideWidth:320
    	});
    	
		//Attach the colorbox.
		$(".streamLink").colorbox({inline:true, innerWidth:670, innerHeight:410, onClosed: function(){
			//Function to stop video. Still has heavy delay...
			var video = $("#twitchPlayerObject").attr("data");
			$("#playerid").attr("data","");
			$("#playerid").attr("data",video);
		}});
		
		//Register the streams onclick to the player.
		$(".streamLink").click(function(){
			$("#twitchPlayerObject").attr("data", "http://www.twitch.tv/widgets/live_embed_player.swf?channel=" + $(this).data("channel"));
			$("#twitchMovie").attr("value", "hostname=www.twitch.tv&channel=" +  $(this).data("channel") + "&auto_play=true&start_volume=25");
		});
		
		processing = false;	//end the lock
	}).error(function(jqXHR, textStatus, errorThrown){
		//On Timeout.
		processing = false;
		
		//Report the error
		var error = "<br /><p>Twitch took too long to respond. Try refreshing your browser.</p>";
		$("#twitchArea").html($("#twitchArea").html() + error);
	});
};


/**
* Failed to retreive the AppID from Steam DB.
* It calls {@linkcode Core.searchSteamStorefront} if the game name now looks correct.
* @param caller - What accordion linked called this?
*/
Core.failedPricesAndScore = function(caller){
	
	//Make the content message.
	var content = "Stitch couldn't find that game. You might try searching yourself.<br />";
	content += "<input id=\"game-name\" type=\"text\" placeholder=\"Game Name\" />";
	content += "<input id=\"game-btn\" type=\"submit\" value=\"Search\" />";
	$("#twitchArea").html(content);
	
	//Register a listener and search the storefront again.
	$("#game-btn").click(function(){
		var arr = $("#game-name").val().split(" ");
		var url = "/?search=" + arr.join("+");
		Core.searchSteamStorefront(url, caller, arr);
	});
};

/**
* Helper method that takes an item
* formatted by FeedParser and returns
* a traditional a element in string format.'
* @param item - The individual array item.
*/
Core.makeURL = function(item){
	return "<a alt=\"" + 
	item.title + "\" target=\"_blank\" class=\"rss-item\"" +
	"data-rss-summary=\"" + item.summary + "\"" +
	"data-rss-guid=\"" + item.guid + "\">" +
	item.title + "</a>"; 
};

/**
* Helper method that takes an item
* formatted from Kraken and returns
* a li structure the slider can use.
* @param stream - The individual array item.
*/
Core.makeStreamLink = function(stream){
	return "<li><a class=\"streamLink\" id=\"" + stream._id + "\"href=\"#twitchPlayer\" data-channel=\"" + stream.channel.name + "\"><img src=\"" + stream.preview.medium + "\"/></a></li>"; 
};


/**
* Helper method that takes an item
* formatted by FeedParser and returns
* a h3 element, used by Accordion, with
* a smaller span showing the author & date.
* @param item - The individual array item.
*/
Core.makeHeader = function(item){
	var sanitizedtitle = item.title.replace("Review", "");
	
	//Lets check if this title is correct, or if a better name is known.
	for(var i = 0; i < TITLES.length; i++){
    	if(TITLES[i].old == sanitizedtitle){
    		sanitizedtitle = TITLES[i].newTitle;
    	}
	}
	
	var date = new Date(item.date);	//it's stored as an ISO string in the rss feed.
	
	return "<h3 class=\"rss-header\" data-sanitized-title=\"" + sanitizedtitle + "\">" + sanitizedtitle + 
	"<span>" + item.author + " - " + date.toLocaleDateString() + "</span></h3>";
};

/**
* Helper method that takes an item
* formatted by FeedParser and returns
* a div-p element, used by Accordion.
* @param item - The individual array item.
*/
Core.makeArticle = function(item){
	return "<div><p>" + item.description + "</p></div>";
};
