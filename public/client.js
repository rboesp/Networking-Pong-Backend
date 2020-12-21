/*GLOBAL VARIABLES*/
const canvas = document.getElementById('board')
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
  socket.emit('leaving', username)
}

function sendMoveToServer(e) {
  const move = {
    name: username,
    // x : e.pageX,
    y : e.pageY
  }
  socket.emit('userMove', move)
}

function updateGameArea() {
    clearBoard();
    players.forEach(player => {
      updatePlayerBrick(player);
    })      
    updateGameBall()
}

function updatePlayerBrick(player) {
  ctx.fillStyle = player.color
  ctx.fillRect(player.x, player.y, player.width, player.height)
  
}

function updateGameBall() {
  ctx.fillStyle = 'red'
  ctx.beginPath()
  ctx.arc(gameBall.x, gameBall.y, gameBall.radius, gameBall.startAngle, gameBall.endAngle)
  ctx.fill()
}

function clearBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
}

function startBoard() {
  username = $('#enter-username').val()
  $('#username-row').hide()
  $('#welcome-row').hide()
  $("#send-btn").prop('disabled', false)

  socket.emit('newName', username)

  /*EVENT LISTENERS */
  document.addEventListener('mousemove', sendMoveToServer)
  document.addEventListener('unload', sendDisconnectToServer) 
  setInterval(updateGameArea, 20)
}

/*SOCKET LISTENERS */

//you connected
socket.on('connect', () => {
  console.log(socket.id)
})

//a player (maybe you) got added, here is new
//roster of players
socket.on('players', newPlayers => {
  players = newPlayers
})

//move coming in (could be yours) so update
//players location
socket.on('newMove', mutatedPlayers => {
  players = mutatedPlayers
})

socket.on('startPong', startBall => {
  gameBall = startBall
  updateGameBall()
})

socket.on('ballMove', newBall => {
  // console.log('receiving...');
  gameBall = newBall
})

socket.on('endzone', arg => {
  console.log(arg);
})

socket.on('gameOver', winner => {
  console.log(winner);
})

// //msg room
// socket.on('data', (arg) => {
//   $('#chat-room').val($('#chat-room').val() + arg + '\n')
//   $("#chat-room").scrollTop = $("#chat-room").scrollHeight 
// })


window.onload = function() {

  /*ENTRY POINT */
  $('#send-btn').prop('disabled', true)

  /*EVENT LISTENERS */
  $('#username-submit').click(startBoard)

}