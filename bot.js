const { time } = require('console');
const Discord = require('discord.js');
const client = new Discord.Client({partials : ["REACTION", "MESSAGE"]});
const fs = require('fs');
const AudioMixer = require("audio-mixer");
const { Server } = require('http');
const path = require('path');
const { Input } = require('audio-mixer');



const OwnerId = "671090972272230423";

PREFIX = '.';

SERVERID = '763134200035278908'
SERVERID2 = '851577567953158165'

GENERALVOICECHANNEL = "763134200035278912"
GENERALVOICECHANNEL2 = "851577568405618781"

GENERALCHATID = '763134200035278911';
DEFAULTROLE = '837745530380484638';

UPDATEMESSAGES = false;







var localMessageHistory = {};

function getFileData(filename)
{
    try
    {
        let data = fs.readFileSync(filename, "utf-8").split("\n");;
        return data;
    } 
    catch (error)
    {
        return error
    }
}

function formatMessageData(filename)
{
    let data = getFileData(filename);
    for (var i = 0; i < data.length; i++)
    {
        data[i] = data[i].split(" || ");
        localMessageHistory[data[i][0]] = data[i][1];
    }
}

async function storeMesssages(callback)
{
    let finalMessages = [];
    let channelIDs = [];
    client.guilds.cache.get(SERVERID).channels.cache.filter(channel => channel.type === "text").forEach(channelValue => {
        channelIDs.push(channelValue.id);
    })
    for (var i = 0; i < channelIDs.length; i++)
    {
        let channel = client.guilds.cache.get(SERVERID).channels.cache.get(channelIDs[i]);
        let before = channel.lastMessageID;

        let messages = []
        console.log("Pulling Messages from channel...")
        while (1) 
        {
            let tempMessages = [];
            if (!before) break;
            let values = await channel.messages.fetch({before : before.id});
            before  = values.last();
            values.forEach(message => {
                tempMessages.unshift(`${message.id} || ${message.author.username}{${message.author.id}} [${new Date(message.createdTimestamp).toUTCString()}]: ${message.content}\n`)
            });
            messages.unshift(...tempMessages);
        } 
        finalMessages.unshift(...messages);
    }
    console.log("Pulled All Messages. Writing to log file...");
    var file = fs.createWriteStream('TempMessages.txt');

    finalMessages.forEach(message => {
        file.write(message)
    });
    file.end();
    console.log("Writing Complete. Log saved!");
    setTimeout(callback, 2000);
}

function compareMessageFiles(callback)
{
    console.log("Comparing Old Messages to New...");
    let oldFile = getFileData("Messages.txt");
    let newFile = getFileData("TempMessages.txt");
    
    let deleted = [];
    for (var i = 0; i < oldFile.length; i++)
    {
        if (!newFile.includes(oldFile[i])) deleted.push(oldFile[i]);
    }
    console.log(`Discrepancies found (${deleted.length}). Appending them to a log file...`);
    var oldDiscrepancies = getFileData("Modifications.txt");
    oldDiscrepancies.push(...deleted);
    var file = fs.createWriteStream('Modifications.txt');
    oldDiscrepancies.forEach(message => {
        file.write(message + '\n');
    });
    file.end();
    console.log("Log Saved!");

    console.log("Updating Message Log File...");
    var file = fs.createWriteStream('Messages.txt');
    newFile.forEach(message => {
        file.write(message + '\n');
    });
    file.end();
    console.log("Update Complete!")

    console.log("Deleting Temp Log File...");
    fs.unlink("TempMessages.txt", (error) => {
        if (error) 
        {
            console.log("There was an error deleting the temp file");
            return;
        }
    });
    console.log("File Removed!")
    setTimeout(callback, 2000);
}

function actionOnMessageDelete(messageString)
{
    fs.appendFileSync("Modifications.txt", messageString);
    console.log(`The message ${messageString} was deleted`);
    sendOwnerMessage(`\`\`\`${messageString}\`\`\``);
}

function sendOwnerMessage(message)
{
    client.guilds.cache.get(SERVERID).members.cache.get(OwnerId).user.send(message);
}

function randomInt(max)
{
    return Math.floor(Math.random() * max);
}

client.on("ready", () => {
    console.log(`${client.user.username} active`);
    if (UPDATEMESSAGES)
        storeMesssages(() => compareMessageFiles(() => formatMessageData("Messages.txt")));
    else
        formatMessageData("Messages.txt");

    
    //trying to record audio
    async function recordAudio()
    {
        process.stdout.write("Joining General...");
        var connection = await client.guilds.cache.get(SERVERID).channels.cache.get(GENERALVOICECHANNEL).join();
        var connection2 = await client.guilds.cache.get(SERVERID2).channels.cache.get(GENERALVOICECHANNEL2).join();
        console.log("Joined!");

        //starting audio recording
        //connection.play("voice clips/starting audio recording.m4a")
        connection.play("user_audio.pcm");
        //.on("finish", () => connection.disconnect());

        const my_audio = connection2.receiver.createStream("671090972272230423", {end : "manual"});
        const other_audio = connection.receiver.createStream("360219716523917323", {end : "manual"}); 
        
        //connection.play(my_audio, {type: 'opus'});
        connection.play(my_audio, {type: 'opus'});
        connection2.play(other_audio, {type: 'opus'});

    }
    //recordAudio();
        
});

client.on("messageDelete", (message) => {
    if (message.content)
    {
        actionOnMessageDelete(`${message.id} || ${message.author.username}{${message.author.id}} [${new Date(message.createdTimestamp).toUTCString()}]: ${message.content}\n`)
    }
    else
    {
        if (localMessageHistory[message.id])
        {
            actionOnMessageDelete(localMessageHistory[message.id]);
        }
        else 
        {
            actionOnMessageDelete(`Message ${message.id} was not locally saved, content is lost`);
        }
        
    }
})

client.on("guildMemberAdd", member => {
    console.log("someone came");
    member.guild.channels.cache.get(GENERALCHATID).send(`Welcome to the server <@${member.user.id}>!`);
    member.addRole(DEFAULTROLE);
});

client.on("messageReactionAdd", (reaction, user) => {
    console.log("reaction", reaction.message.id);
});


client.on("message", async message => {
    fs.appendFileSync("Messages.txt", `${message.id} || ${message.author.username}{${message.author.id}} [${new Date(message.createdTimestamp).toUTCString()}]: ${message.content}\n`);
    if (message.author.bot)
    {
        return;
    }

    let intextReply = (includes, reply) => {
        if (message.content.includes(includes))
        {
            message.reply(reply, {tts: false});
        }
    };
    let replys = [...new Set(fs.readFileSync("replys.txt", 'utf-8').split("\n"))];
    for (var i = 0; i < replys.length; i++)
    {
        replys[i] = replys[i].split(' | ')
    }

    replys.forEach(replySet => {
        intextReply(replySet[0], replySet[1]);
    });


    //if a command
    if (message.content.startsWith(PREFIX))
    {  
        const [command_name, ...args] = message.content //... is the spreader operator and takes in ALL other values
        .trim()
        .substring(PREFIX.length)
        .split(/\s+/);
        
        switch(command_name)
        {
            case "random":
                async function play() {
                    let voiceChannel = message.guild.channels.cache.get("763134200035278912");
                    var connection = await voiceChannel.join();
                    let songs = fs.readdirSync("songs");
                    let index = randomInt(songs.length);
                    console.log(index, typeof(index));
                    let song = songs[index];
                    console.log(`Playing song ${song} by request of ${message.author.username}`);
                    connection.play(`songs/${song}`)
                    .on("finish", () => connection.disconnect());
                }
                play();
            case "go":
                if (args[0] && message.author.id === OwnerId)
                {
                    var channel = message.guild.channels.cache.get("838134345436758037");

                    message.delete();
                    while (true)
                    {
                        let messagesStuff = await channel.messages.fetch();
                        let jacksbotmessages = [];
                        messagesStuff.forEach(element => {
                            if (element.author.bot)
                                jacksbotmessages.push(element);
                        });
                        message.channel.bulkDelete(jacksbotmessages);
                    }
                    
                    
                }
            case "bye":
                if (message.author.id === OwnerId)
                {
                    let idofspammember = message.mentions.users.first().id;
                    message.delete();
                    while (true)
                        await client.guilds.cache.get(SERVERID).members.cache.get(idofspammember).send("you are a dick");
                }
            case "makeReply":
                message.delete();
                let values = args.join(" ");
                if (values.includes(" | "))
                    values = values.split(" | ");
                if (values[0] && values[1])
                    fs.appendFileSync("replys.txt", "\n" + values[0] + " | " + values[1]);
            case "shutdown":
                message.delete();
                throw "they got tired of you"
        }    
    }
    
});

//get token
client.login(fs.readFileSync(".key", "utf-8").replace(/\r?\n|\r/g, ""));