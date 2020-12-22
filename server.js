const express = require('express');
const app = express()
const http = require('http').createServer(app)
const io = require('socket.io')(http)
var logger = require('morgan')
var reload = require('reload')

const port = process.env.PORT || 3000

app.use(express.static('public'))

//global variables
let players = []
let xMovement = -2
let yMovement = -1 //amount they are moving per frame, sign means right or left

class GamePaddel {
    constructor (name, x, y) {
      this.width = 5
      this.height = 60 
      this.color = 'blue'
      this.name = name
      this.x = x
      this.y = y
  }
}

class GameBall {
    constructor(x , y , radius, startAngle) {
        this.x = 240;
        this.y = 140;
        this.radius = 4; //double for diameter
        this.startAngle = 0;
        this.endAngle = 2 * Math.PI;
        this.speedX = 0;
        this.speedY = 0;
        this.gravity = 1;
        this.gravitySpeed = 50;
        this.bounce = 0.6;
    }
}

const BALL_REFRESH_RATE = 20
const player1Start = 10
const player2Start = 445

const paddleStartY = 220

const boardWidth = 480
const boardHeight = 270

function makeNewPiece(name) {
    const startLocationX = !players.length ? player1Start : player2Start
    console.log(startLocationX);
    const newPlayer = new GamePaddel(name, startLocationX,paddleStartY);
    return newPlayer
}

/**
 * TODO: don't use x and y but speed x and y ???
 */
const checkPaddelHit = function(ball, brick) {
    var ballTop = ball.y;
    var ballBottom = ball.y + (ball.radius)
    var ballLeft = ball.x 
    var ballRight = ball.x + (ball.radius);

    var brickLeft = brick.x;
    var brickRight = brick.x + (brick.width);
    var brickTop = brick.y;
    var brickBottom = brick.y + (brick.height);
    var crash = false;

    if ((ballBottom < brickTop) ||
    (ballTop > brickBottom) ||
    (ballRight < brickLeft) ||
    (ballLeft > brickRight)) {
      crash = true;
    }
    return crash;
  }

function checkBallInEndzone(ball) {
    const rightEnd = boardWidth
    const leftEnd = 0

    if(ball.x <= leftEnd) {
        return 'Winner: Right!'
    }
    if(ball.x >= rightEnd) {
        return 'Winner: Left!'
    }
    return false
}

function checkBallHitTops(ball) {
    const top = boardHeight
    const bottom = 0
    let hit = false
    if(ball.y >= top) {
        hit = true
    }
    if(ball.y <= bottom) {
        hit = true
    }
    return hit
}

function changeBallDirection(dir) {
    return dir * -1
}

function startPong() {
    //make a new component
    const ball = new GameBall()

    //emit to front end
    io.emit('startPong', ball)
    
    setInterval(() => {
        // ball.gravitySpeed += ball.gravity
        // ball.x = ball.gravitySpeed /*TODO: either use this or take it out */
        // ball.x += 1

        ball.x += xMovement
        ball.y += yMovement /*TODO: make this bounce according to paddle ball hit on paddle*/
        io.emit('ballMove', ball)

        const player1 = players[0]
        const player2 = players[1]
    
        if(
            checkPaddelHit(ball, player1) || 
            checkPaddelHit(ball, player2)
        ) {    
            io.emit('bounce', 'bounce!')
            xMovement = changeBallDirection(xMovement)
        }

        if(checkBallHitTops(ball)){        
            io.emit('bounce', 'hit up or down!')
            yMovement = changeBallDirection(yMovement)
        }

        const winner = checkBallInEndzone(ball)
        if(winner) {
            io.emit('gameOver', winner)
        }

    }, BALL_REFRESH_RATE)
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
        playerToUpdate[0].y = move.y
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

 // Reload frontend here
reload(app)
.then(function (reloadReturned) {

    // Reload started, start web server
    http.listen(port, function () {
        console.log('Web server listening on port ' + port)
    })
}).catch(function (err) {
    console.error('Reload could not start, could not start server/sample app', err)
})