let larguraOriginalTabuleiro = 735; // A largura original do tabuleiro em pixels
let alturaOriginalTabuleiro = 735; // A altura original do tabuleiro em pixels

document.addEventListener('DOMContentLoaded', () => {
  const socket = io.connect(); // Conecta ao servidor Socket.IO
  const welcomeForm = document.getElementById('welcomeForm');
  const playerListDiv = document.getElementById('playerList');

  let usuarioLogado = false;
  let currentRoomGlobal = '';
  let currentPlayers = [];

  welcomeForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const playerName = document.getElementById('playerName').value;
    const playerColor = document.getElementById('playerColor').value;
    socket.emit('setPlayerInfo', { name: playerName, color: playerColor });
    // Indica que o usuário completou o login
    usuarioLogado = true;
    // Esconde o formulário após o envio
    welcomeForm.style.display = 'none';
    // Prepara para mostrar a lista de jogadores
    playerListDiv.style.display = 'block';
  });

  document.getElementById('moveRoomButton').addEventListener('click', () => {
    console.log('Mudar de Sala clicado');
    socket.emit('playerMoveRoom');
  });

  document.getElementById('makeHypothesisButton').addEventListener('click', () => {
    socket.emit('requestHypothesisData');
  });

  socket.on('updatePlayers', ({ players, leaderId }) => {
    if (usuarioLogado) { // Só atualiza se o usuário estiver logado
      updatePlayerList(players, leaderId);
      document.getElementById('welcomeForm').style.display = 'none';
      document.getElementById('playerList').style.display = 'block';
    }
  });

  socket.on('youAreLeader', function () {
    // document.getElementById('waitingMessage').style.display = 'none'; // Esconde a mensagem
    showStartGameButton();
  });

  socket.on('availableColors', (colors) => {
    const colorSelect = document.getElementById('playerColor');
    colorSelect.innerHTML = ''; // Limpa as opções existentes
    colors.forEach((color) => {
      const option = document.createElement('option');
      option.value = color;
      option.textContent = translateColor(color); // Função para traduzir a cor para francês
      colorSelect.appendChild(option);
    });
  });

  socket.on('gameStarted', ({ players }) => {
    // Esconde elementos de pré-jogo
    document.getElementById('overlay').style.display = 'none';

    // Mostra o tabuleiro de jogo e faz outros ajustes necessários para o início do jogo
    document.getElementById('gameBoard').style.display = 'block';

    // Prepara e exibe a div playersInGame
    const playersInGameDiv = document.getElementById('playersInGame');
    playersInGameDiv.style.display = 'block'; // Mostra a div

    const playersInGameContainer = document.getElementById('playersInGameContainer');
    playersInGameContainer.innerHTML = ''; // Limpa conteúdo anterior

    // Itera apenas uma vez sobre os jogadores para adicionar seus elementos à página
    players.forEach(player => {
      const playerElement = document.createElement('div');
      playerElement.classList.add('player-item'); // Adiciona classe para estilização

      const colorSquare = document.createElement('span');
      colorSquare.className = 'colorSquare';
      colorSquare.style = `display: inline-block; width: 25px; height: 25px; margin-right: 10px; vertical-align: middle; background-color: ${player.color};`;

      playerElement.appendChild(colorSquare);
      playerElement.appendChild(document.createTextNode(player.name));
      playersInGameContainer.appendChild(playerElement); // Adiciona ao container correto dentro de playersInGame

      placePawn(player);
    });
    const myData = players.find(p => p.id === socket.id);
    displayPlayerCards(myData.cards);
  });

  socket.on('gameAlreadyStarted', () => {
    document.getElementById('gameAlreadyStartedMessage').style.display = 'block';
  });

  socket.on('colorTaken', () => {
    alert('Cette couleur est déjà prise, veuillez en choisir une autre.');
    // Mostrar novamente o overlay de inscrição para o usuário escolher outra cor
    document.getElementById('overlay').style.display = 'block';
  });

  socket.on('playerTurn', (data) => {
    const playerTurnDiv = document.getElementById('playerTurn');
    gameActionsDiv = document.getElementById('gameActions');
    if (!playerTurnDiv) return;

    if (data.currentPlayerId === socket.id) {
      playerTurnDiv.textContent = "C'est votre tour";
      gameActionsDiv.style.display = 'block';
    } else {
      playerTurnDiv.textContent = `C'est le tour du joueur: ${data.currentPlayerName}`;
      gameActionsDiv.style.display = 'none';
    }

    playerTurnDiv.style.display = 'block'; // Ou 'inline', 'inline-block', etc., conforme necessário
  });

  socket.on('yourTurn', (data) => {
    const yourTurnDiv = document.getElementById('yourTurn');
    if (!yourTurnDiv) return;

    currentRoomGlobal = data.room;

    yourTurnDiv.textContent = `Vous êtes dans la salle: ${data.room}`;
    yourTurnDiv.style.display = 'block';
  });

  socket.on('resetGame', () => {
    console.log('O jogo foi reiniciado no servidor.');

    // Ocultar o tabuleiro do jogo e quaisquer mensagens/actions relacionadas ao estado ativo do jogo
    document.getElementById('gameBoard').style.display = 'none';
    document.getElementById('gameActions').style.display = 'none';
    document.getElementById('playersInGame').style.display = 'none';

    // Mostrar novamente o formulário de inscrição e redefinir o estado inicial do cliente
    welcomeForm.style.display = 'block';
    playerListDiv.style.display = 'none';
    document.getElementById('playerCardsContainer').innerHTML = ''; // Limpa os cartões do jogador
    usuarioLogado = false; // Reseta a flag de login do usuário

    // Pode ser necessário reiniciar mais estados aqui, dependendo da lógica específica do seu jogo
  });

  socket.on('chooseNewRoom', (data) => {
    document.getElementById('moveRoomButton').disabled = true;
    document.getElementById('makeHypothesisButton').disabled = true;

    const currentRoom = data.currentRoom;
    const availableRooms = data.availableRooms;

    const roomSelectionModal = document.createElement('div');
    roomSelectionModal.setAttribute('id', 'roomSelectionModal');

    roomSelectionModal.innerHTML = `
        <h2>Choisissez une salle</h2>
        <select id="roomSelection"></select>
        <button id="confirmRoomChange">Confirmer</button>
    `;

    document.body.appendChild(roomSelectionModal);

    const roomSelectElement = document.getElementById('roomSelection');

    availableRooms.forEach((roomName) => {
      const optionElement = document.createElement('option');
      optionElement.value = roomName;
      optionElement.textContent = roomName; // Aqui você pode querer usar um dicionário para traduzir, se necessário
      roomSelectElement.appendChild(optionElement);
    });

    document.getElementById('confirmRoomChange').addEventListener('click', () => {
      const selectedRoom = roomSelectElement.value;
      socket.emit('playerSelectedNewRoom', { newRoom: selectedRoom });
      document.body.removeChild(roomSelectionModal);
      document.getElementById('moveRoomButton').disabled = false;
      document.getElementById('makeHypothesisButton').disabled = false;
    });
  });

  socket.on('playerMoved', (data) => {
    if (data.playerId === socket.id) {
      currentRoomGlobal = data.newRoom; // Atualiza a sala atual
      const yourTurnDiv = document.getElementById('yourTurn');
      yourTurnDiv.textContent = `Vous êtes dans la salle: ${currentRoomGlobal}`;
      yourTurnDiv.style.display = 'block';
    }
    const player = {
      id: data.playerId,
      color: data.playerColor, // Garanta que o servidor envie essa informação
      room: {
        name: data.newRoom,
        coordinates: data.coordinates // Coordenadas da nova sala
      }
    };
    placePawn(player);
  });

  socket.on('hypothesisData', (data) => {
    const { suspects, weapons, currentRoom } = data;
    document.getElementById('moveRoomButton').disabled = true;
    document.getElementById('makeHypothesisButton').disabled = true;

    showHypothesisModal(suspects, weapons, currentRoom);
  });

  socket.on('gameWon', (data) => {
    const { winnerName, hypothesis } = data;
    displayGameWonMessage(winnerName, hypothesis);
  });

  socket.on('hypothesisRefuted', (data) => {
    const refutingPlayerName = data.refutingPlayerName;
    const hypothesisDetails = `Suspeito: ${data.hypothesis.suspect}, Arma: ${data.hypothesis.weapon}, Sala: ${data.hypothesis.room}`;
    showHypothesisRefutedModal(refutingPlayerName, hypothesisDetails);
  });

  socket.on('hypothesisIncorrect', (data) => {
    const { playerId, hypothesis } = data;

    const existingModal = document.getElementById('hypothesisIncorrectModal');
    if (existingModal) {
      document.body.removeChild(existingModal);
    }

    const modal = document.createElement('div');
    modal.setAttribute('id', 'hypothesisIncorrectModal');
    modal.classList.add('modal');

    // Define o conteúdo do modal
    modal.innerHTML = `
        <h2>Hypothèse incorrecte</h2>
        <p>La supposition était incorrecte.</p>
        <p>Suspect: ${hypothesis.suspect}</p>
        <p>Arme: ${hypothesis.weapon}</p>
        <p>Salle: ${hypothesis.room}</p>
        <button id="closeIncorrectHypothesisModal">Fermer</button>
    `;

    document.body.appendChild(modal);

    document.getElementById('closeIncorrectHypothesisModal').addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    document.getElementById('moveRoomButton').disabled = true;
    document.getElementById('makeHypothesisButton').disabled = true;

    document.getElementById('closeIncorrectHypothesisModal').addEventListener('click', () => {
      document.getElementById('moveRoomButton').disabled = false;
      document.getElementById('makeHypothesisButton').disabled = false;
    });
  });

  socket.on('turnChanged', (data) => {
    updateUIForNewTurn(data);
  });

  function updateUIForNewTurn(data) {
    const { currentPlayerId, currentPlayerName, currentRoom } = data;

    const playerTurnDiv = document.getElementById('playerTurn');
    const gameActionsDiv = document.getElementById('gameActions');
    const yourTurnDiv = document.getElementById('yourTurn');

    if (socket.id === currentPlayerId) {
      playerTurnDiv.textContent = "C'est votre tour";
      gameActionsDiv.style.display = 'block';
      yourTurnDiv.textContent = `Vous êtes dans la salle: ${currentRoom}`;
      yourTurnDiv.style.display = 'block';
    } else {
      playerTurnDiv.textContent = `C'est le tour de ${currentPlayerName}`;
      gameActionsDiv.style.display = 'none';
      yourTurnDiv.style.display = 'none';
    }
  }

  function updatePlayerList(players, leaderId) {
    currentPlayers = players;
    const playersContainer = document.getElementById('playersContainer');
    playersContainer.innerHTML = ''; // Limpa apenas a lista de jogadores, preservando a mensagem

    players.forEach(player => {
      const playerElement = document.createElement('div');
      const colorSquare = document.createElement('span');
      colorSquare.className = 'colorSquare';
      colorSquare.style.backgroundColor = player.color;

      playerElement.appendChild(colorSquare);

      const playerNameText = document.createTextNode(player.name);
      playerElement.appendChild(playerNameText);

      playersContainer.appendChild(playerElement);
    });

    // Ajusta a visibilidade da mensagem com base no líder
    document.getElementById('waitingMessage').style.display = socket.id !== leaderId ? 'block' : 'none';
  }

  function showStartGameButton() {
    let startGameButton = document.getElementById('startGameButton');
    if (!startGameButton) {
      startGameButton = document.createElement('button');
      startGameButton.id = 'startGameButton';
      startGameButton.textContent = 'Commencer le jeu';
      startGameButton.onclick = function () {
        socket.emit('startGame');
      };
      document.getElementById('overlay').appendChild(startGameButton);
    }
  }

  function placePawn(player) {
    // Procura por um peão existente para este jogador
    let pawnElement = document.querySelector(`.pawn[data-player-id="${player.id}"]`);

    if (!pawnElement) {
      // Se não encontrar um peão existente, cria um novo
      pawnElement = document.createElement('img');
      pawnElement.src = `images/peao_${player.color}.png`;
      pawnElement.className = 'pawn';
      pawnElement.setAttribute('data-player-id', player.id);
      // Adiciona o peão recém-criado ao tabuleiro de jogo
      document.getElementById('gameBoard').appendChild(pawnElement);
    }

    // Independente de ser novo ou existente, atualiza a posição do peão
    const screenCoordinates = convertToScreenCoordinates(player.room.coordinates);
    pawnElement.style.position = 'absolute';
    pawnElement.style.left = `${screenCoordinates.x}px`;
    pawnElement.style.top = `${screenCoordinates.y}px`;
  }

  // Uma função simples de tradução poderia ser algo como:
  function translateColor(color) {
    const translations = {
      "Black": "Noir",
      "Blue": "Bleu",
      "Green": "Vert",
      "Red": "Rouge",
      "White": "Blanc",
      "Yellow": "Jaune"
    };
    return translations[color] || color;
  }

  function showHypothesisModal(suspects, weapons, currentRoom) {
    const existingModal = document.getElementById('hypothesisModal');
    if (existingModal) {
      document.body.removeChild(existingModal);
    }

    const hypothesisModal = document.createElement('div');
    hypothesisModal.setAttribute('id', 'hypothesisModal');
    hypothesisModal.classList.add('modal');

    hypothesisModal.innerHTML = `
      <h2>Faire une hypothèse</h2>
      <label for="suspectSelection">Choisissez un suspect:</label>
      <select id="suspectSelection"></select>
      <label for="weaponSelection">Choisissez une arme:</label>
      <select id="weaponSelection"></select>
      <label>Salle actuelle:</label>
      <p id="currentRoomName" class="room-display">${currentRoom}</p>
      <button id="confirmHypothesis">Confirmer l'hypothèse</button>
      <button id="cancelHypothesis">Annuler</button>
    `;

    document.body.appendChild(hypothesisModal);

    // Preenche os seletores com as opções de armas
    const weaponSelection = document.getElementById('weaponSelection');
    weapons.forEach(weapon => {
      let option = document.createElement('option');
      option.value = weapon;
      option.textContent = weapon;
      weaponSelection.appendChild(option);
    });

    const suspectSelection = document.getElementById('suspectSelection');
    suspects.forEach(suspect => {
      let option = document.createElement('option');
      option.value = suspect;
      option.textContent = suspect;
      suspectSelection.appendChild(option);
    });

    // Adiciona evento ao botão de confirmar hipótese
    document.getElementById('confirmHypothesis').addEventListener('click', () => {
      document.getElementById('moveRoomButton').disabled = false;
      document.getElementById('makeHypothesisButton').disabled = false;
      const selectedSuspect = suspectSelection.value;
      const selectedWeapon = weaponSelection.value;
      const room = currentRoom;
      socket.emit('confirmHypothesis', { suspect: selectedSuspect, weapon: selectedWeapon, room: room });
      document.body.removeChild(hypothesisModal);
    });

    // Adiciona evento ao botão de cancelar
    document.getElementById('cancelHypothesis').addEventListener('click', () => {
      document.getElementById('moveRoomButton').disabled = false;
      document.getElementById('makeHypothesisButton').disabled = false;
      document.body.removeChild(hypothesisModal);
    });
  }

  function displayGameWonMessage(winnerName, hypothesis) {
    const { suspect, weapon, room } = hypothesis;

    const victoryModal = document.createElement('div');
    victoryModal.setAttribute('id', 'victoryModal');
    victoryModal.classList.add('modal');

    victoryModal.innerHTML = `
        <h2>Victoire !</h2>
        <p>${winnerName} a gagné le jeu !</p>
        <p>Avec l'hypothèse : ${suspect} avec le/la ${weapon} dans le/la ${room}.</p>
        <button id="closeVictoryModal">Fermer</button>
    `;

    document.body.appendChild(victoryModal);

    document.getElementById('closeVictoryModal').addEventListener('click', () => {
      document.body.removeChild(victoryModal);
      document.getElementById('overlay').style.display = 'block'; // Mostra o formulário de inscrição
      document.getElementById('gameBoard').style.display = 'none'; // Esconde o tabuleiro de jogo
      document.getElementById('playersInGame').style.display = 'none'; // Esconde a lista de jogadores no jogo
      document.getElementById('gameActions').style.display = 'none'; // Esconde as ações do jogo

    });
  }

  function showHypothesisRefutedModal(refutingPlayer) {
    const existingModal = document.getElementById('hypothesisRefutedModal');
    if (existingModal) {
      document.body.removeChild(existingModal);
    }

    const hypothesisRefutedModal = document.createElement('div');
    hypothesisRefutedModal.setAttribute('id', 'hypothesisRefutedModal');
    hypothesisRefutedModal.classList.add('modal');

    hypothesisRefutedModal.innerHTML = `
      <h2>Hypothèse réfutée</h2>
      <p>La hypothèse était incorrecte. Le joueur ${refutingPlayer} possède une des cartes choisies.</p>
      <button id="closeHypothesisRefutedModal">Fermer</button>
    `;

    document.body.appendChild(hypothesisRefutedModal);

    document.getElementById('closeHypothesisRefutedModal').addEventListener('click', () => {
      document.body.removeChild(hypothesisRefutedModal);
    });
  }

});

function convertToScreenCoordinates(roomCoordinates) {
  const gameBoardElement = document.getElementById('gameBoard');
  const rect = gameBoardElement.getBoundingClientRect();

  // O deslocamento do tabuleiro na tela, assumindo que o tabuleiro esteja centralizado horizontalmente.
  const offsetX = (window.innerWidth - larguraOriginalTabuleiro) / 2;
  const offsetY = (window.innerHeight - larguraOriginalTabuleiro) / 2; // Se também houver deslocamento vertical

  const screenCoordinates = {
    x: (roomCoordinates.x) + offsetX,
    y: (roomCoordinates.y) + offsetY
  };

  console.log(`Coordenadas convertidas: x=${screenCoordinates.x}, y=${screenCoordinates.y}`);

  return screenCoordinates;
}

function displayPlayerCards(cards) {
  // Verificar se 'cards' é undefined ou null
  if (!cards) {
    console.error('Nenhum dado de cartas recebido');
    return;
  }

  const container = document.getElementById('playerCardsContainer');
  container.innerHTML = ''; // Limpa o container antes de adicionar novos elementos

  const title = document.createElement('h3');
  title.textContent = 'VOS CARTES';
  title.classList.add('player-cards-title');
  container.appendChild(title);
  container.style.display = 'block';

  Object.entries(cards).forEach(([type, card]) => {
    const cardElement = document.createElement('div');
    cardElement.classList.add('player-card');
    cardElement.innerHTML = `<strong>${type.charAt(0).toUpperCase() + type.slice(1)}:</strong> ${card}`;
    container.appendChild(cardElement);
  });
}