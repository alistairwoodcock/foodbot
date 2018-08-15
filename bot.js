var Discord = require('discord.io');
const auth = require('./auth.json');

const START = 'START';
const PICKTWO = 'PICKTWO';

var gameState = {
    playing: false,
    state: START,
    pickTwo: [], // Options to pick
    pickTwoString: '', 
    pickedTwo: [], // Options picked
}

var places = {};

var bot = new Discord.Client({
    token: auth.token,
    autorun: true
});

(() => {
    var p_json = null;
    try {
        p_json = require('./places.json');
        places = p_json;
    } catch (error) {}
})();


bot.on('ready', function() {
    console.log('Logged in as %s - %s\n', bot.username, bot.id);
});

bot.on('message', function(user, userID, channelID, message, event) {

    var messageData = {
        user, userID, channelID, message, event
    };

    var args = message.split(' ');
    var foodbot = args[0];

    if(!foodbot) return;

    foodbot = foodbot.toLowerCase();

    switch(foodbot)
    {
        case 'foodbot': 
        {
            if(args.length <= 1){
                doCommand(messageData, 'help', []);                
                break;
            }

            var cmd = args[1];
            args = args.splice(2,args.length);

            doCommand(messageData, cmd, args);
        }
        break;

        case 'ping':

            bot.sendMessage({
                to: channelID,
                message: `nope.`
            })

        break;
    }
});

function doCommand(data, cmd, args) {

    if(gameState.playing)
    {
        doGame(data, cmd, args);

        return;
    }

    console.log(cmd);
    console.log(args);

    switch(cmd) 
    {
        case 'help':
        case 'commands':
        case 'what':
        {
            bot.sendMessage({
                to: data.channelID,
                message: "say: 'add' or 'list' or 'play'"
            });
        }
        break;

        case 'fud': 
        {
            bot.sendMessage({
                to: data.channelID,
                message: "you dun goofed"
            });
        } 
        break;

        case 'add':
        {
            var placeName = args[0];

            if(!placeName) {
                bot.sendMessage({
                    to: data.channelID,
                    message: `Please give a place and some tags:\ne.g:\nfoodbot add [placeName] [tag1] [tag2] etc...`
                });
                break;
            }

            var newTags = [...args];
            newTags.splice(0,1);

            if(newTags.length == 0) {
                bot.sendMessage({
                    to: data.channelID,
                    message: `Please add some tags to the place:\ne.g:\nfoodbot add [placeName] [tag1] [tag2] etc...`
                });
               break;
            }

            var tagList = newTags.reduce((list, tag) => list + ` ${tag}`);  
            
            var place = {};
            var existingTags = [];

            if(places.hasOwnProperty(placeName)){
                place = places[placeName];
                existingTags = place.tags;
            }

            places[placeName] = {
                tags: [...existingTags, ...newTags],
            }

            if (existingTags.length == 0) {
                bot.sendMessage({
                    to: data.channelID,
                    message: `Adding '${placeName}' to Five Two One with tags: ${tagList}`
                });
            } else {
                bot.sendMessage({
                    to: data.channelID,
                    message: `Updating '${placeName}' in Five Two One with new tags: ${tagList}`
                });
            }

            savePlaces();

        }
        break;

        case 'remove':
        {
            var placeName = args[0];

            if(!placeName) {
                bot.sendMessage({
                    to: data.channelID,
                    message: `Please give a place to remove`
                });
                break;
            }

            delete places[placeName];

            bot.sendMessage({
                to: data.channelID,
                message: `It's gone my friend`
            });

        }
        break;

        case 'help':
        case 'food':
        case 'play':
        {
            doGame(data, cmd, args);
            break;
        }
        break;

        case 'list':
        {
            var placeList = '';

            if(Object.keys(places).length == 0){
                bot.sendMessage({
                    to: data.channelID,
                    message: `no places ya silly billy`
                });
                break;
            }

            for (var key in places) {
                var p = places[key];
                var tagList = '';

                if(p.tags.length > 0){
                    tagList = p.tags.reduce((list, tag) => list + ` ${tag}`);
                }

                placeList += `*${key}*\n tags: ${tagList}\n`;
            }

            bot.sendMessage({
                to: data.channelID,
                message: `All places:\n${placeList}`
            });
        }
        break;

        break;
    }
}

function doGame(data, cmd, args) {

    console.log(gameState);

    switch(gameState.state)
    {
        case START: 
        {
            if(Object.keys(places).length <= 4) {
                bot.sendMessage({
                    to: data.channelID,
                    message: `not enough places ya dingus!`
                });

                break;
            }

            var placeNames = Object.keys(places);

            var withTag = '';

            if(args.length > 0) {
                var tag = args[0];
                withTag = ` with tag '${tag}'`;

                placeNames = placeNames.filter(name => places[name].tags.includes(tag))

                if(placeNames.length < 5) {
                    bot.sendMessage({
                        to: data.channelID,
                        message: `not enough places${withTag} :(`
                    });
                    break;
                }
            }
            


            var placesCount = placeNames.length;

            gameState.playing = true;

            var placeList = [];
            var placesListString = '';

            var randoIndexes = [];

            while(randoIndexes.length < 5) {
                var index = getRandom(0, placeNames.length - 1);

                if(randoIndexes.includes(index)) continue;

                randoIndexes.push(index);
                placeList.push(placeNames[index]);
                placesListString += ' ' + placeNames[index];
            }

            gameState.pickTwo = placeList;
            gameState.pickTwoString = placesListString;

            gameState.state = PICKTWO

            bot.sendMessage({
                to: data.channelID,
                message: `pick two from these five${withTag}:\n${gameState.pickTwoString}\nsay: 'foodbot pick [placeName] [placeName]'`
            });
        }
        break;

        case PICKTWO:
        {
            var success = false;

            switch(cmd) {
                case 'pick': {

                    if(args.length < 2) {
                        bot.sendMessage({
                            to: data.channelID,
                            message: `pick two from these five:\n${gameState.pickTwoString}\nsay: 'foodbot pick [placeName] [placeName]'`
                        });
                        break;
                    }

                    var place1 = args[0];

                    if (!(gameState.pickTwo.includes(place1))) {
                        bot.sendMessage({
                            to: data.channelID,
                            message: `no such place '${place1}'`,
                        });
                        break;
                    } else {
                        gameState.pickedTwo.push(place1);
                    }

                    var place2 = args[1];

                    if (!(gameState.pickTwo.includes(place2))) {
                        bot.sendMessage({
                            to: data.channelID,
                            message: `no such place '${place2}'`,
                        });
                        break;
                    } else {
                        gameState.pickedTwo.push(place2);
                    }

                    var index = getRandom(0, 1);
                    var pickedPlaceName = gameState.pickedTwo[index];

                    bot.sendMessage({
                        to: data.channelID,
                        message: `You're going to eat at ${pickedPlaceName}\n\nthaaaanks byeeeee`,
                    });

                    success = true;

                } break;

                default: {
                    bot.sendMessage({
                        to: data.channelID,
                        message: `No we pickin' right now\nsay: 'foodbot pick place1 place2'`
                    });
                }
            }

            if(success) {
                gameState.playing = false;
                gameState.state = START;
                gameState.pickTwo = [];
                gameState.pickedTwo = [];
                gameState.placesList = [];
                gameState.pickTwoString = '';    
            }
            
        }
        break;
    }


}

function savePlaces(){
    var fs = require('fs');
    fs.writeFile('places.json', JSON.stringify(places), 'utf8', () => {});
}

function getRandom(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}