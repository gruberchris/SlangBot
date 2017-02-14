/* globals require module */
const rp = require('request-promise');
const wundergroundApiKey = require('.././config.json').wundergroundApiKey;
const wundergroundBaseUri = 'http://api.wunderground.com/api/' + wundergroundApiKey + '/conditions/q';

function getCurrentConditions(state, city) {
  const options = {
    uri: encodeURI(wundergroundBaseUri + '/' + state + '/' + city + '.json'),
    json: true
  };

  return rp(options);
}

function onWeatherResponse (bot, message) {

  let city = message.match[2];
  let state = message.match[3].replace('?', '');
  let response = { text: "", attachments: [] };

  getCurrentConditions(state, city).then((result) => {
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
}

module.exports.onWeatherResponse = onWeatherResponse;

/*
getCurrentConditions().then((result) => {
  console.log(result);
}).catch((error) => {
  console.log(error);
});
*/
