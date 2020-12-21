const express = require('express');
const app = express()
const http = require('http').createServer(app)
const io = require('socket.io')(http)

const port = process.env.PORT || 3000

app.use(express.static('public'))

let players = []

/**
 TODO: disconnect on reload
 */

class component {
    constructor (width, height, color, name, x, y) {
      this.width = width;
      this.height = height;
      this.x = x;
      this.y = y;  
      this.color = color;  
      this.name = name
  }
}

io.on('connection', socket => { 

    socket.on('newName', username => {
        const name = username
        console.log(name + ' connected!')
    
        const playerNames = players.map(player => {
            return player.name
        })
    
        if(!playerNames.includes(name)) {
            const newGamePiece = new component(75, 75, "blue", name, 10, 220);
            players.push(newGamePiece)
        }
    
        io.emit('players', players)
    })

    socket.on('userMove', move => {
        // console.log(`${move.name} updating!`)
        // console.log(players);
        const playerToUpdate = players.filter(player => {
            return move.name === player.name
        })
        if(!playerToUpdate.length) return
        playerToUpdate[0].x = move.x
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


http.listen(port, () => {
  console.log(`listening on port ${port}`)
});