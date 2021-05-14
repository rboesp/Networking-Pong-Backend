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
function sendDisconnectToServer(e) {
    socket.emit("leaving", username)
}

function sendMoveToServer(e) {
    const move = {
        name: username,
        y: e.pageY,
    }
    socket.emit("userMove", move)
}

function updateGameArea() {
    clearBoard()
    players.forEach((player) => {
        updatePlayerBrick(player)
    })
    updateGameBall()
}

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

function updateGameBall() {
    ctx.fillStyle = "red"
    ctx.beginPath()
    ctx.arc(gameBall.x, gameBall.y, gameBall.radius, gameBall.startAngle, gameBall.endAngle)
    ctx.fill()
}

function clearBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
}

function startBoard() {
    username = $("#enter-username").val()
    // username = Math.floor(Math.random()*10)+1
    $("#username-row").hide()
    $("#welcome-row").hide()
    $("#send-btn").prop("disabled", false)

    socket.emit("newName", username)

    /*EVENT LISTENERS */
    document.addEventListener("mousemove", sendMoveToServer)
    document.addEventListener("unload", sendDisconnectToServer)
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
})

socket.on("bounce", (arg) => {
    console.log(arg)
})

socket.on("hide-go-again", (arg) => {
    $("#go-again").prop("hidden", true)
})

socket.on("gameOver", (winner) => {
    console.log(winner)
    canvas.style.cursor = "default"
    // const againBtn = $('')
    // $("body").prepend(againBtn)
    $("#go-again").prop("hidden", false)
})

$(document).on("click", "#go-again", () => {
    console.log("START NEXT ROUND!")
    canvas.style.cursor = "none"
    socket.emit("another", "")
})
// //msg room
// socket.on('data', (arg) => {
//   $('#chat-room').val($('#chat-room').val() + arg + '\n')
//   $("#chat-room").scrollTop = $("#chat-room").scrollHeight
// })

window.onload = function () {
    /*ENTRY POINT */
    // $('#send-btn').prop('disabled', true)
    $("#go-again").prop("hidden", true)

    /*EVENT LISTENERS */
    $("#username-submit").click(startBoard)
    // startBoard()
}
