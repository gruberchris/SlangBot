/* global require process console setTimeout */
const config = require('./config.json');
const Botkit = require('botkit');
const os = require('os');
const moment = require('moment');
const mediawiki = require('./mediawiki/mediawiki');

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

controller.hears(['hello', 'hi'], ['direct_message', 'direct_mention', 'mention'], function (bot, message) {
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
    let uptime = formatUptime();

    bot.reply(message,
      ':robot_face: I am a bot named <@' + bot.identity.name +
      '>. I have been running for ' + uptime + ' on ' + hostname + '.');
  });

controller.hears(['wiki (.*)', 'what is (.*)', 'tell me about (.*)', 'what are (.*)', 'who is (.*)', 'who are (.*)'],
  ['direct_message', 'direct_mention', 'mention'], (bot, message) => {

  let articleSearchTerm = message.match[1];

  mediawiki.findMatchingArticle(articleSearchTerm, (result) => {
    if(result) {
      let responseText = '';
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
          response.text = 'I found ' + articlesCount + ' articles about `' + articleSearchTerm + '` you may be interested in :confetti_ball:';
        }
      }

      bot.reply(message, response);
    } else {
      bot.reply(message, 'I could not find any information about `' + articleSearchTerm + '` :confounded:');
    }
  }, (error) => {
    bot.reply(message, 'There was a problem while looking up information about `' + articleSearchTerm + '` :boom:');
  });
});

function formatUptime(uptime) {
  return moment.duration(uptime).humanize();
}
