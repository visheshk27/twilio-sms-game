

"use strict";

const bodyParser = require("body-parser");
const express = require("express");
const random = require("random");
const twilio = require("twilio");

// Set up the app
const app = express();

// Let the Twilio API stuff be passed in via environment
let accountSid = process.env.TWILIO_SID || "";
let authToken = process.env.TWILIO_TOKEN || "";

const client = new twilio(accountSid, authToken);
const MessagingResponse = require("twilio").twiml.MessagingResponse;
app.use(bodyParser.urlencoded({ extended: false }));

// Store the game data in an object
let gameData = {
    "games": {
    }
};

app.post("/sms", (request, response) => {
    const twiml = new MessagingResponse();

    // Establish helper variables
    let fromNumber = request.body.From;
    let messageBody = request.body.Body.toLowerCase();
    let responseText = "";

    // Get record for current phone number
    if (!(fromNumber in gameData.games)) {
        gameData.games[fromNumber] = {};
    }
    let currentRecord = gameData.games[fromNumber];

    switch (messageBody) {
        case "help" || "helpme" || "hello": // HELP is intercepted by twilio
            responseText = "Text 'start' to start a game!";
            break;

        case "start":
            // If a game was already started, refuse
            if ("actual" in currentRecord) {
                responseText = "A game is already in progress!";
                break;
            }

            // Generate a random number and store it
            let randomNum = random.int(1, 10);
            currentRecord["actual"] = randomNum;

            // Record amount of times played
            if (!("playCount" in currentRecord)) {
                currentRecord["playCount"] = 1;
            } else {
                currentRecord["playCount"] += 1;
            }
            responseText = "Guess a random number from 1 to 10! Reply STOPGAME to stop.";
            break;

        case "stop" || "stopgame":
            responseText = "Stopping game. Sorry to see you go!";
            delete currentRecord["actual"];
            break;

        case "last" || "lastguess":
            responseText = "Your last guess was: " + currentRecord["guess"];
            break;

        default:
            // Check and see if input is a number
            if (!isNaN(messageBody)) {
                messageBody = Number(messageBody);

                // Check if there is a game in progress
                if ("actual" in currentRecord) {
                    // Error on out of range numbers
                    if (messageBody > 10 || messageBody < 1) {
                        responseText = "Number out of range.";
                    }
                    // See if it is equal
                    else if (messageBody === Number(currentRecord["actual"])) {
                        responseText = "You won! You've played " + currentRecord["playCount"] + " ";
                        if (Number(currentRecord["playCount"]) === 1) {
                            responseText += "game.";
                        } else {
                            responseText += "games.";
                        }
                    }
                    // State to go up or down
                    else if (messageBody > Number(currentRecord["actual"])) {
                        responseText = "Go lower!";
                    } else {
                        responseText = "Go higher!";
                    }
                }
            } else {
                responseText = "Invalid response received. Type HELPME for help.";
            }
            break;
    }

    response.set("Content-Type", "text/xml");
    twiml.message(responseText);
    response.send(twiml.toString());
});

app.listen(process.env.WEB_PORT || 8080);
