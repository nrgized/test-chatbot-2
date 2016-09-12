var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var request = require('request');
var zones = [];
 
app.use(bodyParser.json());

app.set('port', (process.env.PORT || 5000));
app.set('verify_token', (process.env.VERIFY_TOKEN || 'TEST'));
app.set('page_access_token', (process.env.PAGE_ACCESS_TOKEN || 'NULL'));

app.get('/', function (req, res) {
        res.send('It Works! Follow FB Instructions to activate.');
});
 
app.get('/webhook', function (req, res) {
    if (req.query['hub.verify_token'] === app.get('verify_token')) {
        res.send(req.query['hub.challenge']);
    } else {
        res.send('Error, wrong validation token');
    }
});
  
app.post('/webhook/', function (req, res) {
   // console.log (req.body);
    messaging_events = req.body.entry[0].messaging;
    for (i = 0; i < messaging_events.length; i++) {
        event = req.body.entry[0].messaging[i];
        sender = event.sender.id;
        var UserLat;
        var UserLng;
        var UserLocation;
// check if location is sent

        if (event.message && event.message.attachments ) {   // need to add another validator
            UserLat = event.message.attachments[0].payload.coordinates.lat;
            UserLng = event.message.attachments[0].payload.coordinates.long;
            sendTextMessage(sender, "location received " + UserLat + UserLng );
            console.log(UserLat);
            console.log(UserLng);
            getNearestCars(UserLat, UserLng);
        }
        

// end of location check

        if (event.message && event.message.text) {
            text = event.message.text;
            text = text.toLowerCase();
            if (text === 'generic') {
                sendGenericMessage(sender);
            continue
            }
            if (text.charAt(0) == '#') {
                console.log("groteles");
                var matches = [];
                // check for matching zones
                var value = text.substring(1, 200);
                
                
                for (i = 0; i < zones.length; i++) {
                  if (zones[i].nameEN.indexOf(value) > 0)
                  { 
                    var match = {};
                    match.id = zones[i].id;
                    match.nameFull = zones[i].nameFull;
                    match.nameEN = zones[i].nameEN;
                    match.nameLT = zones[i].nameLT;
                    matches.push(match);

                  } 
                }
                console.log(matches.length);
                // action depending on amount of matching zones
                if (matches.length <= 0) {
                  sendTextMessage(sender, "stoteles tokiu pavadinimu nera ");
                }
                else if (matches.length === 1) {
                  getHTTPinfo(sender, matches[0].id);
                }
                else if (matches.length < 6) {
                 // sendTextMessage(sender, "pasirinkite is zemiau esanciu stoteliu");
                  var buttons = [
                      {
                        "type":"web_url",
                        "url":"https://petersapparel.parseapp.com",
                        "title":"Show Website"
                      },
                      {
                        "type":"postback",
                        "title":"Start Chatting",
                        "payload":"USER_DEFINED_PAYLOAD"
                      }
                    ];
               //var button = {};
               //for (i = 0; i < matches.length; i++) {
                    var button = {
                        "type":"web_url",
                        "url":"https://petersapparel.parseapp.com",
                        "title":"Show Website"
                    }
                    buttons.push(button);
               //};
                  var messageData = {
                    "recipient":{
                      "id": sender
                    },
                    "message":{
                      "attachment":{
                        "type":"template",
                        "payload":{
                          "template_type":"button",
                          "text":"What do you want to do next?",
                          "buttons": buttons
                        }
                      }
                    }
                  }; 
                  callSendAPI(messageData);
                  sendTextMessage(sender, "st" + buttons.length);
                  sendTextMessage(sender, "st" + buttons[0].type);
                }
                else {
                  sendTextMessage(sender, "stoteliu rast per daug. patisklinkite paieska");
                }
            continue
            }
            if (text === 'bee') {
                console.log('bee');
                getStopsData();
            continue
            }
            if (text === 'zones') {
                console.log('zones');
                console.log(zones);
            continue
            }
            if (text.charAt(0) === '@') {
                var value = text.substring(1, 200);
                console.log("@@@@@");
                sendTextMessage(sender, "stotele " + value);
                getHTTPinfo(sender, value);
            continue
            }

           
            // Your Logic Replaces the following Line
            sendTextMessage(sender, "Text received 123, echo: "+ text.substring(0, 200));
        }
    }
    res.sendStatus(200);
});

// function to send GET request and parse stop names
function getStopsData() {
  var url = 'https://login.citybee.lt/lt/';
  request({
    headers: {
      'Cookie': 'PHPSESSID=7jr278b6p6t2dssg9orisikd80; device_view=full; BCSI-CS-97976de0be87e764=2; BIGipServerglosC-proxyVIP-bc-RBB-web_gdcsfscs05-55_8050_pool=3242406179.29215.0000; _ga=GA1.2.500491733.1468570414; BCSI-CS-b933f65a4f518259=2; BIGipServerSlough-proxyVIP-bc-RBB-web-SLGSFSCS105-155_8050_pool=3778638102.29215.0000; __utmt=1; __utma=269912044.500491733.1468570414.1468570425.1468587689.2; __utmb=269912044.4.10.1468587689; __utmc=269912044; __utmz=269912044.1468587689.2.2.utmcsr=citybee.lt|utmccn=(referral)|utmcmd=referral|utmcct=/lt/'
    },
    uri: url,
    method: "POST",
    timeout: 10000,
    followRedirect: true,
    maxRedirects: 10
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      // acction on HTTP request success

      console.log('http success');

      // parse html
      var cheerio = require('cheerio'),
      $ = cheerio.load(body);
        var script = $('script:contains("var opts")').html();
        
        script = script.substring(script.indexOf("var opts = {") + 11);
        script = script.substring(0, script.indexOf(";"));
        var carlocationsString = script.substring(script.indexOf("carslocations: [") + 14);
        carlocationsString = carlocationsString.substring(0, carlocationsString.indexOf("bicycleZonesLocations"));
        carlocationsString = carlocationsString.substring(0, carlocationsString.lastIndexOf(","));
        var carlocations = JSON.parse(carlocationsString);
       //console.log(carlocations[300].lat); 

      // loop through car locations


/* loop through zones
      $( "ul.zones-list" ).children().each(function(i, elem) {
        var zone = {};
        if($(this).find('.zone-details').length != 0)  {
          zone.nameFull = $(this).find( ".zone-details" ).attr('title');
          var nameLT = zone.nameFull.replace(/[`„“~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '');
          zone.nameLT = nameLT.toLowerCase();
          var nameEN = zone.nameLT.replace(/ą/gi,'a').replace(/č/gi, 'c').replace(/ę|ė/gi, 'e').replace(/į/gi, 'i').replace(/š/gi, 's').replace(/ų|ū/gi, 'u').replace(/ž/gi, 'z').replace(/"/gi, '');
          zone.nameEN = nameEN.toLowerCase();
          zone.id = $(this).find( "input[name*='zone-id']" ).attr('value');
          zone.index = $(this).find( "input[name*='zone-id']" ).attr('value');
          //console.log(id + " " + name);
          zones.push(zone);
          //queryStringValues += "(" + zone.index + ", '" + zone.nameLT + "', '" + zone.nameEN + "', " + zone.id + "), ";
        }
        else {
          //console.log ('no zones');
        }
   

      });
      console.log ('end of loop');

*/
        
    } else {
        // http request failing
      console.error("error on request");
      console.log('error');
    }
  }); 

}

// find nearest car

function getNearestCars(UserLat, UserLng) {
  var url = 'https://login.citybee.lt/lt/';
  request({
    headers: {
      'Cookie': 'PHPSESSID=7jr278b6p6t2dssg9orisikd80; device_view=full; BCSI-CS-97976de0be87e764=2; BIGipServerglosC-proxyVIP-bc-RBB-web_gdcsfscs05-55_8050_pool=3242406179.29215.0000; _ga=GA1.2.500491733.1468570414; BCSI-CS-b933f65a4f518259=2; BIGipServerSlough-proxyVIP-bc-RBB-web-SLGSFSCS105-155_8050_pool=3778638102.29215.0000; __utmt=1; __utma=269912044.500491733.1468570414.1468570425.1468587689.2; __utmb=269912044.4.10.1468587689; __utmc=269912044; __utmz=269912044.1468587689.2.2.utmcsr=citybee.lt|utmccn=(referral)|utmcmd=referral|utmcct=/lt/'
    },
    uri: url,
    method: "POST",
    timeout: 100000,
    followRedirect: true,
    maxRedirects: 30
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      // acction on HTTP request success

      console.log('http success');

      // parse html
      var cheerio = require('cheerio'),
      $ = cheerio.load(body);
        var script = $('script:contains("var opts")').html();
        
        script = script.substring(script.indexOf("var opts = {") + 11);
        script = script.substring(0, script.indexOf(";"));
        var carlocationsString = script.substring(script.indexOf("carslocations: [") + 14);
        carlocationsString = carlocationsString.substring(0, carlocationsString.indexOf("bicycleZonesLocations"));
        carlocationsString = carlocationsString.substring(0, carlocationsString.lastIndexOf(","));
        var carlocations = JSON.parse(carlocationsString);
        var OriginLat = UserLat;
        var OriginLong = UserLng;
        var p = 0.017453292519943295;    // Math.PI / 180
        var c = Math.cos;
        // loop through carlocations array to add distance
        for (i = 0; i < carlocations.length; i++) {
          var lat1 = OriginLat;
          var lon1 = OriginLong;
          var lat2 = carlocations[i].lat;
          var lon2 = carlocations[i].lon;
          function distance(lat1, lon1, lat2, lon2) {
            var a = 0.5 - c((lat2 - lat1) * p)/2 + 
                    c(lat1 * p) * c(lat2 * p) * 
                    (1 - c((lon2 - lon1) * p))/2;
            carlocations[i].distance = 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
          }
        }
        console.log(carlocations[100].distance);
        // caluclate distance and add to a


        // find nearest car

        // loop again through carlocations array to find ID and details by nearest location


    } else {
        // http request failing
      console.error("error on request");
      console.log('error');
    }
  }); 

}

 


// function to send generic messages

function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: {access_token:app.get('page_access_token')},
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      console.log("Successfully sent generic message with id %s to recipient %s", 
        messageId, recipientId);
    } else {
      console.error("Unable to send message.");
      console.error(response);
      console.error(error);
      var messageData = {}
      callSendAPI(messageData);
    }
  });  
}


function sendTextMessage(sender, text) {
    messageData = {
        text:text
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:app.get('page_access_token')},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
    });
}

function getHTTPinfo(sender, value) {
        var url = "https://login.citybee.lt/lt/map/zone/" + value;
        request({
          headers: {
                'Cookie': 'PHPSESSID=7jr278b6p6t2dssg9orisikd80; device_view=full; BCSI-CS-97976de0be87e764=2; BIGipServerglosC-proxyVIP-bc-RBB-web_gdcsfscs05-55_8050_pool=3242406179.29215.0000; _ga=GA1.2.500491733.1468570414; BCSI-CS-b933f65a4f518259=2; BIGipServerSlough-proxyVIP-bc-RBB-web-SLGSFSCS105-155_8050_pool=3778638102.29215.0000; __utmt=1; __utma=269912044.500491733.1468570414.1468570425.1468587689.2; __utmb=269912044.4.10.1468587689; __utmc=269912044; __utmz=269912044.1468587689.2.2.utmcsr=citybee.lt|utmccn=(referral)|utmcmd=referral|utmcct=/lt/'
          },
          uri: url,
          method: "POST",
          timeout: 100000,
          followRedirect: true,
          maxRedirects: 10
        }, function(error, response, body) {
          var cheerio = require('cheerio'),
          $ = cheerio.load(body);
          var text = $('.brand').text();          
          console.log('here');
          console.log(url);

          var cars = [];
          var car = {};
          var element = {};
          var elements = [];

          $('li').each(function(i, elem) {
            car.brand = $(this).find('.brand').text();
            car.id = $(this).find( "input[name*='car-id']" ).attr('value');
            var imageUrlFull = $(this).find('.car-icon-div').attr('style');
            var substringStart = imageUrlFull.indexOf("(") + 2;
            var substringEnd = imageUrlFull.indexOf(")") - 1;
            console.log(imageUrlFull);
            console.log(substringStart);
            car.imageUrl = imageUrlFull.substring(substringStart, substringEnd);
            car.bookUrl = 'https://login.citybee.lt/mobile/lt/reservation/create/' + car.id;
            car.plateNr = "XXX000";
            cars.push(car); 
            element = {
              title: car.brand,
              subtitle: car.plateNr,
              item_url: car.bookUrl,               
              image_url: car.imageUrl,
              buttons: [{
                type: "web_url",
                url: car.bookUrl,
                title: "Rezervuoti"
              }, {
                type: "postback",
                title: "Call Postback",
                payload: "Payload for first bubble",
              }],
            };
            elements.push(element);
          });
          
            var messageData = {
              recipient: {
                id: sender
              },
              message: {
                attachment: {
                  type: "template",
                  payload: {
                    template_type: "generic",
                    elements: elements
                  }
                }
              }
            };  
//            sendTextMessage(sender, cars[0].imageUrl);
        if(cars.length > 0){   
          callSendAPI(messageData);
        }else{
          sendTextMessage(sender, "atsiprašome, " + value + " stotelėje šiuo metu nėra laisvų automobilių");
        }
        

          //sendTextMessage(sender, brands);
        });    
};

function sendGenericMessage(recipientId) {
  var elements = [{
            title: "rift",
            subtitle: "Next-generation virtual reality",
            item_url: "https://www.oculus.com/en-us/rift/",               
            image_url: "http://messengerdemo.parseapp.com/img/rift.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/rift/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for first bubble",
            }],
          }, {
            title: "touch",
            subtitle: "Your Hands, Now in VR",
            item_url: "https://www.oculus.com/en-us/touch/",               
            image_url: "http://messengerdemo.parseapp.com/img/touch.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/touch/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for second bubble",
            }]
          }];
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: elements
        }
      }
    }
  };  
  callSendAPI(messageData);
};







app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
});
  
