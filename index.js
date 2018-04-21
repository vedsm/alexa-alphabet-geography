'use strict';
const Alexa = require("alexa-sdk");
const appId = undefined; // amzn1.ask.skill.e5433c77-53dc-48ac-832a-a5afec18912f

const START_LETTER = require('./database/start_letter.json');
const END_LETTER = require('./database/end_letter.json');

const languageStrings = {
    // 'en-GB': {
    //     'translation': {
    //         'SAY_HELLO_MESSAGE' : 'Hello World!'
    //     }
    // },
    'en-US': {
        'translation': {
            'WELCOME_MESSAGE' : 'Welcome to letter atlas game.',
            'YOU_HAVE_PLAYED_MESSAGE' : 'You have played ',
            'TIMES': ' times.',
            'IS': ' is ',
            'WOULD_YOU_LIKE_TO_PLAY_MESSAGE': ' Would you like to play?',
            'YES_OR_NO_MESSAGE': 'Say yes to start the game or no to quit.',
            'GOODBYE_MESSAGE': 'Goodbye!',
            'SEE_YOU_MESSAGE': 'Ok, see you next time!',
            'SAY_A_PLACE_NAME_MESSAGE': 'Try saying a name of a place.',
            'SAY_A_PLACE_NAME_STARTING_FROM_LETTER_MESSAGE': 'Try saying a name of a place starting from letter ',            
            'YEY_SAY_A_PLACE_NAME_MESSAGE': 'Great! Try saying a name of a place to start the game.',
            'SORRY_AND_REPEAT_MESSAGE': 'Sorry, I didn\'t get that. Try saying a name of a place.',
            'EXPLANATION_MESSAGE': 'I will say a name of place, then you say the name of a place which starts with the ending alphabet of what I said.' +
                ' Then I say a name of new place which starts with alphabet of what you said and the game continues so on',
            'IS_NOT_A_VALID_PLACE_MESSAGE': ' is not a valid place.',
            'NEXT_PLACE_NAME_STARTING_FROM_MESSAGE': 'My next place name starting from ',
            'DOES_NOT_START_WITH_LETTER_OF_MESSAGE': ' does not start with the end letter of ',
            'I_DONT_KNOW_ANY_MORE_PLACE_NAME_STARTING_FROM_MESSAGE': 'I do not know any more place names starting from letter ',
            'YOUR_HAVE_WON_THE_GAME' : ' You have won the game. Would you like to play a new game?',
            '_ALREADY_USED_MESSAGE': ' has been already used in this round.'
        }
    }
};

exports.handler = function(event, context, callback) {
    const alexa = Alexa.handler(event, context);
    alexa.appId = appId;
    // alexa.dynamoDBTableName = 'highLowGuessUsers';
    alexa.resources = languageStrings;
    alexa.registerHandlers(newSessionHandlers, guessModeHandlers, startGameHandlers, guessAttemptHandlers);
    alexa.execute();
};

const states = {
    GAMEMODE: '_GAMEMODE', // User is trying to guess the number.
    STARTMODE: '_STARTMODE'  // Prompt the user to start or restart the game.
};

const newSessionHandlers = {
    'NewSession': function() {
        if(Object.keys(this.attributes).length === 0) {
            this.attributes['endedSessionCount'] = 0;
            this.attributes['gamesPlayed'] = 0;
        }
        this.handler.state = states.STARTMODE;
        this.response.speak(this.t('WELCOME_MESSAGE') + this.t('YOU_HAVE_PLAYED_MESSAGE')
            + this.attributes['gamesPlayed'].toString() + this.t('TIMES') + this.t('WOULD_YOU_LIKE_TO_PLAY_MESSAGE'))
            .listen(this.t('YES_OR_NO_MESSAGE'));
        this.emit(':responseReady');
    },
    "AMAZON.StopIntent": function() {
      this.response.speak(this.t('GOODBYE_MESSAGE'));
      this.emit(':responseReady');
    },
    "AMAZON.CancelIntent": function() {
        this.response.speak("Goodbye!");
        this.emit(':responseReady');
    },
    'SessionEndedRequest': function () {
        console.log('session ended!');
        //this.attributes['endedSessionCount'] += 1;
        this.response.speak(this.t('GOODBYE_MESSAGE'));
        this.emit(':responseReady');
    }
};

const startGameHandlers = Alexa.CreateStateHandler(states.STARTMODE, {
    'NewSession': function () {
        this.emit('NewSession'); // Uses the handler in newSessionHandlers
    },
    'AMAZON.HelpIntent': function() {
        this.response.speak(this.t('EXPLANATION_MESSAGE')).listen(this.t('SAY_A_PLACE_NAME_MESSAGE'));
        this.emit(':responseReady');
    },
    'AMAZON.YesIntent': function() {
        this.attributes["guessNumber"] = Math.floor(Math.random() * 100); //delete

        this.attributes["saidPlaces"] = [];
        this.handler.state = states.GAMEMODE;
        this.response.speak(this.t('YEY_SAY_A_PLACE_NAME_MESSAGE')).listen(this.t('SAY_A_PLACE_NAME_MESSAGE'));
        this.emit(':responseReady');
    },
    'AMAZON.NoIntent': function() {
        console.log("NOINTENT");
        this.response.speak(this.t('SEE_YOU_MESSAGE'));
        this.emit(':responseReady');
    },
    "AMAZON.StopIntent": function() {
      console.log("STOPINTENT");
      this.response.speak(this.t('GOODBYE_MESSAGE'));
      this.emit(':responseReady');
    },
    "AMAZON.CancelIntent": function() {
      console.log("CANCELINTENT");
      this.response.speak(this.t('GOODBYE_MESSAGE'));
      this.emit(':responseReady');
    },
    'SessionEndedRequest': function () {
        console.log("SESSIONENDEDREQUEST");
        //this.attributes['endedSessionCount'] += 1;
        this.response.speak(this.t('GOODBYE_MESSAGE'));
        this.emit(':responseReady');
    },
    'Unhandled': function() {
        console.log("UNHANDLED");
        const message =  this.t('YES_OR_NO_MESSAGE');
        this.response.speak(message).listen(message);
        this.emit(':responseReady');
    }
});

const guessModeHandlers = Alexa.CreateStateHandler(states.GAMEMODE, {
    'NewSession': function () {
        this.handler.state = '';
        this.emitWithState('NewSession'); // Equivalent to the Start Mode NewSession handler
    },
    'NumberGuessIntent': function() {
        const guessNum = parseInt(this.event.request.intent.slots.number.value, 10);
        const targetNum = this.attributes["guessNumber"];
        console.log('user guessed: ' + guessNum);

        if(guessNum > targetNum){
            this.emit('TooHigh', guessNum);
        } else if( guessNum < targetNum){
            this.emit('TooLow', guessNum);
        } else if (guessNum === targetNum){
            // With a callback, use the arrow function to preserve the correct 'this' context
            this.emit('JustRight', () => {
                this.response.speak(guessNum.toString() + 'is correct! Would you like to play a new game?')
                .listen('Say yes to start a new game, or no to end the game.');
                this.emit(':responseReady');
        });
        } else {
            this.emit('NotANum');
        }
    },
    'NextWordIntent': function() {
        /**
         * TODO: 
         * check if the word said is a valid word
         *   - if yes, check if its first word
         *     - if yes, store the word & start game
         *     - if no,
         *       - check if the word has been previously used
         *         - if yes, throw the error 
         *         - if no, check if the first letter of word matches the last letter of previous word said
         *           - if yes, store it and find next word
         *           - if no, emit last letter does not match
         *   - if no, ask for a valid word
         */
        let currentWord = this.event.request.intent.slots.word.value || '';
        currentWord = currentWord.toLowerCase();
        let saidPlaces = this.attributes["saidPlaces"];

        if(END_LETTER[currentWord]) {
            let endLetterOfCurrentWord = END_LETTER[currentWord];
            if(saidPlaces.length === 0){ // first word
                //find a new word starting from last letter of currentWord
                this.emit('getNextWord', currentWord, saidPlaces)
            }
            else{ // not the first word
                let lastWord = saidPlaces.slice(-1);
                let endLetterOfLastWord = END_LETTER[lastWord];
                if(saidPlaces.indexOf(currentWord) > -1){ //the currentWord was already used in the game
                    this.response.speak(currentWord + this.t('_ALREADY_USED_MESSAGE'))
                        .listen(this.t('SAY_A_PLACE_NAME_STARTING_FROM_LETTER_MESSAGE') + endLetterOfLastWord);
                    this.emit(':responseReady');
                }
                else{ ///The currentWord was not already used in the game
                    let startLetterOfCurrentWord = getFirstLetter(currentWord);
                    // console.log("startLetterOfCurrentWord->",startLetterOfCurrentWord);
                    if(endLetterOfLastWord == startLetterOfCurrentWord){ //last letter matches
                        //store the word and find next word

                        this.emit('getNextWord', currentWord, saidPlaces)
                    }
                    else{ //end letter of last word does not match start letter of 
                        this.response.speak(currentWord + this.t('DOES_NOT_START_WITH_LETTER_OF_MESSAGE') + lastWord)//_ does not start with the letter _
                            .listen(this.t('SAY_A_PLACE_NAME_STARTING_FROM_LETTER_MESSAGE') + endLetterOfLastWord);
                        this.emit(':responseReady');
                    }
                }
            }
        }
        else{
            this.response.speak(currentWord + this.t('IS_NOT_A_VALID_PLACE_MESSAGE'))
                .listen(this.t('SAY_A_PLACE_NAME_MESSAGE'));
            this.emit(':responseReady');
        }
        // this.response.speak('You said the word ' + currentWord)
        //     .listen(' Isnt that right.');
        // this.emit(':responseReady');
    },
    'AMAZON.HelpIntent': function() {
        this.response.speak(this.t('EXPLANATION_MESSAGE'))
            .listen(this.t('SAY_A_PLACE_NAME_MESSAGE'));
        this.emit(':responseReady');
    },
    "AMAZON.StopIntent": function() {
        console.log("STOPINTENT");
        this.response.speak(this.t('GOODBYE_MESSAGE'));
        this.emit(':responseReady');
    },
    "AMAZON.CancelIntent": function() {
        console.log("CANCELINTENT");
    },
    'SessionEndedRequest': function () {
        console.log("SESSIONENDEDREQUEST");
        this.attributes['endedSessionCount'] += 1;
        this.response.speak(this.t('GOODBYE_MESSAGE'));
        this.emit(':responseReady');
    },
    'Unhandled': function() {
        console.log("UNHANDLED");
        this.response.speak(this.t('SORRY_AND_REPEAT_MESSAGE'))
        .listen(this.t('SAY_A_PLACE_NAME_MESSAGE'));
        this.emit(':responseReady');
    }
});

// These handlers are not bound to a state
const guessAttemptHandlers = {
    'TooHigh': function(val) {
        this.response.speak(val.toString() + ' is too high.')
        .listen('Try saying a smaller number.');
        this.emit(':responseReady');
    },
    'TooLow': function(val) {
        this.response.speak(val.toString() + ' is too low.')
        .listen('Try saying a larger number.');
        this.emit(':responseReady');
    },
    'JustRight': function(callback) {
        this.handler.state = states.STARTMODE;
        this.attributes['gamesPlayed']++;
        callback();
    },
    'NotANum': function() { //delete
        this.response.speak(this.t('SORRY_AND_REPEAT_MESSAGE'))
        .listen(this.t('SAY_A_PLACE_NAME_MESSAGE'));
        this.emit(':responseReady');
    },
    'getNextWord': function(currentWord, saidPlaces){
        saidPlaces.push(currentWord);
        let endLetterOfCurrentWord = END_LETTER[currentWord];
        let wordsStartingWithEndLetterOfCurrentWord = START_LETTER[endLetterOfCurrentWord];
        let selectedNextWord;
        for(let i=0;i<wordsStartingWithEndLetterOfCurrentWord.length;i++){
            let wordStartingWithEndLetterOfCurrentWord = wordsStartingWithEndLetterOfCurrentWord[i];
            if(saidPlaces.indexOf(wordStartingWithEndLetterOfCurrentWord) == -1){
                selectedNextWord = wordStartingWithEndLetterOfCurrentWord;
                break;
            }
        }
        if(selectedNextWord){
            saidPlaces.push(selectedNextWord);
            this.attributes["saidPlaces"] = saidPlaces;
            let endLetterOfSelectedNextWord = END_LETTER[selectedNextWord];
            this.response.speak(this.t('NEXT_PLACE_NAME_STARTING_FROM_MESSAGE') + endLetterOfCurrentWord + this.t('IS') + selectedNextWord)
                .listen(this.t('SAY_A_PLACE_NAME_STARTING_FROM_LETTER_MESSAGE') + endLetterOfSelectedNextWord);
            this.emit(':responseReady');
        }
        else{
            //Won the game!
            this.handler.state = states.STARTMODE;
            this.attributes['gamesPlayed']++;
            this.response.speak(this.t('I_DONT_KNOW_ANY_MORE_PLACE_NAME_STARTING_FROM_MESSAGE') + endLetterOfCurrentWord 
                + this.t('YOUR_HAVE_WON_THE_GAME'))
                .listen(this.t('YES_OR_NO_MESSAGE'));
            this.emit(':responseReady');
        }
    }
};


const getFirstLetter = function(word){
    return word.slice(0, 1);
}