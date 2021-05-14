/*GLOBAL VARIABLES*/
const canvas = document.getElementById("board")
const ctx = canvas.getContext("2d")
const socket = io()
let players = []
let gameBall = null
let username = ""

/**
 TODO: 
 */

/*FUNCTIONS */

//so far isn't being called I don't think
function sendDisconnectToServer(e) {
    socket.emit("leaving", username)
}

function sendMoveToServer(e) {
    function translatedY(y) {
        var rect = canvas.getBoundingClientRect()
        var factor = canvas.width / rect.width
        return factor * (y - rect.top)
    }
    const move = {
        name: username,
        y: translatedY(e.clientY),
    }
    socket.emit("userMove", move)
}

//happens every {refreshRate} millisenconds
function updateGameArea() {
    clearBoard()
    players.forEach((player) => {
        updatePlayerBrick(player)
    })
    updateGameBall()
}

//all this stuff in here is for the colors on the brick for testing, take out later
function updatePlayerBrick(player) {
    ctx.fillStyle = player.mainColor
    ctx.fillRect(player.x, player.y, player.width, player.height)
    ctx.fillStyle = player.edgeColor
    ctx.fillRect(player.x, player.y, player.width, player.edgeDistanceY)
    const startR = player.height - player.edgeDistanceY
    ctx.fillRect(player.x, player.y + startR, player.width, player.edgeDistanceY)
    ctx.fillStyle = player.middleColor
    const half = player.height / 2
    const otherHalf = player.middleDistanceY / 2
    const start = half - otherHalf
    ctx.fillRect(player.x, player.y + start, player.width, player.middleDistanceY)
}

//moves the ball, called once every {refreshRate} milliseconds
function updateGameBall() {
    ctx.fillStyle = "red"
    ctx.beginPath()
    ctx.arc(gameBall.x, gameBall.y, gameBall.radius, gameBall.startAngle, gameBall.endAngle)
    ctx.fill()
}

//called once every {refreshRate} milliseconds
function clearBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
}

//called when starting a new round
function startBoard() {
    /**fo real */
    // username = $("#enter-username").val()

    /**for testing */
    username = Math.floor(Math.random() * 1000) + 1
    console.log(username)
    $(".username").text(username)

    //
    $("#username-row").hide()
    $("#welcome-row").hide()
    $("#send-btn").prop("disabled", false)

    socket.emit("newName", username)

    /*BOARD EVENT LISTENERS */
    document.addEventListener("mousemove", sendMoveToServer)

    /* TODO: figure out what to do here */
    document.addEventListener("unload", sendDisconnectToServer)

    //game loop
    setInterval(updateGameArea, 20)
}

/*SOCKET LISTENERS */

//you connected
socket.on("connect", () => {
    console.log(socket.id)
})

//a player (maybe you) got added, here is new
//roster of players
socket.on("players", (newPlayers) => {
    players = newPlayers
})

//move coming in (could be yours) so update
//players location
socket.on("newMove", (mutatedPlayers) => {
    players = mutatedPlayers
})

socket.on("startPong", (startBall) => {
    gameBall = startBall
    updateGameBall()
})

socket.on("ballMove", (newBall) => {
    // console.log('receiving...');
    gameBall = newBall
    $("#go-again").hide()
})

socket.on("bounce", (arg) => {
    console.log(arg)
})

socket.on("hide-go-again", (arg) => {
    $("#go-again").hide()
})

socket.on("gameOver", (winner) => {
    console.log(winner)
    canvas.style.cursor = "default"
    // const againBtn = $('')
    // $("body").prepend(againBtn)
    $("#go-again").prop("hidden", false)
    $("#go-again").show()
})

socket.on("scores", (scores) => {
    // console.log(scores)
    $(".left").text(scores.left)
    $(".right").text(scores.right)
})

$(document).on("click", "#go-again", () => {
    console.log("START NEXT ROUND!")
    canvas.style.cursor = "none"
    socket.emit("another", "")
})
// //msg room
// socket.on('data', (arg) => {
//   $('#chat-room').al($('#chat-room').val() + arg + '\n')
//   $("#chat-room").scrollTop = $("#chat-room").scrollHeight
// })

window.onload = function () {
    /*ENTRY POINT */
    // $('#send-btn').prop('disabled', true)
    $("#go-again").prop("hidden", true)

    /*EVENT LISTENERS */
    // $("#username-submit").click(startBoard)
    startBoard()
}
