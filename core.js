/**
* INB356 Assessment 1
* Brett Orr - n8963398
* File: core.js
* Purpose: The core javascript file, run in the client,
* 			that iterates through returned content, edits
*			the DOM and provides flashy features.
*			Each AJAX call relies on the success of the 
*			parent.
*/
var MAX_STREAM_PREVIEW = 3;
var MAX_RSS_ITEMS = 10;
var core = function(){

	//Start with the progress bar
	//Progress bar!
	 $("#progressbar").progressbar({
		value: false
	});
	
	/**
    * This function AJAX's down to the server and informs it that
    * we are ready to begin displaying content.
    */
	$.get("/?wake", function(data){
		//The data here will be JSON format.	
		var rssData = JSON.parse(data);	
		var content = "";
		
		console.log(rssData);

		//Loop through the data.
		for(var i = 0; i < Math.min(rssData.length / 2, MAX_RSS_ITEMS); i++){
			content += makeHeader(rssData[i]);
			//content += makeURL(rssData[i]) + "<br />";	//Making an anchor out of the article.
			content += makeSummary(rssData[i]);	//Make the (hidden) summary div.		
		}
		
		//End the progress bar
		$("#progressbar").hide();
		
    	//Add the content to the div
		$("#contentArea").html(content);
		
		//Assign an accordion
		$("#contentArea").accordion({
			heightStyle: "content",
			collapsible: true,
		 	active: false
		});
		
		//Now go search steam for this particular game.
		$(".rss-header").click(function(){
			var arr = $(this).data("sanitized-title").split(" ");
			var url = "/?search=" + arr.join("+");
			searchSteamStorefront(url, $(this));
		});
	});
}

/**
* This AJAX call fetches a JSON object of
* potential AppID's from SteamDB, using the provided
* name.
*/
var searchSteamStorefront = function(url, caller, newTitle){
	//Start the progress bar
	$("#progressbar").show();
	$("#progressbar").progressbar("option", "value", false);


	$.get(url, function(data){
		//The data here will be JSON format.	
		var appData = JSON.parse(data);	
		var allIds = new Array();
		var content = "";
		
		//Loop through the data.
		for(var i = 0; i < appData.length; i++){
			allIds.push(appData[i]);
		}
		
		if(allIds.length > 0){
			$("#progressbar").hide();
			flyingDutchman(caller.data("sanitized-title"));
			//Assumes steamDB got the guess right.
			getPricesAndScore(allIds[0]);
			if(typeof(caller)==="undefined"){
			
			}else{
				//Hey, not the first time we've called this.
				//It's been succesful, so we rename our caller.
				caller.data("sanitized-title", newTitle.join(" "));
			}
		}else{
			//Failed.
			failedPricesAndScore(caller);
		}
	});
}

/**
* Retreives Pricing and Metacritic info
* from the game with the given AppID
*/
var getPricesAndScore = function(bestGuess){
	//Remove the content from the div
	$("#twitchArea").html("");
	$.get("/?steam=" + bestGuess, function(data){
		//Our retreived data
		var steamData = JSON.parse(data);
		var content = "";

		var img = "<img class=\"header_image\" src=\"" + String(steamData[bestGuess].data.header_image) + "\"/>";
		content += img;
		
		var header = "<span class=\"cost-header\">Cost</span><span class=\"cost-header\">Metacritic</span><br />";
		content += header;
				
		try{
			var cost = String(steamData[bestGuess].data.price_overview.final);
			var cents = cost.substr(cost.length - 2, 2);
			var dollars = cost.substr(0, cost.length - 2);
			var final = "<span class=\"cost\">$" + dollars + "." + cents + "</span>";
			content += final;
		}catch(err){
			content += "<span class=\"cost\" title=\"Something went wrong with the price.\">?</span>"
		}
		
		try{
			var meta = String(steamData[bestGuess].data.metacritic.score);
			var score = "<span class=\"metacritic\">" + meta + "</span>";
			content += score;
		}catch(err){
			content += "<span class=\"metacritic\" title=\"This game doesn't have a Metacritic score.\">?</span>"
		}

		//Add the content to the div
		$("#twitchArea").html(content);
		
		//End the progress bar
		$("#progressbar").hide();
		
	});
}

/**
* Retreives a list of Streams from
* Twitch that match the game name.
*/
var flyingDutchman = function(game){
	//Wake...the KRAKEN
	$("#progressbar").show();
	$.get("/?kraken=" + game, function(data){
		//Our retreived data
		var kraken = JSON.parse(data);
		
		var content = "";
		//Loop through the data
		for(var i = 0; i < Math.min(kraken.streams.length, MAX_STREAM_PREVIEW); i++){
			content += makeStreamLink(kraken.streams[i]);
		}
		
		$("#twitchArea").html($("#twitchArea").html() + content);
		//End the progress bar
		$("#progressbar").hide();
		
	});
}


/**
* Failed to retreive the AppID from Steam Db.
*/
var failedPricesAndScore = function(caller){
	//End the progress bar
	$("#progressbar").hide();
	
	var content = "Stitch couldn't find that game. You might try searching yourself.<br />";
	content += "<input id=\"game-name\" type=\"text\" placeholder=\"Game Name\" />";
	content += "<input id=\"game-btn\" type=\"submit\" value=\"Search\" />";

	//Show the content.
	$("#twitchArea").html(content);
	
	//Register a listener.
	$("#game-btn").click(function(){
		var arr = $("#game-name").val().split(" ");
		var url = "/?search=" + arr.join("+");
		searchSteamStorefront(url, caller, arr);
	});
}

/**
* Helper method that takes an item
* formatted by FeedParser and returns
* a traditional <a> element in string format.
*/
var makeURL = function(item){
	return "<a alt=\"" + 
	item.title + "\" target=\"_blank\" class=\"rss-item\"" +
	"data-rss-summary=\"" + item.summary + "\"" +
	"data-rss-guid=\"" + item.guid + "\">" +
	item.title + "</a>"; 
}

/**
* Helper method that takes an item
* formatted from Kraken and returns
* a traditional <img> element.
*/
var makeStreamLink = function(stream){
	return "<img class=\"twitch-preview\" src=\"" + stream.preview.medium + "\"/><br />"; 
}


/**
* Helper method that takes an item
* formatted by FeedParser and returns
* a <h3> element, used by Accordion.
*/
var makeHeader = function(item){
	var sanitizedtitle = item.title.replace("Review", "");
	
	return "<h3 class=\"rss-header\" data-sanitized-title=\"" + sanitizedtitle + "\">" + sanitizedtitle + "</h3>";
}

/**
* Helper method that takes an item
* formatted by FeedParser and returns
* a <div><p> element, used by Accordion.
*/
var makeSummary = function(item){
	return "<div><p>" + item.summary + "</p></div>";
}

