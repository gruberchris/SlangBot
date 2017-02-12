/* global require process console setTimeout */
const config = require('./config.json');
const Botkit = require('botkit');
const os = require('os');
const mediawiki = require('./mediawiki/mediawiki');
const wunderground = require('./wunderground/wunderground');

process.env.token = process.env.token || config.slackApiToken;

if (!process.env.token) {
  console.log('Error: Specify token in environment');
  process.exit(1);
}

let controller = Botkit.slackbot({
  stats_optout: true,
  debug: true
});

let bot = controller.spawn({
  token: process.env.token
}).startRTM();

controller.hears(['hello (.*)', 'hi (.*)'], ['direct_message', 'direct_mention', 'mention'], function (bot, message) {
  bot.api.reactions.add({
    timestamp: message.ts,
    channel: message.channel,
    name: 'robot_face'
  }, function (err, res) {
    if (err) {
      bot.botkit.log('Failed to add emoji reaction :(', err);
    }
  });

  controller.storage.users.get(message.user, function (err, user) {
    if (user && user.name) {
      bot.reply(message, 'Hello ' + user.name + '!!');
    } else {
      bot.reply(message, 'Hello.');
    }
  });
});

controller.hears(['call me (.*)', 'my name is (.*)'],
  ['direct_message', 'direct_mention', 'mention'], function (bot, message) {

  let name = message.match[1];

  controller.storage.users.get(message.user, function (err, user) {
    if (!user) {
      user = {
        id: message.user
      };
    }

    user.name = name;

    controller.storage.users.save(user, function (err, id) {
      bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');
    });
  });
});

controller.hears(['what is my name', 'who am i'],
  ['direct_message', 'direct_mention', 'mention'], function (bot, message) {

  controller.storage.users.get(message.user, function (err, user) {
    if (user && user.name) {
      bot.reply(message, 'Your name is ' + user.name);
    } else {
      bot.startConversation(message, function (err, convo) {
        if (!err) {
          convo.say('I do not know your name yet!');
          convo.ask('What should I call you?', function (response, convo) {
            convo.ask('You want me to call you `' + response.text + '`?', [
              {
                pattern: 'yes',
                callback: function (response, convo) {
                  // since no further messages are queued after this,
                  // the conversation will end naturally with status == 'completed'

                  convo.next();
                }
              },
              {
                pattern: 'no',
                callback: function (response, convo) {
                  // stop the conversation. this will cause it to end with status == 'stopped'

                  convo.stop();
                }
              },
              {
                default: true,
                callback: function (response, convo) {
                  convo.repeat();
                  convo.next();
                }
              }
            ]);

            convo.next();
          }, {'key': 'nickname'}); // store the results in a field called nickname

          convo.on('end', function (convo) {
            if (convo.status == 'completed') {
              bot.reply(message, 'OK! I will update my dossier...');

              controller.storage.users.get(message.user, function (err, user) {
                if (!user) {
                  user = {
                    id: message.user
                  };
                }

                user.name = convo.extractResponse('nickname');

                controller.storage.users.save(user, function (err, id) {
                  bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');
                });
              });
            } else {
              // this happens if the conversation ended prematurely for some reason
              bot.reply(message, 'OK, nevermind!');
            }
          });
        }
      });
    }
  });
});

controller.hears(['shutdown'], ['direct_message', 'direct_mention', 'mention'], function (bot, message) {
  bot.startConversation(message, function (err, convo) {
    convo.ask('Are you sure you want me to shutdown?', [
      {
        pattern: bot.utterances.yes,
        callback: function (response, convo) {
          convo.say('Bye!');
          convo.next();
          setTimeout(function () {
            process.exit();
          }, 3000);
        }
      },
      {
        pattern: bot.utterances.no,
        default: true,
        callback: function (response, convo) {
          convo.say('*Phew!*');
          convo.next();
        }
      }
    ]);
  });
});

controller.hears(['uptime', 'identify yourself', 'who are you', 'what is your name'],
  ['direct_message', 'direct_mention', 'mention'], function (bot, message) {

    let hostname = os.hostname();
    let formatUptime = (uptime) => {
      let unit = 'second';

      if(uptime > 60) {
        uptime = uptime / 60;
        unit = 'minute';
      }

      if(uptime > 60) {
        uptime = uptime / 60;
        unit = 'hour';
      }

      uptime = Math.round(uptime);

      if(uptime > 0) {
        if(uptime !== 1) {
          unit = unit + 's';
        }

        return uptime + ' ' + unit;
      } else {
        if(unit === 'second') {
          return 'a few moments';
        } else if(unit === 'minute') {
          return 'a few seconds';
        } else if(unit === 'hour') {
          return 'a few minutes';
        }
      }
    };

    let uptime = formatUptime(process.uptime());

    bot.reply(message,
      ':robot_face: I am a bot named <@' + bot.identity.name +
      '>. I have been running for ' + uptime + ' on ' + hostname + '.');
  });

controller.hears(['(.*)weather for (.*), (.*)', '(.*)weather in (.*), (.*)'],
  ['direct_message', 'direct_mention', 'mention'], (bot, message) => {

  let city = message.match[2];
  let state = message.match[3].replace('?', '');
  let response = { text: "", attachments: [] };

  wunderground.getCurrentConditions(state, city).then((result) => {
    if(result) {
      const currentTemp = result.current_observation.temperature_string;
      const weather = result.current_observation.weather.toLowerCase();
      // const humidity = result.current_observation.relative_humidity;
      const feelslike = result.current_observation.feelslike_string;
      const forecastUrl = result.current_observation.forecast_url;
      // const windDirection = result.current_observation.wind_dir;
      const precipTodayInInches = result.current_observation.precip_today_in;
      const precipTodayDescription = result.current_observation.precip_today_string;
      const precipLastHourInInches = result.current_observation.precip_1hr_in;
      const precipLastHourDescription = result.current_observation.precip_1hr_string;
      const fullCityAndState = result.current_observation.display_location.full;
      const windMph = result.current_observation.wind_mph;
      const tempF = result.current_observation.temp_f;
      const feelslikeF = result.current_observation.feelslike_f;

      let wind = result.current_observation.wind_string;

      wind = wind[0].toLowerCase() + wind.substr(1);

      let getWeatherEmoji = (weather) => {
        switch(weather) {
          case 'cloudy': return ':cloud:';
          case 'clear': return ':night_with_stars:';
          case 'mostly cloudy': return ':barely_sunny:';
          case 'partly cloudy': return ':barely_sunny:';
          case 'partly sunny': return ':partly_sunny:';
          case 'mostly sunny': return ':mostly_sunny:';
          case 'sunny': return ':sunny:';
          case 'snow': return ':snowflake:';
          case 'rain': return ':rain_cloud:';
          case 'overcast': return ':cloud:';
          case 'fog': return ':fog:';
          case 'scattered clouds': return ':cloud:';
          default: return ':sun_with_face:';
        }
      };

      let getWindEmoji = (wind) => {
        const windy = 15;

        if(wind > windy) {
          return ' :wind_blowing_face:';
        }
      };

      const chillOrHumidityEffect = 4;

      let messageText = 'Current conditions for `' + fullCityAndState + '` are *' + weather + '* '
        + getWeatherEmoji(weather) + ' and *' + currentTemp + '*';

      if(Math.abs(Math.round(tempF) - Math.round(feelslikeF)) > chillOrHumidityEffect) {
        messageText = messageText + ', but it feels like *' + feelslike + '*.';
      } else {
        messageText = messageText + '.';
      }

      if(getWindEmoji(windMph)) {
        messageText = messageText + getWindEmoji(windMph) + ' The wind is *' + wind + '*.';
      } else {
        messageText = messageText + ' The wind is *' + wind + '*.';
      }

      if(precipTodayInInches > 0) {
        messageText = messageText + ' Today there has been *' + precipTodayDescription + '* of precipitation.';

        if(precipLastHourInInches > 0) {
          messageText = messageText + ' In the last hour, there has been *' + precipLastHourDescription
            + '* :umbrella_with_rain_drops: of precipitation.';
        }
      }

      //messageText = messageText + '\n<' + forecastUrl + '| Full weather for ' + fullCityAndState + '>';
      messageText = messageText + '\n' + forecastUrl;

      response.text = messageText;

      bot.reply(message, response);
    } else {
      bot.reply(message, 'I could not find the weather for `' + city + ', ' + state + '` :confounded:');
    }
  }).catch((error) => {
    bot.reply(message, 'There was a problem while trying to get the weather for `' + city + ', ' + state + '`');
  });
});

controller.hears(['wiki (.*)', 'what is (.*)', 'tell me about (.*)', 'what are (.*)', 'who is (.*)', 'who are (.*)'],
  ['direct_message', 'direct_mention', 'mention'], (bot, message) => {

  let articleSearchTerm = message.match[1];

  mediawiki.findMatchingArticle(articleSearchTerm).then((result) => {
    if(result) {
      let articlesCount = result.suggestedArticles.length;
      let response = {};

      response.attachments = [];

      for(let counter = 0; counter < articlesCount; counter++) {
        let article = result.suggestedArticles[counter];

        response.attachments.push({
          fallback: article.title,
          title : article.title,
          title_link: article.uri,
          text: article.snippet,
          color: "#7CD197"
        });

        if(articlesCount === 1 || article.title.toLowerCase() === articleSearchTerm.toLowerCase()) {
          response.text = 'This article appears to be what you asked for :tada:';
          break;
        } else {
          response.text = 'I found ' + articlesCount + ' articles about `' + articleSearchTerm
            + '` you may be interested in :confetti_ball:';
        }
      }

      bot.reply(message, response);
    } else {
      bot.reply(message, 'I could not find any information about `' + articleSearchTerm + '` :confounded:');
    }
  }).catch((error) => {
    bot.reply(message, 'There was a problem while looking up information about `' + articleSearchTerm + '` :boom:');
  });
});
