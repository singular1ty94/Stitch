/**
* Stitch - Steam with Twitch
* File: config.js
* Purpose: Quickly edit core settings for the app (client and server)
*			This is a JS assoc array, so it obeys
*			slightly different syntax. Follow the examples.
*/
config = {
	
	//PORT - Edit this to whatever port on localhost you want
	//		 the app to run on.
	//Default: 8888
	PORT:8888,
	
	//TIMEOUT - How long to wait on a request before considering it
	//			an error. (measured in ms)
	//Default: 3000
	TIMEOUT: 3000,	
	
	//MAX_STREAM_PREVIEW - the number of previews loaded from
	//						from Twitch.
	//Default: 3
	MAX_STREAM_PREVIEW: 3,
	
	//MAX_RSS_ITEMS - the number of rss items to load from the
	//					rss feed.
	//Default: 10
	MAX_RSS_ITEMS: 10
	
	
}
