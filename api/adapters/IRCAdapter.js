/**
 * Module dependencies
 */
var _ = require('lodash');





/**
 * @type {Adapter}
 */
module.exports = (function() {

	// model configurations
	var _modelConfigs = {};



	/**
	 * Each connection in this adapter maintains an IRC server,
	 * an IRC channel, a username, and a password.
	 * 
	 * @type {Object}
	 */
	var Adapter = {

		// My defaults (for ALL IRC servers)
		defaults: {
			postbackURL: '/chat'
		},


		// This method runs when a model is initially registered at lift-time.
		registerCollection: function(model, cb) {
			console.log('registering a model (' + model.identity + ') w/ the IRC adapter...');

			// Absorb adapter defaults into model configuration
            _.defaults(model.config, Adapter.defaults);

            // Clone the configuration just in case (to avoid mutating it on accident)
            var ircConfig = _.cloneDeep(model.config);

            // Store each model config for later.
            _modelConfigs[model.identity] = ircConfig;



            // Validate our configuration.
			// Require that the host, nick, and channel config exists.
			if (!ircConfig.channel) return cb('No channel specified (e.g. #sailsjs');
			if (!ircConfig.nick) return cb('No nick specified (e.g. mikermcneil');
			if (!ircConfig.host) return cb('No host specified (e.g. zelazny.freenode.net');


			// Warm up our connection to the IRC server (login, connect to channel, etc.)
			
			// Instantiate irc client
			var irc = require('irc');
			var ircClient = new irc.Client(ircConfig.host, ircConfig.nick, {
				channels: [ircConfig.channel]
			});

			// Save reference to client in our _modelConfigs so we can maintain the connection across subsequent calls.
			_modelConfigs[model.identity] = ircClient;

			// The irc npm module emits errors on the client object, so we have to catch them.
			// If the client encounters an error, wait, then attempt to reconnect
			ircClient.addListener('error', function onIRCClientError(err) {
				sails.log.error('IRCAdapter.onError');
				sails.log.error(err);
			});

			// The irc npm module emits new chats on the client object.
			// Listen for incoming chats
			ircClient.addListener('message', function newChat (from, to, message) {

				// Send a request to sails.
				var request = require('request');
				request.post({
					url: 'http://localhost:' + sails.config.port + '/chat',
					form: {
						from: from,
						to: to,
						message: message
					}
				});
			});

			// Done registering this model.
			cb();
		},


		// This method is fired when a model is unregistered, typically at server halt
		// useful for tearing down remaining open connections, etc.
		teardown: function(cb) {
			console.log('tearing down a model..');

			// TODO: kill IRC connection (it'll happen anyways, but not a bad idea to try it)
			cb();
		}
	};


	return Adapter;



	/**
	 * Extend usage options with model configuration
	 * (which also includes adapter defaults)
	 * @api private
	 */
	// function _extendOptions(modelIdentity, options) {

	// 	// Ignore unexpected options, use {} instead
	// 	options = _.isPlainObject(options) ? options : {};

	// 	// Apply model defaults, if relevant
	// 	if (modelIdentity) {
	// 		return _.extend({}, _modelConfigs[modelIdentity], options);
	// 	}
	// 	return _.extend({}, options);
	// }

})();


