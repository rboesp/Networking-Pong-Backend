const express = require('express');
const app = express()
const http = require('http').createServer(app)
const io = require('socket.io')(http)
var logger = require('morgan')
var reload = require('reload')

const port = process.env.PORT || 3000

app.use(express.static('public'))

let players = []

class GamePadel {
    constructor (width, height, color, name, x, y) {
      this.width = width;
      this.height = height;
      this.x = x;
      this.y = y;  
      this.color = color;  
      this.name = name
  }
}

class GameBall {
    constructor(x , y , radius, startAngle) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.startAngle = startAngle;
        this.endAngle = 2 * Math.PI;
        this.speedX = 0;
        this.speedY = 0;
        this.gravity = 0.1;
        this.gravitySpeed = 0;
        this.bounce = 0.6;
    }
}

function makeNewPiece(name) {
    const x = !players.length ? 10 : 445
    console.log(x);
    const newPlayer = new GamePadel(25, 75, "blue", name, x, 220);
    return newPlayer
}

function startPong() {
    //make a new component
    const ball = new GameBall(240, 140, 4, 0)

    //emit to front end
    io.emit('startPong', ball)

    //wait for bounces to be emited from frontend
    //when bounces come in, emit to all players
}

io.on('connection', socket => { 

    socket.on('newName', username => {
        const name = username
        console.log(name + ' connected!')
    
        const playerNames = players.map(player => {
            return player.name
        })
    
        if(!playerNames.includes(name)) {
            const newGamePiece = makeNewPiece(name)
            players.push(newGamePiece)
        }
    
        io.emit('players', players)

        if(players.length !== 2) return
        startPong()
    })

    socket.on('userMove', move => {
        // console.log(`${move.name} updating!`)
        // console.log(players);
        const playerToUpdate = players.filter(player => {
            return move.name === player.name
        })
        if(!playerToUpdate.length) return
        // playerToUpdate[0].x = move.x
        playerToUpdate[0].y = move.y
        // console.log(players);
        io.emit('newMove', players)
    })

    socket.on('leaving', name => {
        players = players.filter(player => {
            return player.name !== name
        })
        console.log(name + " disconnected!");
        console.log(players);
        io.emit('players', players)
    })

    // socket.on('disconnect', () => {
    //     console.log('a user disconnected')
    // })
 })

 // Reload code here
reload(app).then(function (reloadReturned) {
    // reloadReturned is documented in the returns API in the README
   
    // Reload started, start web server
    http.listen(port, function () {
        console.log('Web server listening on port ' + port)
    })
    }).catch(function (err) {
        console.error('Reload could not start, could not start server/sample app', err)
    }
)