// server.js
    // set up ========================
    var express  = require('express');
    var app      = express();                    // create our app w/ express
    var morgan = require('morgan');             // log requests to the console (express4)

    app.use(express.static(__dirname + '/public'));                 // set the static files location /public/img will be /img for users
    app.use(morgan('dev'));                                         // log every request to the console


    var io = require('socket.io').listen(app.listen(8080),{
      'heartbeat interval': 5,
      'heartbeat timeout' : 10
    });

    let wordList=[];
    var fs = require('fs');
    fs.readFile('words.txt','utf8', function(err, data) {
        if(err) {
            throw err;
        }
        console.log('OK read');
        var array = data.toString().split("\n");
        wordList=array;
    });

    randomWord = function(){
        var arr = [];
        if(wordList.length>30){
            while(arr.length < 25){
                var randomnumber = Math.ceil(Math.random()*(wordList.length-1));
                if(arr.indexOf(wordList[randomnumber]) > -1) continue;
                arr[arr.length] = wordList[randomnumber];
            }
        }
        return arr;
    }
    randomSetting = function(){
        var arr = []
        while(arr.length < 18){
            var randomnumber = Math.ceil(Math.random()*24);
            if(arr.indexOf(randomnumber) > -1) continue;
            arr[arr.length] = randomnumber;
        }
        return arr;
    }

    let roomList=[]; 

    createNewBoard = function(){
        return {words:randomWord(),clicked:[],setting:randomSetting()};
    }
    
    roomList.push({roomInfo: '1', pass: '1234', boardInfo: createNewBoard()});
    roomList.push({roomInfo: '2', pass: '1234', boardInfo: createNewBoard()});
    roomList.push({roomInfo: '3', pass: '1234', boardInfo: createNewBoard()});

 
    app.get('/:name', function(req, res) {
        res.sendfile('./public/wordGrid.html');
    });    

    io.on('connection', function(client) {  
        console.log('Client connected...');

        client.on('join', function(data) {
            if (data.hasOwnProperty('roomInfo')) { 
              if (typeof data.roomInfo === 'string' || data.roomInfo instanceof String)
                doesRoomExist=false;
                index=-1;
                for (var i=0; i<roomList.length; i++) {
                  if(roomList[i].roomInfo === data.roomInfo){
                    doesRoomExist=true;
                    index=i;
                  }
                }
                if(!doesRoomExist){
                    client.emit('messages', {error: 'Well, that room does not exist :/ Sorry'});
                }
                else{
                    console.log("Room " + data.roomInfo+' already exists');              
                    if(data.pass === roomList[index].pass){
                        client.join(data.roomInfo);
                        client.roomName = roomList[index].roomInfo;
                        io.to(data.roomInfo).emit('messages', roomList[index]);
                    }
                    else{
                        client.emit('messages', {error:'wrong password!!!!'});
                    }
                }
            }
        });


        //MAKE IT ROOM SECURE!!
        client.on('messages', function(data) {
            if (data.hasOwnProperty('clicked')) {
                room = findroom(client.roomName);
                if(room){
                    if(room.boardInfo.clicked.indexOf(data.clicked)<=-1){
                        room.boardInfo.clicked.push(data.clicked);
                        io.to(client.roomName).emit('messages', room);
                    }
                    
                }    
                else
                    client.emit('messages', {error:'Couldnt find your room :(('});            
            }
            if(data.hasOwnProperty('refresh')){
                if(data.refresh){
                    room = findroom(client.roomName);
                    if(room){
                        room.boardInfo.words = randomWord();
                        room.boardInfo.setting = randomSetting();
                        room.boardInfo.clicked= []
                        io.to(client.roomName).emit('messages', room);;
                    }
                    else
                        client.emit('messages', {error:'Couldnt find your room :(('});
                }
                
            }
        });

        client.on('disconnect', function(data) {
            console.log('BYE BYE');
        });

        findroom = function(roomName){
            let room;
            for (var i=0; i<roomList.length; i++) {
                if(roomName===roomList[i].roomInfo){
                    room=roomList[i]
                    return room;
                }
            }
            return room;
        }
    });
    
    