const express = require("express")
const app = express()
const http = require("http").createServer(app)
const io = require("socket.io")(http)
var reload = require("reload")

const port = process.env.PORT || 3000

app.use(express.static("public"))

//global variables
const paddles = []
const scores = {
    left: 0,
    right: 0,
}

class GamePaddel {
    constructor(name, x, y) {
        this.width = 4
        this.height = 80
        this.mainColor = "blue"
        this.edgeColor = "red"
        this.middleColor = "yellow"
        this.edgeDistanceY = 10
        this.middleDistanceY = 20
        this.name = name
        this.x = x
        this.y = y
    }
}

class GameBall {
    constructor(x, y, radius, startAngle) {
        this.x = 240
        this.y = 140
        this.radius = 4
        this.startAngle = 0
        this.endAngle = 2 * Math.PI
        // this.speedX = 0;
        // this.speedY = 0;
        // this.gravity = 1;
        // this.gravitySpeed = 50;
        // this.bounce = 0.6;
    }
}

const refreshRate = 10
const player1Start = 5
const player2Start = 475

const paddleStartY = 220

const boardWidth = 480
const boardHeight = 270

function makeNewPiece(name) {
    const paddleStartX = !paddles.length ? player1Start : player2Start
    console.log(paddleStartX)
    const newPlayer = new GamePaddel(name, paddleStartX, paddleStartY)
    return newPlayer
}

function checkBallInEndzone(ball) {
    const rightEnd = boardWidth
    const leftEnd = 0

    if (ball.x <= leftEnd) {
        scores.right += 1
        return "Winner: Right!"
    }
    if (ball.x >= rightEnd) {
        scores.left += 1
        return "Winner: Left!"
    }
    return false
}

function checkBallHitTops(ball) {
    const top = boardHeight
    const bottom = 0
    let hit = false
    if (ball.y >= top) {
        hit = true
    }
    if (ball.y <= bottom) {
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
const checkPaddelHit = function (ball, paddle, paddleSide) {
    var ballTop = ball.y
    var ballBottom = ball.y + ball.radius
    var ballLeft = ball.x
    var ballRight = ball.x + ball.radius

    var brickLeft = paddle.x
    var brickRight = paddle.x + paddle.width
    var brickTop = paddle.y
    var brickBottom = paddle.y + paddle.height

    var crash = false

    if (paddleSide === "left") {
        if (brickBottom >= ballBottom && brickRight >= ballLeft && brickTop <= ballTop) {
            crash = true
        }
    } else {
        if (brickBottom >= ballBottom && brickLeft <= ballRight && brickTop <= ballTop) {
            crash = true
        }
    }
    return crash
}

let ballXDirection = -1 //left
let ballYDirection = -1 //up
let ballXMovement = 3
let ballYMovement = 1 //amount they are moving per frame, sign means right or left, up or down
//angle here
let yAngleMultiplier = 1

function fillRange(bottom, top) {
    const range = []
    for (let i = bottom; i < top; i++) {
        range[i] = i
    }
    return range
}

/**
 *
 * @param {GameBall} ball ball on screen
 * @param {Interval} gameLoop interval that dictates game play
 */
function playPong(ball, gameLoop) {
    const sidesOfBoard = ["left", "right"]
    paddles.forEach((paddle, i) => {
        const sideOfBoard = sidesOfBoard[i]
        if (!checkPaddelHit(ball, paddle, sideOfBoard)) return
        io.emit("bounce", `hit paddel ${sideOfBoard}!!`)

        //always switch x movement to go other direction
        ballXDirection = changeBallDirection(ballXDirection)

        //also switch y, but by varying amounts based on
        //where the ball hit on the paddle
        /**TODO: CHECK MORE THAN BALL.BOTTOM ON BRICK */
        const ballBottom = ball.y + ball.radius
        const paddleEdges = fillRange(paddle.y, paddle.y + paddle.edgeDistanceY).concat(
            fillRange(paddle.y + (paddle.height - paddle.edgeDistanceY), paddle.y + paddle.height)
        )
        const half = paddle.height / 2
        const otherHalf = paddle.middleDistanceY / 2
        const start = half - otherHalf
        const paddleMiddle = fillRange(paddle.y + start, paddle.y + (start + paddle.middleDistanceY))

        if (paddleEdges.includes(ballBottom)) {
            //hit red part of paddle
            io.emit("bounce", `hit edge!`)
            yAngleMultiplier = 4
        } else if (paddleMiddle.includes(ballBottom)) {
            //hit yellow part of paddle
            io.emit("bounce", `hit middle!`)
            yAngleMultiplier = 0
        } else {
            //hit blue part of paddle
            io.emit("bounce", `hit!`)
            yAngleMultiplier = 1
        }
    })

    const roundWinner = checkBallInEndzone(ball)
    if (roundWinner) {
        io.emit("gameOver", roundWinner)
        clearInterval(gameLoop)
        return true
    }

    if (checkBallHitTops(ball)) {
        io.emit("bounce", "hit up or down!")
        ballYDirection = changeBallDirection(ballYDirection)
    }

    //upadate position of the ball
    ball.x += ballXDirection * ballXMovement //increasing this would make ball move faster towards the paddles
    ball.y += ballYDirection * ballYMovement * yAngleMultiplier

    //send new ball position to both clients
    io.emit("ballMove", ball)

    return false
}

function startPong() {
    const ball = new GameBall()

    //emit to front end
    io.emit("startPong", ball)

    const gameInterval = setInterval(() => {
        const roundOver = playPong(ball, gameInterval)

        //here you can reset the interval
        //if play pong returns a flag
        if (!roundOver) return
        console.log("Round Over!")
        console.log(scores)
    }, refreshRate)
}

io.on("connection", (socket) => {
    /*a client filled out username input box and hit send */
    socket.on("newName", (username) => {
        const name = username
        console.log(name + " connected!")

        const playerNames = paddles.map((player) => player.name)

        if (!playerNames.includes(name)) {
            const newGamePiece = makeNewPiece(name)
            paddles.push(newGamePiece)
        }

        io.emit("players", paddles)

        if (paddles.length !== 2) return
        startPong()
    })

    /*a client is moving their mouse (theirfore paddle) */
    socket.on("userMove", (move) => {
        const playerToUpdate = paddles.filter((player) => move.name === player.name)[0]
        if (!playerToUpdate) return
        playerToUpdate.y = move.y
        io.emit("newMove", paddles)
    })

    socket.on("another", (arg) => {
        io.emit("hide-go-again", "")
        startPong()
    })

    /*client exits page */
    socket.on("leaving", (name) => {
        paddles = paddles.filter((player) => player.name !== name)
        console.log(name + " disconnected!")
        console.log(paddles)
        io.emit("players", paddles)
    })
})

// Reload frontend on save here
reload(app)
    .then(function (reloadReturned) {
        // Reload started, start web server
        http.listen(port, function () {
            console.log("Web server listening on port " + port)
        })
    })
    .catch(function (err) {
        console.error("Reload could not start, could not start server/sample app", err)
    })
