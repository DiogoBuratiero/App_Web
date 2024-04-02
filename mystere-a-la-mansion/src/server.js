const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const Game = require('./Game.js'); // Caminho para o seu arquivo Game.js

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const availableColors = ["Black", "Blue", "Green", "Red", "White", "Yellow"];

// Servir arquivos estáticos da pasta 'public'
app.use(express.static('public'));

// Rota para a página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const gameState = {
  players: [],
  gameActive: false,
  leaderId: null
};

const game = new Game();

Game.prototype.getHypothesisData = function () {
  return {
    suspects: this.suspects,
    weapons: this.weapons
  };
};

io.on('connection', (socket) => {
  console.log(`A player connected: ${socket.id}`);

  socket.emit('availableColors', availableColors);

  socket.on('resetGameRequest', () => {
    game.resetGame();
    gameState.players = [];
    gameState.gameActive = false;
    gameState.leaderId = null;

    io.emit('resetGame');
  });

  socket.on('setPlayerInfo', (playerInfo) => {
    if (gameState.gameActive) {
      // Se o jogo já começou, envia uma mensagem para o socket específico
      socket.emit('gameAlreadyStarted');
    } else {
      const colorIndex = availableColors.indexOf(playerInfo.color);
      if (colorIndex !== -1) {
        // Remove a cor escolhida da lista de disponíveis
        availableColors.splice(colorIndex, 1);
        if (gameState.players.some(p => p.color === playerInfo.color)) {
          socket.emit('colorTaken');
        } else {
          const existingPlayerIndex = gameState.players.findIndex(p => p.id === socket.id);
          if (existingPlayerIndex !== -1) {
            gameState.players[existingPlayerIndex] = { ...gameState.players[existingPlayerIndex], ...playerInfo, cards: [] };
          } else {
            const newPlayer = { id: socket.id, ...playerInfo, cards: [] };
            gameState.players.push(newPlayer);

            // Adiciona o jogador à instância de Game
            game.addPlayer(newPlayer);
            // Se for o primeiro jogador, designa como líder
            if (gameState.players.length === 1) {
              gameState.leaderId = socket.id;
              // Notifica o líder
              io.to(socket.id).emit('youAreLeader');
            }
          }
          // Notifica todos os jogadores sobre a lista atualizada de jogadores e o líder atual
          io.emit('updatePlayers', { players: gameState.players, leaderId: gameState.leaderId });
        }
      } else {
        // A cor já foi tomada, manipule esse caso como achar necessário
        socket.emit('colorTaken');
      }
    }
  });

  socket.on('startGame', () => {
    if (socket.id === gameState.leaderId && !gameState.gameActive) {
      gameState.gameActive = true;
      game.startGame(); // Inicia o jogo e embaralha os jogadores

      // Obtém o estado atualizado dos jogadores de Game.js
      const updatedPlayers = game.getCurrentGameState();

      // Atualiza o gameState.players com as informações atualizadas
      gameState.players = updatedPlayers;

      // Notifica todos os jogadores que o jogo começou
      io.emit('gameStarted', { players: gameState.players });

      // Informa de quem é a vez (considerando game.turn atualizado)
      const currentPlayer = game.players[game.turn];
      io.emit('playerTurn', { currentPlayerId: currentPlayer.id, currentPlayerName: currentPlayer.name });

      // Envia o nome da sala para o jogador da vez
      io.to(currentPlayer.id).emit('yourTurn', { room: currentPlayer.room.name });
    }
  });


  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);

    // Encontra o jogador que está se desconectando
    const playerIndex = gameState.players.findIndex(p => p.id === socket.id);
    if (playerIndex !== -1) {
      // Adiciona a cor de volta à lista de disponíveis se o jogo não estiver ativo
      if (!gameState.gameActive) {
        availableColors.push(gameState.players[playerIndex].color);
      }

      // Remova o jogador do estado do jogo
      gameState.players.splice(playerIndex, 1);

      // Emite a lista atualizada de cores disponíveis para todos os jogadores
      io.emit('availableColors', availableColors);
    }

    // Se o líder se desconecta e ainda há jogadores, designa um novo líder
    if (socket.id === gameState.leaderId && gameState.players.length > 0) {
      gameState.leaderId = gameState.players[0].id;
      io.to(gameState.leaderId).emit('youAreLeader');
    } else if (gameState.players.length === 0) { // Se não houver mais jogadores, reinicia o jogo
      console.log('Não há mais jogadores no jogo, reiniciando...');
      gameState.gameActive = false;
      gameState.leaderId = null;
      availableColors.length = 0;
      ["Black", "Blue", "Green", "Red", "White", "Yellow"].forEach(color => {
        availableColors.push(color); game.resetGame();
      });
      io.emit('resetGame');
    }

    // Atualiza todos os jogadores sobre a lista atualizada de jogadores e o líder atual
    io.emit('updatePlayers', { players: gameState.players, leaderId: gameState.leaderId });
  });

  socket.on('playerMoveRoom', () => {
    const player = gameState.players.find(p => p.id === socket.id);
    if (player) {
      socket.emit('chooseNewRoom', {
        currentRoom: player.room.name,
        availableRooms: game.rooms.filter(room => room !== player.room.name) // Exclui a sala atual da lista
      });
    }
  });

  // Este evento é acionado depois que o jogador seleciona a nova sala no modal
  socket.on('playerSelectedNewRoom', (data) => {
    const player = gameState.players.find(p => p.id === socket.id);
    if (player && data.newRoom && game.rooms.includes(data.newRoom) && data.newRoom !== player.room.name) {
      // Atualiza a sala do jogador no objeto do jogo
      player.room.name = data.newRoom;
      player.room.coordinates = game.roomCoordinates[data.newRoom];

      // Notifica todos os clientes para atualizarem a posição do jogador
      io.emit('playerMoved', {
        playerId: socket.id,
        newRoom: data.newRoom,
        coordinates: player.room.coordinates,
        playerColor: player.color
      });
      // Avança para o próximo turno, se aplicável
      game.advanceTurn();
      const currentPlayer = game.players[game.turn];
      io.emit('turnChanged', { currentPlayerId: currentPlayer.id, currentPlayerName: currentPlayer.name, currentRoom: currentPlayer.room.name });
    }
  });

  socket.on('requestHypothesisData', () => {
    // Encontrar o jogador que fez a solicitação
    const player = gameState.players.find(p => p.id === socket.id);

    // Supondo que o método getHypothesisData já exista e retorne os suspeitos e as armas
    const hypothesisData = game.getHypothesisData();

    if (player && player.room) {
      // Enviar os dados necessários para a hipótese, incluindo a sala atual do jogador
      socket.emit('hypothesisData', {
        ...hypothesisData,
        currentRoom: player.room.name
      });
    } else {
      // Tratar o caso em que a sala atual do jogador não está disponível
      console.error("Sala atual do jogador não encontrada.");
    }
  });

  socket.on('confirmHypothesis', (data) => {
    const { suspect, weapon, room } = data;
    const crime = game.getCrime();
    const hasCorrectHypothesis = suspect === crime.suspect && weapon === crime.weapon && room === crime.room;

    if (hasCorrectHypothesis) {
      const winnerName = game.players.find(p => p.id === socket.id).name; // Obtém o nome do vencedor
      io.emit('gameWon', { winnerName: winnerName, hypothesis: data });
    } else {
      // Verifica se algum jogador possui uma das cartas da hipótese
      const playerWithCard = game.players.find(player =>
        player.cards.suspect === suspect ||
        player.cards.weapon === weapon ||
        player.cards.room === room
      );

      if (playerWithCard) {
        // Informa que um jogador possui uma das cartas
        io.emit('hypothesisRefuted', { refutingPlayerName: playerWithCard.name, refutingPlayerId: playerWithCard.id, hypothesis: data });
      } else {
        // Ninguém possui as cartas, e a hipótese é incorreta
        io.emit('hypothesisIncorrect', { playerId: socket.id, hypothesis: data });
      }
    }

    // Avança para o próximo turno, se aplicável
    game.advanceTurn();
    const currentPlayer = game.players[game.turn];
    io.emit('turnChanged', { currentPlayerId: currentPlayer.id, currentPlayerName: currentPlayer.name, currentRoom: currentPlayer.room.name });
  });

});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
