// src/Game.js

class Game {
  constructor() {
    this.suspects = [
      "Colonel Moutarde",
      "Mademoiselle Écarlate",
      "Professeur Violet",
      "Monsieur Vert",
      "Madame Pervenche",
      "Mademoiselle Rose"
    ];
    this.weapons = [
      "Chandelier",
      "Poignard",
      "Revolver",
      "Corde",
      "Clé Anglaise",
      "Tuyau de Plomb"
    ];
    this.rooms = [
      "Hall",
      "Salon",
      "Bibliothèque",
      "Salle de Billard",
      "Salle à Manger",
      "Cuisine",
      "Conservatoire",
      "Salle de Bal",
      "Bureau"
    ];
    this.crime = {
      room: '',
      suspect: '',
      weapon: ''
    };
    this.players = [];
    this.turn = 0; // Index do jogador atual
  }

  addPlayer(player) {
    this.players.push(player);
  }

  startGame() {
    this.shufflePlayers();
    this.distributeCards();
    this.drawCrime();
    this.assignRandomRooms(); // Método novo para atribuir salas
    this.turn = 0; // Inicia com o primeiro jogador
  }

  shufflePlayers() {
    for (let i = this.players.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.players[i], this.players[j]] = [this.players[j], this.players[i]];
    }
  }

  distributeCards() {
    // Embaralha os arrays
    const shuffleArray = array => array.sort(() => Math.random() - 0.5);

    // Embaralha e distribui as cartas
    const suspects = shuffleArray([...this.suspects]);
    const weapons = shuffleArray([...this.weapons]);
    const rooms = shuffleArray([...this.rooms]);

    this.players.forEach(player => {
      player.cards = {
        suspect: suspects.pop(),
        weapon: weapons.pop(),
        room: rooms.pop()
      };
    });
  }

  assignRandomRooms() {
    const roomNames = Object.keys(this.roomCoordinates);
    this.players.forEach(player => {
      const randomRoom = roomNames[Math.floor(Math.random() * roomNames.length)];
      player.room = {
        name: randomRoom,
        coordinates: this.roomCoordinates[randomRoom]
      };
    });
  }

  // Novo método para obter o estado atualizado dos jogadores
  getCurrentGameState() {
    return this.players.map(player => ({
      name: player.name,
      color: player.color,
      id: player.id,
      cards: player.cards,
      room: player.room
    }));
  }

  drawCrime() {
    const drawFromArray = (array) => array[Math.floor(Math.random() * array.length)];

    this.crime.room = drawFromArray(this.rooms);
    this.crime.suspect = drawFromArray(this.suspects);
    this.crime.weapon = drawFromArray(this.weapons);

    console.log("Crime sorteado:");
    console.log("Local: " + this.crime.room);
    console.log("Suspeito: " + this.crime.suspect);
    console.log("Arma: " + this.crime.weapon);
  }

  getCrime() {
    return this.crime;
  }
  
  roomCoordinates = {
    'Conservatoire': { x: 735 / 3 * 0.5, y: 735 / 3 * 0.5 },
    'Salle de Bal': { x: 735 / 3 * 1.5, y: 735 / 3 * 0.5 },
    'Cuisine': { x: 735 / 3 * 2.5, y: 735 / 3 * 0.5 },
    'Salle à Manger': { x: 735 / 3 * 2.5, y: 735 / 3 * 1.5 },
    'Salle de Billard': { x: 735 / 3 * 0.5, y: 735 / 3 * 1 },
    'Bibliothèque': { x: 735 / 3 * 0.5, y: 735 / 3 * 2 },
    'Bureau': { x: 735 / 3 * 0.5, y: 735 / 3 * 2.5 },
    'Hall': { x: 735 / 3 * 1.5, y: 735 / 3 * 2.5 },
    'Salon': { x: 735 / 3 * 2.5, y: 735 / 3 * 2.5 }
  };

  advanceTurn() {
    this.turn = (this.turn + 1) % this.players.length;
}

  resetGame() {
    this.players = [];
    this.turn = 0;
  }
  
}

module.exports = Game;