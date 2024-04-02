const socket = io();

function envoyerMessage() {
    const message = document.getElementById('inputMessage').value;
    socket.emit('messageDuClient', message);
}

socket.on('messageDuServeur', (message) => {
    alert(message);
});
