var restify = require('restify');
var builder = require('botbuilder');
var request = require('request');
var cheerio = require('cheerio');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function() {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

var url = 'http://thecodinglove.com';
getMinMaxRandomPage(url).then(function(result) {
    min_max = result;
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

// Receive messages from the user and respond by echoing each message back (prefixed with 'You said:')
var bot = new builder.UniversalBot(connector, function(session) {
    session.send("Hi...I'm the Love Coding bot. Tell me to send you a 'random' gif");
});

bot.dialog('randomGif', function(session) {
    var page_number = randomIntFromInterval(min_max.min, min_max.max);
    var gif_number = randomIntFromInterval(1, 4);

    console.log(page_number);
    console.log(gif_number);

    scrapePage(url + "/page/" + page_number, gif_number).then(function(gif_data) {

        var msg = new builder.Message(session);

        var hero_card = new builder.HeroCard(session)
            .title("The Coding Love Bot")
            .subtitle(gif_data.author)
            .text(gif_data.title)
            .images([builder.CardImage.create(session, gif_data.gif)]);

        msg.addAttachment(hero_card);
        session.send(msg).endDialog();

    }).catch(function(error) {
        console.log(error);
    });

}).triggerAction({ matches: /^(random)/i });

function scrapePage(url, gifId) {
    return new Promise(function(fulfill, reject) {
        request(url, function(error, response, html) {

            if (error) {
                console.log(error);
                reject(error);
            } else {
                //Initialize Cheerio to find elements in the page
                var $ = cheerio.load(html);

                var json = { title: "", gif: "", author: "" };
                var element = $("#post" + gifId);

                json.title = $(element).children('h3').text();
                json.gif = $(element).children('div.bodytype').children('p.e').children('img').attr("src");
                json.author = $(element).children('div.bodytype').children('p.e').children('i').text().replace('/* by \n', '').replace(' */', '');
                console.log(json);
                fulfill(json);
            }
        });
    });
}

function getMinMaxRandomPage(url) {
    return new Promise(function(fulfill, reject) {
        request(url, function(error, response, html) {
            if (error) reject(error);
            else {
                var $ = cheerio.load(html);
                var footer = $(".footer").text();
                var numbers_min_max_range = footer.match(/\{\w+\/\w+\}/g).toString(); //Get only {n/n} of the footer
                var number_min_max = numbers_min_max_range.match(/\d+/g);
                var min = number_min_max[0];
                var max = number_min_max[1];
                console.log("MIN:", min);
                console.log("MAX:", max);
                fulfill({ min: min, max: max });
            }
        });
    });
}

function randomIntFromInterval(min, max) {  
    return Math.floor(Math.random() * (max - min + 1) + min);
}