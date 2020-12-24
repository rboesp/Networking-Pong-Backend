const express = require('express');
const app = express()
const http = require('http').createServer(app)
const io = require('socket.io')(http)
var reload = require('reload')

const port = process.env.PORT || 3000

app.use(express.static('public'))

//global variables
let paddles = []

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

const refreshRate = 20
const player1Start = 10
const player2Start = 445

const paddleStartY = 220

const boardWidth = 480
const boardHeight = 270

function makeNewPiece(name) {
    const paddleStartX = !paddles.length ? player1Start : player2Start
    console.log(paddleStartX);
    const newPlayer = new GamePaddel(name, paddleStartX, paddleStartY);
    return newPlayer
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

/**
 * TODO: don't use x and y but speed x and y ???
 */
const checkPaddelHit = function(ball, paddle, paddleSide) {
    var ballTop = ball.y;
    var ballBottom = ball.y + (ball.radius)
    var ballLeft = ball.x 
    var ballRight = ball.x + (ball.radius);

    var brickLeft = paddle.x;
    var brickRight = paddle.x + (paddle.width);
    var brickTop = paddle.y;
    var brickBottom = paddle.y + (paddle.height);

    var crash = false

    if(paddleSide === 'left') {
        if (
            (brickBottom >= ballBottom) &&
            (brickRight >= ballLeft) &&
            (brickTop <= ballTop)
        ) {
            crash = true;
        } 
    }
    else {
        if (
            (brickBottom >= ballBottom) &&
            (brickLeft <= ballRight) &&
            (brickTop <= ballTop)
        ) {
            crash = true;
        } 
    }
    return crash;
}

let ballXDirection = -1 //left
let ballYDirection = -1 //up
let ballXMovement = 3
let ballYMovement = 1 //amount they are moving per frame, sign means right or left, up or down
//angle here
let yAngleMultiplier = 1

function playPong(ball, interval) {

    const paddleSides = ['left', 'right']
    paddles.forEach((paddle,i) => {
        if(!checkPaddelHit(ball, paddle, paddleSides[i])) return
        io.emit('bounce', 'hit paddel!!')

        //always switch x movement to go other direction
        ballXDirection = changeBallDirection(ballXDirection)

        //also swtich y, but by varying amounts based on
        //where the ball hit on the paddle
        var ballBottom = ball.y + (ball.radius)
        var brickTopRedRange = paddle.y + 30 //+ is down on canvas
        if(ballBottom < brickTopRedRange) {


            /*TODO: MAKE RANGES, MAKE INCLUDES TO FIGURE OUT IF IT IS IN ONE OF THE TWO RANGES RED (TOP + BOTTOM), YELLOW */

            //hit top red part of paddle
            io.emit('bounce', 'hit red!')
            yAngleMultiplier = 6
        }
        else { //OTHERWISE ASSUME HIT BLUE
            yAngleMultiplier = 1
        }
    })

    const winner = checkBallInEndzone(ball)
    if(winner) {
        io.emit('gameOver', winner)
        clearInterval(interval)
        return
    }

    if(checkBallHitTops(ball)){        
        io.emit('bounce', 'hit up or down!')
        ballYDirection = changeBallDirection(ballYDirection)
    }


    ball.x += (ballXDirection * ballXMovement)//increasing this would make ball move faster towards the paddles
    ball.y += (ballYDirection * ballYMovement * yAngleMultiplier)
    io.emit('ballMove', ball)

}

function startPong() {
    const ball = new GameBall()

    //emit to front end
    io.emit('startPong', ball)
    
    const gameInterval = setInterval(() => {
        playPong(ball, gameInterval)
    }, refreshRate)
}

io.on('connection', socket => { 

    socket.on('newName', username => {
        const name = username
        console.log(name + ' connected!')
    
        const playerNames = paddles.map(player => player.name)
    
        if(!playerNames.includes(name)) {
            const newGamePiece = makeNewPiece(name)
            paddles.push(newGamePiece)
        }
    
        io.emit('players', paddles)

        if(paddles.length !== 2) return
        startPong()
    })

    socket.on('userMove', move => {
        const playerToUpdate = paddles.filter(player => {
            return move.name === player.name
        })[0]
        if(!playerToUpdate) return
        playerToUpdate.y = move.y
        io.emit('newMove', paddles)
    })

    socket.on('leaving', name => {
        paddles = paddles.filter(player => {
            return player.name !== name
        })
        console.log(name + " disconnected!");
        console.log(paddles);
        io.emit('players', paddles)
    })
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