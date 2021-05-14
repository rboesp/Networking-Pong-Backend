const express = require("express")
const app = express()
const http = require("http").createServer(app)
const io = require("socket.io")(http)
const reload = require("reload")

/**PORT */
const port = process.env.PORT || 3000

/*MIDDLEWARE */
app.use(express.static("public"))

/**
 *
 * GLOBAL VARIABLES
 *
 * */
let paddles = []
let scores = {
    left: 0,
    right: 0,
}

class GamePaddel {
    constructor(name, id, x, y) {
        this.width = 4
        this.height = 80
        this.mainColor = "blue"
        this.edgeColor = "red"
        this.middleColor = "yellow"
        this.edgeDistanceY = 10
        this.middleDistanceY = 20
        this.name = name
        this.id = id
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

//position of players to start
const player1Start = 5
const player2Start = 475

//position of paddle to start
const paddleStartY = 220

//size of board in px
const boardWidth = 480
const boardHeight = 270

//default direction the ball goes at start
let ballXDirection = -1 //left
let ballYDirection = -1 //up

/*below change game speed */

//changes speed of game
const refreshRate = 10

//amount they are moving per frame,
//sign controls direction, right left, up down (x,y)
let ballYMovement = 1
let ballXMovement = 3

/* TODO: figure out what this does */
//pretty sure it controls the y bounce
//of the ball after a paddel hit
let yAngleMultiplier = 1

/**
 *
 * FUNCTIONS
 *
 * */

//makes something used on the canvas in the game
function makeNewPiece(name, id) {
    const paddleStartX = !paddles.length ? player1Start : player2Start
    console.log(paddleStartX)
    const newPlayer = new GamePaddel(name, id, paddleStartX, paddleStartY)
    return newPlayer
}

function checkBallInEndzone(ball) {
    const rightEnd = boardWidth
    const leftEnd = 0

    if (ball.x <= leftEnd) {
        //emit here
        scores.right += 1
        io.emit("scores", scores)
        return "Winner: Right!"
    }
    if (ball.x >= rightEnd) {
        scores.left += 1
        io.emit("scores", scores)
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
function checkPaddelHit(ball, paddle, paddleSide) {
    let ballTop = ball.y
    let ballBottom = ball.y + ball.radius
    let ballLeft = ball.x
    let ballRight = ball.x + ball.radius
    let brickLeft = paddle.x
    let brickRight = paddle.x + paddle.width
    let brickTop = paddle.y
    let brickBottom = paddle.y + paddle.height
    let crash = false

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
 */
function playPong(ball) {
    const sidesOfBoard = ["left", "right"]

    /**todo: change this long function */
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

    //for loop over, checked both paddles

    //check if round over
    /* TODO: make this a named function */
    const ballInEndZone = checkBallInEndzone(ball)
    if (ballInEndZone) return true //round over

    /**if here, game is going, no round winner yet */
    if (checkBallHitTops(ball)) {
        io.emit("bounce", "hit up or down!")
        ballYDirection = changeBallDirection(ballYDirection)
    }

    //upadate position of the ball
    ball.x += ballXDirection * ballXMovement //increasing this would make ball move faster towards the paddles
    ball.y += ballYDirection * ballYMovement * yAngleMultiplier

    //send new ball position to both clients
    io.emit("ballMove", ball)

    return false //false means round not over yet
}

//starts game
function startPong() {
    const ball = new GameBall()

    //emit to front end that game is starting
    io.emit("startPong", ball)

    /* TODO: make this a named function */
    /**GAME LOOP */
    const gameLoop = setInterval(() => {
        //is round going?
        const roundOver = playPong(ball)
        if (!roundOver) return

        /**IF HERE, ROUND OVER */

        /* TODO: INCREASE SCORE here */

        //tell others game over
        io.emit("gameOver", roundOver)

        //stops ball from moving
        clearInterval(gameLoop)
        console.log("Round Over!")

        //show scores here
        console.log(scores)
    }, refreshRate)
}

/**
 *
 * io event listners
 * todo put these in another file
 */
io.on("connection", (socket) => {
    /*a client filled out username input box and hit send */
    socket.on("newName", (username) => {
        const name = username
        console.log(name + " connected!")

        const playerNames = paddles.map((player) => player.name)

        if (!playerNames.includes(name)) {
            const newGamePiece = makeNewPiece(name, socket.id)
            paddles.push(newGamePiece)
        }

        io.emit("players", paddles)

        if (paddles.length !== 2) return
        startPong()
    })

    /*a client is moving their mouse (theirfore paddle) */
    socket.on("userMove", (move) => {
        const playerToUpdate = paddles.filter((player) => socket.id === player.id)[0]
        if (!playerToUpdate) return
        playerToUpdate.y = move.y
        io.emit("newMove", paddles)
    })

    socket.on("another", (arg) => {
        io.emit("hide-go-again", "")
        startPong() //can this be play pong?
    })

    /*client exits page */
    socket.on("leaving", (name) => {
        paddles = paddles.filter((player) => socket.id !== player.id)
        console.log(name + " disconnected!")
        console.log(paddles)
        scores = {
            left: 0,
            right: 0,
        }
        io.emit("players", paddles)
        io.emit("scores", scores)
    })

    /*client exits page */
    socket.on("disconnect", () => {
        console.log(socket.id)
        paddles = paddles.filter((player) => socket.id !== player.id)
        console.log(paddles)
        scores = {
            left: 0,
            right: 0,
        }
        io.emit("players", paddles)
        io.emit("scores", scores)
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
